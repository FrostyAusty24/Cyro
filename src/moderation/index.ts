import { botText, botError, BotMessageError } from '../i18n/index.js';
import { supportText, supportName, applicationQuestion, supportAction } from './localization.js';
import type { AccessService } from '../control/access.js';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import {
  ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, Events,
  MessageFlags, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder,
  type Client, type Guild, type GuildMember, type Interaction, type Message, type PartialMessage,
  type ChatInputCommandInteraction, type ButtonInteraction, type StringSelectMenuInteraction, type ModalSubmitInteraction, type TextChannel,
} from 'discord.js';
import type { Logger } from '../logger.js';
import { mergeConfig, ticketTypes, applicationForms, isSnowflake, type ModerationConfig } from './core.js';
import { panelPayload, selectedPanelOption } from './panels.js';
import { assertCanModerate, assertSafeRole, isStaff, ticketPermissionOverwrites } from './permissions.js';
import { ModerationStore, ModerationPersistenceError, type ModCase, type Ticket, type Application, type SupportOperation } from './store.js';
import { assertCategoryCapacity, archiveTicketChannel, isTicketArchived, freezeTicketChannel, assertTicketCanBeDeleted, ticketTopic, exportMarker } from './recovery.js';
import { staffStats } from './stats.js';
import { ticketChannelName, legacyTicketChannelName } from './ticket-names.js';
import { collectTicketTranscript, TicketTranscriptArchive } from './transcript.js';
import { TranscriptAccessError, transcriptDownload, transcriptPost } from './transcript-view.js';
export { moderationCommands } from './commands.js';
export type { ModerationConfig } from './core.js';

type Command = ChatInputCommandInteraction<'cached'>;
type TicketInteraction = Command | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'>;
const NONE = { parse: [] as never[] };
const errorText = (error: unknown) => error instanceof Error ? error.message : 'The operation failed.';
const formVersion = (questions: string[]) => createHash('sha256').update(JSON.stringify(questions)).digest('hex').slice(0, 16);
const moderationNames = new Set(['moderate', 'ticket', 'apply', 'staff-leaderboard', 'support-recovery']);

export class ModerationService {
  private readonly store: ModerationStore;
  private readonly transcripts: TicketTranscriptArchive;
  private attached = false;
  private readonly active = new Set<Promise<unknown>>();
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly spam = new Map<string, number[]>();
  private readonly applicationCooldown = new Map<string, number>();
  private readonly automodCooldown = new Map<string, number>();
  private readonly onInteraction = (interaction: Interaction) => { if (!this.attached) return; this.track(this.handleInteraction(interaction).catch(async error => {
    this.logger.warn('Moderation interaction failed.', { error: errorText(error), guildId: interaction.guildId });
    if (!interaction.isRepliable()) return;
    const content = botError(interaction.guildId, error, interaction.locale, 'Cyro could not complete this support action. Please check permissions or try again shortly.').slice(0, 1500);
    try { if (interaction.deferred || interaction.replied) await interaction.editReply({ content, allowedMentions: NONE }); else await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: NONE }); } catch { /* Expired interaction. */ }
  })); };
  private readonly onMessage = (message: Message) => { if (!this.attached) return; this.track(this.automod(message, false).catch(error => this.logger.warn('Automatic moderation failed.', { error: errorText(error), guildId: message.guildId }))); };
  private readonly onEdit = (_before: Message | PartialMessage, after: Message | PartialMessage) => { if (!this.attached) return; this.track(this.automod(after, true).catch(error => this.logger.warn('Edited-message moderation failed.', { error: errorText(error), guildId: after.guildId }))); };

  constructor(private readonly client: Client, dataDir: string, private readonly logger: Logger, private readonly access?: AccessService, private readonly dashboardUrl?: string) { this.store = new ModerationStore(path.join(dataDir, 'moderation.json')); this.transcripts = new TicketTranscriptArchive(path.join(dataDir, 'ticket-transcripts')); }
  async init(): Promise<void> { await this.store.init(); }
  attach(): void { if (this.attached) return; this.attached = true; this.client.on(Events.InteractionCreate, this.onInteraction); this.client.on(Events.MessageCreate, this.onMessage); this.client.on(Events.MessageUpdate, this.onEdit); }
  stop(): void { this.client.off(Events.InteractionCreate, this.onInteraction); this.client.off(Events.MessageCreate, this.onMessage); this.client.off(Events.MessageUpdate, this.onEdit); this.attached = false; this.spam.clear(); this.applicationCooldown.clear(); this.automodCooldown.clear(); }
  async guildIds(): Promise<string[]> { return this.store.guildIds(); }
  async purgeGuild(guildId: string, shouldPurge: () => boolean = () => true): Promise<void> {
    await this.exclusive(guildId, async () => {
      if (!shouldPurge()) return;
      let permitted = false;
      await this.store.purgeGuild(guildId, () => { permitted = shouldPurge(); return permitted; });
      if (permitted && !this.store.guildIds().includes(guildId) && shouldPurge()) await this.transcripts.purgeGuild(guildId);
    });
    for (const cache of [this.spam, this.applicationCooldown, this.automodCooldown]) for (const key of cache.keys()) if (key.startsWith(`${guildId}:`)) cache.delete(key);
  }
  private track(work: Promise<unknown>): void {
    this.active.add(work);
    void work.finally(() => this.active.delete(work)).catch(() => undefined);
  }
  async flush(): Promise<void> {
    while (this.active.size || this.queues.size) await Promise.allSettled([...this.active, ...this.queues.values()]);
    await this.store.flush();
  }
  async getConfig(guildId: string): Promise<ModerationConfig> { return this.store.read(guildId).config; }
  private async markIssue(guildId: string, type: 'ticket' | 'application', id: string, detail: string): Promise<void> {
    await this.store.update(guildId, state => {
      const record = type === 'ticket' ? state.tickets.find(item => item.id === id) : state.applications.find(item => item.id === id);
      if (record?.operation) { record.operation.stage = 'needs-review'; record.operation.detail = detail.slice(0, 1000); }
    });
  }
  async reconcile(): Promise<void> {
    if (!this.client.isReady()) throw new Error('Discord must be ready before support recovery.');
    for (const guildId of this.store.guildIds()) {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild?.available) continue;
      await this.exclusive(guildId, async () => {
        try { await this.reconcileGuild(guild); }
        catch (error) {
          if (error instanceof ModerationPersistenceError) throw error;
          await this.store.update(guildId, state => {
            for (const record of [...state.tickets, ...state.applications]) if (record.operation) {
              record.operation.stage = 'needs-review';
              record.operation.detail = `Discord recovery could not be verified: ${errorText(error).slice(0, 500)}. Restore the bot's channel/member access, then run /support-recovery list. No uncertain action was replayed.`;
            }
          });
          this.logger.warn('Support recovery needs attention in one server.', { guildId, error: errorText(error) });
        }
        // Naming is cosmetic and must never prevent recovery or startup readiness.
        try { await this.renameLegacyTickets(guild); }
        catch (error) { this.logger.warn('Legacy ticket names could not be refreshed.', { guildId, error: errorText(error) }); }
      });
    }
  }
  private async renameLegacyTickets(guild: Guild): Promise<void> {
    const state = this.store.read(guild.id);
    const tickets = state.tickets.filter(ticket => ticket.status === 'open' && !ticket.operation && ticket.channelId).slice(0, 100);
    if (!tickets.length) return;
    const channels = await guild.channels.fetch();
    const candidates = tickets.filter(ticket => {
      const channel = channels.get(ticket.channelId);
      const type = ticket.ticketType ?? ticketTypes(state.config)[0]!;
      return channel?.type === ChannelType.GuildText && channel.guild?.id === guild.id && channel.topic === ticketTopic(ticket.id)
        && channel.name.startsWith(`${type.id === 'default' ? 'ticket' : type.id}-`);
    });
    if (!candidates.length) return;
    const bot = await guild.members.fetchMe({ force: true });
    // Keep a local list as setName can resolve before a CHANNEL_UPDATE arrives.
    const names = new Map([...channels.values()].filter(channel => channel !== null).map(channel => [channel.id, channel.name]));
    for (const ticket of candidates) {
      const channel = channels.get(ticket.channelId)! as TextChannel;
      const oldName = channel.name;
      if (!channel.permissionsFor(bot)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels])) continue;
      try {
        const member = await guild.members.fetch({ user: ticket.ownerId, force: true }).catch(error => { if (error?.code === 10007) return null; throw error; });
        if (!member) continue;
        const type = ticket.ticketType ?? ticketTypes(state.config)[0]!;
        if (oldName !== legacyTicketChannelName(type.id, member.user.username)) continue;
        const name = ticketChannelName(type.name, member, [...names].filter(([id]) => id !== channel.id).map(([, value]) => value));
        if (name === oldName) continue;
        // Recheck the marker immediately before changing only this tracked channel's name.
        const current = await guild.channels.fetch(channel.id, { force: true });
        if (current?.type !== ChannelType.GuildText || current.guild.id !== guild.id || current.topic !== ticketTopic(ticket.id) || current.name !== oldName) continue;
        await current.setName(name, botText(guild.id, 'Use the ticket category and member name', {}, guild.preferredLocale));
        names.set(channel.id, name);
      } catch (error) { this.logger.warn('One legacy ticket name could not be refreshed.', { guildId: guild.id, channelId: ticket.channelId, error: errorText(error) }); }
    }
  }
  private async reconcileGuild(guild: Guild): Promise<void> {
    const state = this.store.read(guild.id);
    if (!state.tickets.some(record => record.operation) && !state.applications.some(record => record.operation)) return;
    const channels = await guild.channels.fetch();
    for (const ticket of state.tickets) {
      const operation = ticket.operation;
      if (!operation) continue;
      if (operation.kind === 'ticket-create') {
        const matches = [...channels.values()].filter(channel => channel?.type === ChannelType.GuildText && channel.topic === ticketTopic(ticket.id));
        await this.store.update(guild.id, data => {
          const record = data.tickets.find(item => item.id === ticket.id)!;
          if (matches.length === 1) { record.channelId = matches[0]!.id; delete record.operation; }
          else { record.operation!.stage = 'needs-review'; record.operation!.detail = matches.length ? 'Multiple channels carry this ticket marker. An administrator must inspect them before releasing this operation.' : 'No matching ticket channel was found. Creation was not replayed. An administrator must inspect Discord and use /support-recovery release before retrying.'; }
        });
      } else if (operation.kind === 'ticket-close') {
        const channel = channels.get(ticket.channelId);
        const log = operation.transcriptChannelId ? channels.get(operation.transcriptChannelId) : null;
        const transcript = log?.type === ChannelType.GuildText && (operation.externalAttempted || operation.transcriptMessageId) ? await this.findOperationMessage(log, message => this.matchesTranscript(message, operation), operation.transcriptMessageId) : null;
        let deleted = false;
        if (!channel && transcript && operation.closeAction === 'delete' && operation.deleteAttempted && operation.transcript) {
          // A channel absent from a list may be inaccessible. Only a direct confirmed absence finishes deletion.
          const current = await guild.channels.fetch(ticket.channelId, { force: true }).catch(error => { if (error?.code === 10003) return null; throw error; });
          if (!current) { await this.transcripts.verify(guild.id, operation.transcript); deleted = true; }
        }
        await this.store.update(guild.id, data => {
          const record = data.tickets.find(item => item.id === ticket.id)!;
          if (transcript && (deleted || (operation.closeAction !== 'delete' && channel?.type === ChannelType.GuildText && isTicketArchived(channel, this.client.user!.id, operation.archiveCategoryId ?? null)))) {
            if (operation.transcript) record.transcript = { ...operation.transcript, channelId: operation.transcriptChannelId, messageId: transcript.id };
            record.status = 'closed'; record.closedBy = operation.staffClose ? operation.actorId : null; record.closedAt = operation.startedAt; delete record.operation;
          } else {
            record.operation!.stage = 'needs-review';
            if (transcript) record.operation!.transcriptMessageId = transcript.id;
            record.operation!.detail = transcript ? 'The transcript is saved, but channel closure is unfinished. After fixing the reported permissions or history issue, run /ticket close in the original ticket to finish without another transcript. If its history changed after export, a manager must inspect and release this operation before exporting again.' : !operation.externalAttempted ? 'Closing stopped before sending a transcript. Run /ticket close in the original ticket to resume.' : 'The prior transcript send could not be verified. No send or channel mutation was replayed. A server manager must inspect the support log and /support-recovery list.';
          }
        });
      }
    }
    for (const application of state.applications) {
      const operation = application.operation;
      if (operation?.kind === 'application-submit') {
        const channel = channels.get(application.channelId);
        const message = channel?.type === ChannelType.GuildText ? await this.findOperationMessage(channel, item => item.embeds.some(embed => embed.footer?.text === application.id), application.messageId ?? undefined) : null;
        if (message) await this.store.update(guild.id, data => { const record = data.applications.find(item => item.id === application.id)!; record.messageId = message.id; delete record.operation; });
        else await this.markIssue(guild.id, 'application', application.id, 'No matching review message was found in the latest 1,000 messages. Submission was not replayed. A server manager must inspect the review channel and use /support-recovery release if it should be cancelled.');
        continue;
      }
      if (operation?.kind !== 'application-accept') continue;
      const member = operation.roleId ? await guild.members.fetch({ user: application.userId, force: true }).catch(error => { if (error?.code === 10007) return null; throw error; }) : null;
      if (!operation.roleId || member?.roles.cache.has(operation.roleId)) {
        await this.store.update(guild.id, data => { const record = data.applications.find(item => item.id === application.id)!; record.status = 'accepted'; record.reviewedBy = operation.actorId; record.reviewedAt = operation.startedAt; record.answers = []; delete record.operation; });
      } else await this.markIssue(guild.id, 'application', application.id, 'The acceptance role is not currently present. No role grant was replayed. A server manager must inspect the member and use /support-recovery release before a reviewer tries again.');
    }
  }
  async updateConfig(guildId: string, input: unknown): Promise<ModerationConfig> {
    return this.exclusive(guildId, async () => {
      const current = this.store.read(guildId);
      const next = mergeConfig(current.config, input);
      const rolesChanged = (before: string[], after: string[]) => JSON.stringify([...before].sort()) !== JSON.stringify([...after].sort());
      if (current.tickets.some(ticket => ticket.status === 'open' && !ticket.ticketType) && rolesChanged(current.config.tickets.staffRoleIds, next.tickets.staffRoleIds)) throw new Error('Close existing tickets before changing support staff roles so their staff access stays consistent.');
      if (current.applications.some(application => application.status === 'pending' && !application.applicationForm) && (rolesChanged(current.config.applications.reviewerRoleIds, next.applications.reviewerRoleIds) || current.config.applications.reviewChannelId !== next.applications.reviewChannelId)) throw new Error('Review all pending applications before changing the review channel or reviewer roles.');
      const guild = await this.client.guilds.fetch(guildId);
      const bot = await guild.members.fetchMe({ force: true });
      const types = ticketTypes(next), forms = applicationForms(next);
      for (const id of new Set([...types.flatMap(type => type.staffRoleIds), ...forms.flatMap(form => form.reviewerRoleIds)])) {
        const role = await guild.roles.fetch(id); if (!role || role.guild.id !== guildId || role.id === guildId || role.managed) throw new Error('Staff roles must be regular roles in this server.');
      }
      if (next.modLogChannelId) await this.textChannel(guild, next.modLogChannelId);
      for (const type of types) {
        for (const id of [type.categoryId, ...(type.closeAction === 'delete' ? [] : [type.archiveCategoryId])]) if (id) {
          const category = await guild.channels.fetch(id);
          if (!category || category.guild.id !== guildId || category.type !== ChannelType.GuildCategory) throw new Error('Ticket categories must be categories in this server.');
          if (next.tickets.enabled && type.enabled && type.closeAction === 'delete' && id === type.categoryId && !category.permissionsFor(bot).has([PermissionFlagsBits.ManageThreads, PermissionFlagsBits.ManageWebhooks])) throw new Error('Delete-after-transcript requires Manage Threads and Manage Webhooks for Cyro in the selected ticket category. Grant those permissions or keep a read-only archive.');
        }
        if (type.logChannelId) await this.textChannel(guild, type.logChannelId);
        if (next.tickets.enabled && type.enabled && (!type.categoryId || !type.logChannelId || !type.staffRoleIds.length)) throw new Error('Tickets require a category, transcript channel, and at least one staff role.');
      }
      for (const form of forms) {
        if (form.reviewChannelId) await this.textChannel(guild, form.reviewChannelId);
        if (form.acceptedRoleId) { const role = await guild.roles.fetch(form.acceptedRoleId); if (!role || role.guild.id !== guildId) throw new Error('Acceptance role does not exist in this server.'); assertSafeRole(role, bot); }
        if (next.applications.enabled && form.enabled && (!form.reviewChannelId || !form.reviewerRoleIds.length)) throw new Error('Applications require a review channel and at least one reviewer role.');
      }
      await this.store.update(guildId, state => { state.config = next; });
      return next;
    });
  }
  async publishPanel(guildId: string, input: unknown): Promise<{ messageId: string; channelId: string; url: string }> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Choose a saved panel and a text channel.');
    const { panelId, channelId } = input as Record<string, unknown>;
    if (Object.keys(input).some(key => key !== 'panelId' && key !== 'channelId') || typeof panelId !== 'string' || !isSnowflake(channelId)) throw new Error('Choose a saved panel and a text channel.');
    return this.exclusive(guildId, async () => {
      const config = this.store.read(guildId).config;
      const panel = config.panels?.find(item => item.id === panelId);
      if (!panel) throw new Error('Save this panel in the dashboard before publishing it.');
      const guild = await this.client.guilds.fetch(guildId);
      const channel = await this.textChannel(guild, channelId);
      const bot = await guild.members.fetchMe();
      if (!channel.permissionsFor(bot).has(PermissionFlagsBits.EmbedLinks)) throw new Error('The bot needs Embed Links in the panel channel.');
      const message = await channel.send(panelPayload(config, panel, guild.id, guild.preferredLocale));
      return { messageId: message.id, channelId: channel.id, url: message.url };
    });
  }
  /** Transcript readers follow the saved log channel audience, independently of dashboard editor roles. */
  async readTranscript(guild: Guild, ticketId: string, userId: string): Promise<{html: Buffer; filename: string}> {
    const lookup = () => {
      const ticket = this.store.read(guild.id).tickets.find(item => item.id === ticketId);
      const receipt = ticket?.transcript ?? (ticket?.operation?.transcriptMessageId ? ticket.operation.transcript : undefined);
      const channelId = ticket?.transcript?.channelId ?? ticket?.operation?.transcriptChannelId;
      if (!receipt || !channelId) throw new TranscriptAccessError(404, 'This saved transcript is unavailable.');
      return {receipt,channelId};
    };
    const saved = lookup();
    const authorize = async () => {
      const current = lookup();
      if (current.channelId !== saved.channelId || current.receipt.sha256 !== saved.receipt.sha256) throw new TranscriptAccessError(404, 'This saved transcript is unavailable.');
      const member = await guild.members.fetch({user:userId,force:true}).catch(() => undefined);
      if (!member) throw new TranscriptAccessError(403, 'You need access to the transcript channel to read this conversation.');
      await guild.roles.fetch();
      const channel = await guild.channels.fetch(saved.channelId,{force:true});
      if (!channel || channel.guild.id !== guild.id || !channel.permissionsFor(member)?.has([PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory]))
        throw new TranscriptAccessError(403, 'You need access to the transcript channel to read this conversation.');
    };
    await authorize();
    let html: Buffer;
    try { html = await this.transcripts.read(guild.id,saved.receipt); }
    catch { throw new TranscriptAccessError(404, 'This saved transcript is unavailable.'); }
    await authorize();
    return {html,filename:saved.receipt.filename.replace(/\.gz$/, '')};
  }
  async snapshot(guildId: string) {
    const state = this.store.read(guildId);
    const recoveryIssues = [...state.tickets.map(record => ({ recordType: 'ticket' as const, record })), ...state.applications.map(record => ({ recordType: 'application' as const, record }))].filter(({ record }) => record.operation).map(({ recordType, record }) => ({ recordType, id: record.id, operationId: record.operation!.id, kind: record.operation!.kind, stage: record.operation!.stage, detail: record.operation!.detail ?? 'Operation is still in progress.' }));
    return { config: state.config, moderationCases: state.cases.slice(-100).reverse(), tickets: state.tickets.slice(-100).reverse(), applications: state.applications.slice(-100).reverse().map(({ answers: _answers, questions: _questions, ...record }) => record), recoveryIssues, staffLeaderboard: { '7d': staffStats(state.tickets, '7d', Date.now(), state.cases, state.applications), '30d': staffStats(state.tickets, '30d', Date.now(), state.cases, state.applications), all: staffStats(state.tickets, 'all', Date.now(), state.cases, state.applications) } };
  }
  private exclusive<T>(guildId: string, task: () => Promise<T>): Promise<T> {
    const operation = (this.queues.get(guildId) ?? Promise.resolve()).catch(() => undefined).then(task);
    this.queues.set(guildId, operation);
    void operation.finally(() => { if (this.queues.get(guildId) === operation) this.queues.delete(guildId); }).catch(() => undefined);
    return operation;
  }
  private async textChannel(guild: Guild, id: string): Promise<TextChannel> {
    const channel = await guild.channels.fetch(id);
    if (!channel || channel.guild.id !== guild.id || channel.type !== ChannelType.GuildText) throw new Error('Select a text channel in this server.');
    const bot = await guild.members.fetchMe();
    if (!channel.permissionsFor(bot).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) throw new Error('The bot needs View Channel and Send Messages in the selected channel.');
    return channel;
  }
  private async handleInteraction(interaction: Interaction): Promise<void> {
    const t = (source: string, params = {}) => botText(interaction.guildId, source, params, interaction.locale);
    const shared = { guildId: interaction.guildId, locale: interaction.guild?.preferredLocale };
    const g = (source: string, params = {}) => supportText(shared, source, params);
    const ours = (interaction.isChatInputCommand() && moderationNames.has(interaction.commandName)) || ((interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) && interaction.customId.startsWith('mod:'));
    if (!ours) return;
    if (!interaction.inCachedGuild()) throw new Error('Use this command inside a server.');
    if (interaction.isChatInputCommand() && this.access) {
      if (interaction.commandName === 'apply') this.access.commandMember(interaction.member, interaction.commandName, true);
      else {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await this.access.command(interaction.guild, interaction.user.id, interaction.commandName, true);
      }
    }
    if (interaction.isChatInputCommand() && interaction.commandName === 'apply') { await this.showApplication(interaction, interaction.options.getString('form') ?? undefined); return; }
    if (interaction.isModalSubmit()) { await interaction.deferReply({ flags: MessageFlags.Ephemeral }); await this.submitApplication(interaction); return; }
    if ((interaction.isButton() || interaction.isStringSelectMenu()) && interaction.customId.startsWith('mod:panel:')) {
      const choice = selectedPanelOption(this.store.read(interaction.guildId).config, interaction.customId, interaction.isStringSelectMenu() ? interaction.values : undefined);
      if (choice.kind === 'applications') await this.showApplication(interaction, choice.id);
      else { await interaction.deferReply({ flags: MessageFlags.Ephemeral }); await this.ticket(interaction, 'open', choice.id); }
      return;
    }
    if (interaction.isStringSelectMenu()) {
      if (interaction.values.length !== 1) throw new Error('Choose one option.');
      if (interaction.customId === 'mod:application:choose') await this.showApplication(interaction, interaction.values[0]);
      else if (interaction.customId === 'mod:ticket:choose') { await interaction.deferReply({ flags: MessageFlags.Ephemeral }); await this.ticket(interaction, 'open', interaction.values[0]); }
      else throw new Error('This control is no longer supported.');
      return;
    }
    if (interaction.isButton()) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (interaction.customId === 'mod:ticket:open') await this.ticket(interaction, 'open');
      else if (interaction.customId.startsWith('mod:application:')) await this.reviewApplication(interaction);
      else if (interaction.customId === 'mod:ticket:claim' || interaction.customId === 'mod:ticket:close') await this.ticket(interaction, interaction.customId.split(':')[2]!);
      else throw new Error('This control is no longer supported.');
      return;
    }
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.deferred) await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (interaction.commandName === 'moderate') await this.moderate(interaction);
    else if (interaction.commandName === 'ticket') {
      if (interaction.options.getSubcommand() === 'panel' && interaction.options.getString('panel')) {
        const actor = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
        if (!actor.permissions.has(PermissionFlagsBits.ManageGuild)) throw new Error('You need Manage Server to post a support panel.');
        const result = await this.publishPanel(interaction.guildId, { panelId: interaction.options.getString('panel'), channelId: interaction.channelId });
        await interaction.editReply({ content: t('Panel posted: {url}', { url: result.url }), allowedMentions: NONE });
      } else await this.ticket(interaction, interaction.options.getSubcommand(), interaction.options.getString('type') ?? undefined);
    }
    else if (interaction.commandName === 'support-recovery') await this.supportRecovery(interaction);
    else if (interaction.commandName === 'staff-leaderboard') {
      const actor = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
      const state = this.store.read(interaction.guildId);
      const supportRoles = [...new Set([...ticketTypes(state.config).flatMap(type => type.staffRoleIds), ...state.tickets.filter(ticket => ticket.status === 'open').flatMap(ticket => ticket.ticketType?.staffRoleIds ?? [])])];
      if (!isStaff(actor, supportRoles)) throw new Error('Only configured support staff may view the staff leaderboard.');
      const period = (interaction.options.getString('period') ?? '7d') as '7d' | '30d' | 'all';
      const rows = staffStats(state.tickets, period, Date.now(), state.cases, state.applications).slice(0, 10);
      const lines = rows.map((row, i) => t('**{rank}. <@{user}>** · {actions} actions\n{claims} claimed · {closes} closed · {moderation} moderation · {reviews} reviews\n{assigned} assigned now · Avg claim {claimTime}s · Avg close {closeTime}s', { rank: i + 1, user: row.userId, actions: row.totalActions, claims: row.claims, closes: row.closes, moderation: row.moderationActions, reviews: row.applicationsReviewed, assigned: row.openAssigned, claimTime: row.averageClaimSeconds ?? '—', closeTime: row.averageCloseSeconds ?? '—' }));
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x6dc9ed).setTitle(t('Staff activity · {period}', { period: t(period === 'all' ? 'Retained history' : period === '30d' ? 'Last 30 days' : 'Last 7 days') })).setDescription(lines.join('\n\n') || t('No recorded staff activity yet.')).setFooter({text:t('Ticket averages run from creation. Assigned tickets are current. Counts show activity, not service quality. More detail in /dashboard.')})], allowedMentions: NONE });
    }
  }
  private async supportRecovery(interaction: Command): Promise<void> {
    const t = (source: string, params = {}) => botText(interaction.guildId, source, params, interaction.locale);
    const shared = { guildId: interaction.guildId, locale: interaction.guild?.preferredLocale };
    const g = (source: string, params = {}) => supportText(shared, source, params);
    const actor = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
    await interaction.guild.roles.fetch();
    if (!actor.permissions.has(PermissionFlagsBits.ManageGuild)) throw new Error('You need Manage Server to inspect or release interrupted support operations.');
    await this.exclusive(interaction.guildId, async () => {
      await this.reconcileGuild(interaction.guild);
      if (interaction.options.getSubcommand() === 'list') {
        const issues = (await this.snapshot(interaction.guildId)).recoveryIssues;
        await interaction.editReply({ content: issues.length ? t('{count} interrupted operation(s). Inspect Discord before releasing anything. Full details are in the dashboard.\n\n{details}', { count: issues.length, details: issues.slice(0, 5).map(issue => `${supportAction({ guildId: interaction.guildId, locale: interaction.locale }, issue.kind)} · ${issue.operationId}\n${botError(interaction.guildId, new Error(issue.detail), interaction.locale, 'This support operation needs staff review. Inspect the dashboard and Discord before retrying.').slice(0, 210)}`).join('\n\n') }) : t('All recorded support operations are complete. No uncertain action was replayed.'), allowedMentions: NONE });
        return;
      }
      const id = interaction.options.getString('operation', true);
      const reason = interaction.options.getString('reason', true).trim();
      if (reason.length < 10 || reason.length > 500) throw new Error('Describe what you checked in Discord in 10–500 characters.');
      await this.store.update(interaction.guildId, state => {
        const ticket = state.tickets.find(record => record.operation?.id === id);
        const application = state.applications.find(record => record.operation?.id === id);
        const record = ticket ?? application;
        const operation = record?.operation;
        if (!record || !operation || operation.stage !== 'needs-review') throw new Error('That exact operation is not awaiting review in this server. It may already have been recovered; refresh /support-recovery list.');
        if (ticket && operation.kind === 'ticket-create') { ticket.status = 'closed'; ticket.closedAt = new Date().toISOString(); ticket.closedBy = null; }
        if (application && operation.kind === 'application-submit') { application.status = 'denied'; application.reviewedBy = actor.id; application.reviewedAt = new Date().toISOString(); application.answers = []; }
        delete record.operation;
        state.cases.push({ id: randomUUID(), action: 'support-recovery-release', userId: ticket?.ownerId ?? application!.userId, actorId: actor.id, reason: `Operation ${id} (${operation.kind}): ${reason}`, createdAt: new Date().toISOString() });
      });
      await interaction.editReply(t('The interrupted local operation was released and your reason was recorded. No Discord channel, message, or role was deleted or changed. A new ordinary action can now be started if needed.'));
    });
  }
  private async moderate(interaction: Command): Promise<void> {
    const t = (source: string, params = {}) => botText(interaction.guildId, source, params, interaction.locale);
    const shared = { guildId: interaction.guildId, locale: interaction.guild?.preferredLocale };
    const g = (source: string, params = {}) => supportText(shared, source, params);
    const config = this.store.read(interaction.guildId).config;
    if (!config.enabled) throw new Error('Enable moderation in the dashboard first.');
    const actor = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
    const bot = await interaction.guild.members.fetchMe({ force: true });
    const action = interaction.options.getSubcommand();
    const reason = interaction.options.getString('reason', true);
    if (action === 'purge') {
      const channel = interaction.channel;
      if (!channel || channel.type !== ChannelType.GuildText) throw new Error('Use purge in a server text channel.');
      if (!channel.permissionsFor(actor).has(PermissionFlagsBits.ManageMessages) || !channel.permissionsFor(bot).has([PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory])) throw new Error('You and the bot need Manage Messages; the bot also needs Read Message History.');
      const deleted = await channel.bulkDelete(interaction.options.getInteger('count', true), true);
      await this.recordCase(interaction.guild, { action: 'purge', actorId: actor.id, userId: channel.id, reason: g('{count} messages: {reason}', { count: deleted.size, reason }) });
      await interaction.editReply({ content: t('Deleted {count} recent messages. Messages older than 14 days were skipped.', { count: deleted.size }), allowedMentions: NONE });
      return;
    }
    const target = await interaction.guild.members.fetch({ user: interaction.options.getUser('member', true).id, force: true });
    const permission = action === 'ban' ? PermissionFlagsBits.BanMembers : action === 'kick' ? PermissionFlagsBits.KickMembers : PermissionFlagsBits.ModerateMembers;
    assertCanModerate(actor, target, bot, permission, interaction.guild.ownerId);
    const auditReason = `${actor.user.tag} (${actor.id}): ${reason}`.slice(0, 512);
    if (action === 'kick') await target.kick(auditReason);
    else if (action === 'ban') await target.ban({ reason: auditReason });
    else if (action === 'timeout') { if (!target.moderatable) throw new Error('This member cannot be timed out.'); await target.timeout(interaction.options.getInteger('minutes', true) * 60000, auditReason); }
    await this.recordCase(interaction.guild, { action, actorId: actor.id, userId: target.id, reason });
    await interaction.editReply({ content: t(action === 'warn' ? 'Warning recorded for {member}.' : action === 'kick' ? 'Kick completed for {member}.' : action === 'ban' ? 'Ban completed for {member}.' : 'Timeout completed for {member}.', { member: target.user.tag }), allowedMentions: NONE });
  }
  private async recordCase(guild: Guild, details: Omit<ModCase, 'id' | 'createdAt'>): Promise<void> {
    const context = { guildId: guild.id, locale: guild.preferredLocale };
    const g = (source: string, params = {}) => supportText(context, source, params);
    const record = { ...details, id: randomUUID(), createdAt: new Date().toISOString() };
    try { await this.store.update(guild.id, state => { state.cases.push(record); }); }
    catch (error) { this.logger.error('Moderation action happened but saving its case failed.', { guildId: guild.id, action: details.action, error: errorText(error) }); throw new Error('The action completed, but its case could not be saved. Check the host storage before retrying.'); }
    const config = this.store.read(guild.id).config;
    if (!config.modLogChannelId) return;
    try {
      const channel = await this.textChannel(guild, config.modLogChannelId);
      await channel.send({ embeds: [new EmbedBuilder().setColor(0x619cec).setTitle(g('Moderation · {action}', { action: supportAction(context, record.action) })).setDescription(record.reason).addFields({ name: g('Member / channel'), value: record.userId }, { name: g('Moderator'), value: record.actorId }, { name: g('Case'), value: record.id }).setTimestamp()], allowedMentions: NONE });
    } catch (error) { this.logger.warn('Moderation case saved, but its Discord log could not be sent.', { guildId: guild.id, error: errorText(error) }); }
  }
  private async automod(input: Message | PartialMessage, edited: boolean): Promise<void> {
    if (!input.guildId) return;
    const config = this.store.read(input.guildId).config;
    if (!config.enabled || (!config.blockedWords.length && !config.antiSpam.enabled)) return;
    const message = input.partial ? await input.fetch() : input;
    if (!message.guild || message.author.bot || message.webhookId) return;
    const member = await message.guild.members.fetch(message.author.id);
    if (member.permissions.has(PermissionFlagsBits.ManageMessages) || member.id === message.guild.ownerId) return;
    const bot = await message.guild.members.fetchMe();
    if (bot.roles.highest.comparePositionTo(member.roles.highest) <= 0) return;
    const blocked = config.blockedWords.some(word => message.content.toLocaleLowerCase().includes(word));
    const key = `${message.guildId}:${member.id}`;
    const now = Date.now();
    let spam = false;
    if (config.antiSpam.enabled && !edited) {
      const timestamps = (this.spam.get(key) ?? []).filter(time => time > now - config.antiSpam.windowSeconds * 1000);
      timestamps.push(now); this.spam.set(key, timestamps.slice(-31)); spam = timestamps.length > config.antiSpam.maxMessages;
      if (this.spam.size > 10000) { for (const [id, times] of this.spam) if ((times.at(-1) ?? 0) < now - 60000) this.spam.delete(id); if (this.spam.size > 10000) this.spam.delete(this.spam.keys().next().value!); }
    }
    if (!blocked && !spam) return;
    if (message.deletable) await message.delete();
    if ((this.automodCooldown.get(key) ?? 0) > now - 10000) return;
    this.automodCooldown.set(key, now);
    if (this.automodCooldown.size > 10000) this.automodCooldown.delete(this.automodCooldown.keys().next().value!);
    const g = (source: string, params = {}) => botText(message.guildId, source, params, message.guild!.preferredLocale);
    let result = g(message.deletable ? 'Message removed.' : 'Bot lacked permission to remove the message.');
    if (spam && member.moderatable && bot.permissions.has(PermissionFlagsBits.ModerateMembers)) { await member.timeout(config.antiSpam.timeoutMinutes * 60000, g('Automatic spam protection')); result += g(' Timed out for {minutes} minutes.', { minutes: config.antiSpam.timeoutMinutes }); }
    await this.recordCase(message.guild, { action: blocked ? 'blocked-word' : 'anti-spam', userId: member.id, actorId: bot.id, reason: result });
  }
  private async ticket(interaction: TicketInteraction, action: string, typeId?: string): Promise<void> {
    const t = (source: string, params = {}) => botText(interaction.guildId, source, params, interaction.locale);
    const shared = { guildId: interaction.guildId, locale: interaction.guild?.preferredLocale };
    const g = (source: string, params = {}) => supportText(shared, source, params);
    await this.exclusive(interaction.guildId, async () => {
      const state = this.store.read(interaction.guildId);
      if ((action === 'open' || action === 'panel') && !state.config.tickets.enabled) throw new Error('Support tickets are disabled.');
      const available = ticketTypes(state.config).filter(type => type.enabled);
      const actor = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
      if (action === 'panel') {
        if (!actor.permissions.has(PermissionFlagsBits.ManageGuild)) throw new Error('You need Manage Server to post a ticket panel.');
        if (!available.length) throw new Error('Enable a ticket type in the dashboard first.');
        const channel = await this.textChannel(interaction.guild, interaction.channelId);
        const bot = await interaction.guild.members.fetchMe();
        if (!channel.permissionsFor(bot)?.has(PermissionFlagsBits.EmbedLinks)) throw new Error('The bot needs Embed Links in the panel channel.');
        await channel.send({ embeds: [new EmbedBuilder().setColor(0x82d9f7).setTitle(g('Need a hand?')).setDescription(g('Choose a category to open a ticket.'))], components: [this.choiceMenu('mod:ticket:choose', available, shared)], allowedMentions: NONE });
        await interaction.editReply(t('Ticket panel posted.')); return;
      }
      if (action === 'open') {
        if (!typeId && available.length > 1) { await interaction.editReply({ content: t('Choose a ticket category.'), components: [this.choiceMenu('mod:ticket:choose', available, { guildId: interaction.guildId, locale: interaction.locale })], allowedMentions: NONE }); return; }
        const config = available.find(type => type.id === (typeId ?? available[0]?.id));
        if (!config) throw new Error('This ticket type is no longer available. Ask staff for an updated panel.');
        if (!config.categoryId || !config.logChannelId || !config.staffRoleIds.length) throw new Error('An administrator must finish ticket setup in the dashboard.');
        if (state.tickets.some(ticket => ticket.ownerId === actor.id && ticket.operation?.kind === 'ticket-create')) throw new Error('Your earlier ticket creation was interrupted and its channel may already exist. Ask a server manager to inspect /support-recovery list before opening another ticket.');
        if (state.tickets.filter(t => t.ownerId === actor.id && t.status === 'open' && (t.ticketType?.id ?? 'default') === config.id).length >= config.maxOpenPerUser) throw new Error('You have reached the open ticket limit for this category. Please finish your existing ticket first.');
        if (state.tickets.filter(t => t.status === 'open').length >= 100) throw new Error('This server has 100 open tickets. Staff must close some before new tickets can be created.');
        const bot = await interaction.guild.members.fetchMe({ force: true });
        const category = await interaction.guild.channels.fetch(config.categoryId);
        if (!category || category.guild.id !== interaction.guildId || category.type !== ChannelType.GuildCategory) throw new Error('The configured ticket category is missing from this server.');
        if (!category.permissionsFor(bot).has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) throw new Error('The bot needs Manage Channels and Manage Roles in the ticket category.');
        await assertCategoryCapacity(interaction.guild, category.id);
        for (const id of config.staffRoleIds) { const role = await interaction.guild.roles.fetch(id); if (!role || role.guild.id !== interaction.guildId || role.id === interaction.guildId || role.managed) throw new Error('A configured support staff role is no longer available.'); }
        await this.textChannel(interaction.guild, config.logChannelId);
        const channels = await interaction.guild.channels.fetch();
        const name = ticketChannelName(config.name, actor, [...channels.values()].filter(channel => channel !== null).map(channel => channel.name));
        const permissionOverwrites = ticketPermissionOverwrites(category, bot.id, actor.id, config.staffRoleIds, config.visibility ?? 'private');
        const record: Ticket = { id: randomUUID(), channelId: '', ownerId: actor.id, status: 'open', createdAt: new Date().toISOString(), claimedBy: null, claimedAt: null, closedBy: null, closedAt: null, ticketType: structuredClone(config), operation: { id: randomUUID(), kind: 'ticket-create', stage: 'sending', actorId: actor.id, startedAt: new Date().toISOString() } };
        await this.store.update(interaction.guildId, data => { data.tickets.push(record); });
        let channel: TextChannel;
        try {
          channel = await interaction.guild.channels.create({ name, topic: ticketTopic(record.id), type: ChannelType.GuildText, parent: config.categoryId, permissionOverwrites, reason: g('Support ticket {id} opened by {actor}', { id: record.id, actor: actor.id }) });
          await this.store.update(interaction.guildId, data => { const saved = data.tickets.find(ticket => ticket.id === record.id)!; saved.channelId = channel.id; delete saved.operation; });
        } catch (error) { await this.markIssue(interaction.guildId, 'ticket', record.id, 'Ticket creation was interrupted. Its channel may exist; an administrator must run /support-recovery list and inspect it before retrying.'); throw error; }
        try { await channel.send({ content: g('**{category}** · ticket for <@{owner}>. {visibility} Describe what you need help with. Staff can claim the ticket; staff or the ticket owner can close it. Closing automatically saves a transcript to the configured transcript channel.{closure}', { category: supportName(shared, config), owner: actor.id, visibility: g(config.visibility === 'inherit' ? 'This ticket copied the category permissions when it opened.' : 'Visible to you and the configured support team.'), closure: g(config.closeAction === 'delete' ? ' This category then deletes the ticket channel. Download any original attachments you want to keep before closing; the transcript stores links that can expire.' : ' The channel remains as a read-only archive.') }), components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('mod:ticket:claim').setLabel(g('Claim ticket')).setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('mod:ticket:close').setLabel(g(config.closeAction === 'delete' ? 'Close, save & delete' : 'Close & save transcript')).setStyle(ButtonStyle.Secondary))], allowedMentions: NONE }); }
        catch (error) { this.logger.warn('Ticket created but welcome message failed.', { guildId: interaction.guildId, error: errorText(error) }); }
        await interaction.editReply({ content: t('Your ticket is ready: <#{channel}>.', { channel: channel.id }), allowedMentions: NONE }); return;
      }
      const record = state.tickets.find(t => t.channelId === interaction.channelId);
      if (!record || record.status !== 'open') throw new Error('Use this inside an open ticket created by this bot.');
      const config = record.ticketType ?? state.config.tickets;
      const staff = isStaff(actor, config.staffRoleIds);
      if (action === 'claim') {
        if (record.operation) throw new Error('This ticket has an interrupted operation. A server manager must inspect /support-recovery list before it can be claimed.');
        if (!staff) throw new Error('Only configured support staff may claim tickets.');
        if (record.claimedBy) throw new Error('This ticket has already been claimed.');
        await this.store.update(interaction.guildId, data => { const ticket = data.tickets.find(t => t.id === record.id)!; ticket.claimedBy = actor.id; ticket.claimedAt = new Date().toISOString(); });
        const channel = await this.textChannel(interaction.guild, record.channelId);
        await channel.send({ content: g('Ticket claimed by <@{member}>.', { member: actor.id }), allowedMentions: NONE });
        await interaction.editReply(t('Ticket claimed.')); return;
      }
      if (action !== 'close') throw new Error('Unknown ticket action.');
      if (!staff && record.ownerId !== actor.id) throw new Error('Only the ticket owner and configured support staff may close this ticket.');
      const keepChannel = 'options' in interaction && interaction.options.getBoolean('keep_channel') === true;
      if (keepChannel && !staff) throw new Error('Only configured support staff can override the ticket close action.');
      await this.closeTicket(interaction, record, actor, staff, keepChannel);
    });
  }
  private choiceMenu(customId: string, options: { id: string; name: string }[], context: { guildId: string; locale?: string }): ActionRowBuilder<StringSelectMenuBuilder> {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder(supportText(context, 'Choose an option')).setMinValues(1).setMaxValues(1).addOptions(options.map(option => ({ label: supportName(context, option), value: option.id }))));
  }
  private async findOperationMessage(channel: TextChannel, matches: (message: Message) => boolean, knownId?: string): Promise<Message | null> {
    if (knownId) {
      const message = await channel.messages.fetch({ message: knownId, force: true, cache: false }).catch(error => { if (error?.code === 10008) return null; throw error; });
      return message && message.author.id === this.client.user!.id && matches(message) ? message : null;
    }
    let before: string | undefined;
    for (let page = 0; page < 10; page++) {
      const messages = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}), cache: false });
      const found = [...messages.values()].filter(message => message.author.id === this.client.user!.id && matches(message));
      if (found.length > 1) throw new Error('Multiple messages have this operation marker. Staff must inspect the support log.');
      if (found.length === 1) return found[0]!;
      if (messages.size < 100) break;
      before = messages.last()!.id;
    }
    return null;
  }
  private matchesTranscript(message: Message, operation: SupportOperation): boolean {
    const marker = message.content?.startsWith(exportMarker(operation.id) + '\n') || message.embeds?.some(embed => embed.footer?.text === exportMarker(operation.id));
    return Boolean(marker) && (!operation.transcript || [...message.attachments.values()].some(attachment => attachment.name === (operation.transcript!.attachmentFilename ?? operation.transcript!.filename) && attachment.size > 0));
  }
  private async closeTicket(interaction: TicketInteraction, record: Ticket, actor: GuildMember, staff: boolean, keepChannel = false): Promise<void> {
    const t = (source: string, params = {}) => botText(interaction.guildId, source, params, interaction.locale);
    const shared = { guildId: interaction.guildId, locale: interaction.guild?.preferredLocale };
    const g = (source: string, params = {}) => supportText(shared, source, params);
    const config = record.ticketType ?? this.store.read(interaction.guildId).config.tickets;
    if (record.operation && record.operation.kind !== 'ticket-close') throw new Error('This ticket has an unfinished creation request. Ask an administrator to run /support-recovery list.');
    let operation = record.operation;
    const logId = operation?.transcriptChannelId ?? config.logChannelId;
    if (!logId) throw new Error('Staff must set a transcript channel before closing tickets.');
    const channel = await this.textChannel(interaction.guild, record.channelId);
    const log = await this.textChannel(interaction.guild, logId);
    if (log.id === channel.id) throw new Error('The transcript channel must be separate from the ticket being closed.');
    const bot = await interaction.guild.members.fetchMe({ force: true });
    if (!channel.permissionsFor(bot).has([PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles]) || !log.permissionsFor(bot).has([PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory])) throw new Error('The bot needs Read Message History, Manage Channels and Manage Roles in this ticket, and Attach Files plus Read Message History in the transcript channel.');
    if (!operation) {
      operation = { id: randomUUID(), kind: 'ticket-close', stage: 'prepared', actorId: actor.id, startedAt: new Date().toISOString(), transcriptChannelId: log.id, archiveCategoryId: config.archiveCategoryId, staffClose: staff, externalAttempted: false, closeAction: keepChannel ? 'archive' : config.closeAction ?? 'archive' };
      await this.store.update(interaction.guildId, data => { data.tickets.find(ticket => ticket.id === record.id)!.operation = operation; });
    }
    const op = operation;
    if (keepChannel && op.closeAction === 'delete') {
      await this.store.update(interaction.guildId, data => { data.tickets.find(ticket => ticket.id === record.id)!.operation!.closeAction = 'archive'; });
      op.closeAction = 'archive';
    }
    try {
      // Catch setup problems before locking an otherwise usable ticket; recheck before deletion too.
      if (op.closeAction === 'delete') await assertTicketCanBeDeleted(channel, bot);
      // Freeze ordinary participants before collecting history; administrators must leave it unchanged during closure.
      await freezeTicketChannel(channel, bot, g('Ticket {id} closing by {actor}', { id: record.id, actor: actor.id }));
      if (op.externalAttempted || op.transcriptMessageId) {
        const existing = await this.findOperationMessage(log, message => this.matchesTranscript(message, op), op.transcriptMessageId);
        if (!existing) throw new Error('The previous transcript send could not be verified. It was not repeated. An administrator must inspect the transcript channel and /support-recovery list.');
        op.transcriptMessageId = existing.id;
      } else {
        const snapshot = await collectTicketTranscript(channel);
        if (op.closeAction === 'delete' && snapshot.unsupportedContent?.length) throw new BotMessageError('This ticket contains content that cannot be fully exported. The channel was retained. Staff can use /ticket close keep_channel:true to save a text transcript and retain the original content.');
        const archived = await this.transcripts.save(interaction.guildId, op.id, g('Ticket {id}', { id: channel.name || record.id }), snapshot, undefined, interaction.guild.preferredLocale);
        const download = transcriptDownload(archived.data, archived.receipt);
        archived.receipt.attachmentFilename = download.filename;
        op.transcript = archived.receipt;
        await this.store.update(interaction.guildId, data => { const saved = data.tickets.find(ticket => ticket.id === record.id)!.operation!; saved.transcript = archived.receipt; saved.stage = 'sending'; saved.externalAttempted = true; });
        op.externalAttempted = true;
        const message = await log.send(transcriptPost(interaction.guildId, record, op, download, this.dashboardUrl, interaction.guild.preferredLocale));
        if (!this.matchesTranscript(message, op)) throw new Error('Discord did not confirm the transcript attachment. The channel was retained; inspect the support log before retrying.');
        op.transcriptMessageId = message.id;
      }
      await this.store.update(interaction.guildId, data => { const saved = data.tickets.find(ticket => ticket.id === record.id)!.operation!; saved.transcriptMessageId = op.transcriptMessageId; saved.stage = 'transcript-saved'; delete saved.detail; });
      if (op.closeAction === 'delete') {
        if (!op.transcript) throw new Error('A legacy transcript cannot authorize channel deletion. Keep the channel or have a manager release the operation and export its full history again.');
        if (op.transcript.unsupportedContent?.length) throw new Error('This transcript omits rich content. Staff must use /ticket close keep_channel:true to preserve the original ticket channel.');
        await this.transcripts.verify(interaction.guildId, op.transcript);
        await assertTicketCanBeDeleted(channel, bot);
        const current = await collectTicketTranscript(channel);
        if (current.unsupportedContent?.length || current.sourceSha256 !== op.transcript.sourceSha256) throw new Error('The ticket changed after its transcript was saved. The channel was retained. A manager must inspect /support-recovery list and release this operation before exporting again.');
        await this.store.update(interaction.guildId, data => { const saved = data.tickets.find(ticket => ticket.id === record.id)!.operation!; saved.stage = 'deleting'; saved.deleteAttempted = true; });
        // Recheck the latest message after the durable write, immediately before the destructive request.
        const latest = await channel.messages.fetch({ limit: 1, cache: false });
        if ((latest.first()?.id ?? null) !== op.transcript.newestMessageId) throw new Error('A new message arrived while closing. The saved transcript is retained, and the ticket channel was not deleted. A manager must release this operation before exporting again.');
        await channel.delete(g('Ticket {id}: complete transcript saved in {channel}/{message}', { id: record.id, channel: log.id, message: op.transcriptMessageId }));
      } else {
        await this.store.update(interaction.guildId, data => { const saved = data.tickets.find(ticket => ticket.id === record.id)!.operation!; saved.stage = 'archiving'; saved.archiveCategoryId = config.archiveCategoryId; });
        await archiveTicketChannel(channel, bot, config.archiveCategoryId, g('Ticket {id} archived by {actor}', { id: record.id, actor: actor.id }));
      }
      await this.store.update(interaction.guildId, data => { const ticket = data.tickets.find(item => item.id === record.id)!; if (op.transcript) ticket.transcript = { ...op.transcript, channelId: log.id, messageId: op.transcriptMessageId }; ticket.status = 'closed'; ticket.closedBy = op.staffClose ? op.actorId : null; ticket.closedAt = new Date().toISOString(); delete ticket.operation; });
    } catch (error) {
      await this.markIssue(interaction.guildId, 'ticket', record.id, `${errorText(error)} The saved transcript and operation are retained. Inspect /support-recovery list before any manual deletion. If the channel remains, /ticket close can resume after fixing the issue.`);
      throw error;
    }
    // A deleted channel can invalidate the interaction reply; that must not turn successful closure into a failed operation.
    await interaction.editReply(t(op.closeAction === 'delete' ? 'Transcript saved automatically in <#{channel}>; the ticket channel was deleted.' : 'Transcript saved automatically in <#{channel}>; the ticket is now a read-only archive.', { channel: log.id })).catch(error => this.logger.warn('Ticket closed but its interaction reply was unavailable.', { guildId: interaction.guildId, error: errorText(error) }));
  }
  private async showApplication(interaction: TicketInteraction, formId?: string): Promise<void> {
    const t = (source: string, params = {}) => botText(interaction.guildId, source, params, interaction.locale);
    const shared = { guildId: interaction.guildId, locale: interaction.guild?.preferredLocale };
    const g = (source: string, params = {}) => supportText(shared, source, params);
    const state = this.store.read(interaction.guildId);
    if (!state.config.applications.enabled) throw new Error('Applications are disabled.');
    const available = applicationForms(state.config).filter(form => form.enabled);
    if (!formId && available.length > 1) { await interaction.reply({ content: t('Choose an application form.'), components: [this.choiceMenu('mod:application:choose', available, { guildId: interaction.guildId, locale: interaction.locale })], flags: MessageFlags.Ephemeral, allowedMentions: NONE }); return; }
    const config = available.find(form => form.id === (formId ?? available[0]?.id));
    if (!config) throw new Error('This application form is no longer available. Ask staff for an updated panel.');
    if (state.applications.some(a => a.userId === interaction.user.id && a.status === 'pending' && (a.applicationForm?.id ?? 'default') === config.id)) throw new Error('You already have this application waiting for review.');
    const version = formVersion([JSON.stringify(config)]);
    const modal = new ModalBuilder().setCustomId(`mod:application:submit:${config.id}:${version}`).setTitle(supportName({ guildId: interaction.guildId, locale: interaction.locale }, config).slice(0, 45));
    config.questions.forEach((question, index) => modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId(`answer-${index}`).setLabel(applicationQuestion({ guildId: interaction.guildId, locale: interaction.locale }, config, question).slice(0, 45)).setPlaceholder(applicationQuestion({ guildId: interaction.guildId, locale: interaction.locale }, config, question).slice(0, 100)).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(800))));
    await interaction.showModal(modal);
  }
  private async submitApplication(interaction: ModalSubmitInteraction<'cached'>): Promise<void> {
    const t = (source: string, params = {}) => botText(interaction.guildId, source, params, interaction.locale);
    const shared = { guildId: interaction.guildId, locale: interaction.guild?.preferredLocale };
    const g = (source: string, params = {}) => supportText(shared, source, params);
    if (!interaction.customId.startsWith('mod:application:submit:')) throw new Error('This application form has expired.');
    await this.exclusive(interaction.guildId, async () => {
      const state = this.store.read(interaction.guildId);
      const [, , , formId, version, extra] = interaction.customId.split(':');
      const config = applicationForms(state.config).find(form => form.id === formId);
      if (!config || extra || version !== formVersion([JSON.stringify(config)])) throw new Error('The application questions or settings changed while this form was open. Run /apply to open the updated form.');
      if (!state.config.applications.enabled || !config.enabled || !config.reviewChannelId) throw new Error('Applications are disabled or not configured.');
      if (state.applications.some(a => a.userId === interaction.user.id && a.status === 'pending' && (a.applicationForm?.id ?? 'default') === config.id)) throw new Error('You already have this application waiting for review.');
      if (state.applications.filter(a => a.status === 'pending').length >= 100) throw new Error('The review queue is full. Please try again after staff have reviewed existing applications.');
      const key = `${interaction.guildId}:${interaction.user.id}:${config.id}`;
      const previous = state.applications.filter(a => a.userId === interaction.user.id && (a.applicationForm?.id ?? 'default') === config.id).at(-1);
      if (previous && Date.parse(previous.createdAt) > Date.now() - 86400000) throw new Error('You can submit this application once per 24 hours.');
      if ((this.applicationCooldown.get(key) ?? 0) > Date.now() - 60000) throw new Error('Please wait a minute before trying again.');
      this.applicationCooldown.set(key, Date.now());
      if (this.applicationCooldown.size > 10000) this.applicationCooldown.delete(this.applicationCooldown.keys().next().value!);
      await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
      const channel = await this.textChannel(interaction.guild, config.reviewChannelId);
      const answers = config.questions.map((_q, index) => interaction.fields.getTextInputValue(`answer-${index}`).trim());
      if (answers.some(answer => !answer || answer.length > 800)) throw new Error('All application answers are required and must be at most 800 characters.');
      const id = randomUUID();
      const record: Application = { id, userId: interaction.user.id, status: 'pending', createdAt: new Date().toISOString(), reviewedBy: null, reviewedAt: null, answers, questions: [...config.questions], messageId: null, channelId: channel.id, applicationForm: structuredClone(config), operation: { id: randomUUID(), kind: 'application-submit', stage: 'sending', actorId: interaction.user.id, startedAt: new Date().toISOString(), externalAttempted: true } };
      await this.store.update(interaction.guildId, data => { data.applications.push(record); });
      try {
        const message = await channel.send({ embeds: [new EmbedBuilder().setColor(0x619cec).setTitle(supportName(shared, config)).setDescription(g('Applicant: <@{user}> ({user})', { user: interaction.user.id })).addFields(config.questions.map((q, index) => ({ name: applicationQuestion(shared, config, q), value: answers[index]! }))).setFooter({ text: id }).setTimestamp()], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`mod:application:accept:${id}`).setLabel(g('Accept')).setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`mod:application:deny:${id}`).setLabel(g('Decline')).setStyle(ButtonStyle.Danger))], allowedMentions: NONE });
        await this.store.update(interaction.guildId, data => { const saved = data.applications.find(application => application.id === id)!; saved.messageId = message.id; delete saved.operation; });
      } catch (error) { await this.markIssue(interaction.guildId, 'application', id, 'Application delivery was interrupted. Its review message may already exist; a server manager must inspect /support-recovery list. The message was not deleted or sent again.'); throw error; }
      await interaction.editReply(t('Your application was sent to the configured review channel. Authorized reviewers can now review your answers.'));
    });
  }
  private async reviewApplication(interaction: ButtonInteraction<'cached'>): Promise<void> {
    const t = (source: string, params = {}) => botText(interaction.guildId, source, params, interaction.locale);
    const shared = { guildId: interaction.guildId, locale: interaction.guild?.preferredLocale };
    const g = (source: string, params = {}) => supportText(shared, source, params);
    const [, , action, id] = interaction.customId.split(':');
    if ((action !== 'accept' && action !== 'deny') || !id) throw new Error('Invalid application action.');
    await this.exclusive(interaction.guildId, async () => {
      const state = this.store.read(interaction.guildId);
      const record = state.applications.find(a => a.id === id);
      if (!record || record.channelId !== interaction.channelId || record.messageId !== interaction.message.id) throw new Error('This application does not belong to this review message.');
      const config = record.applicationForm ?? state.config.applications;
      const actor = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
      if (!isStaff(actor, config.reviewerRoleIds)) throw new Error('Only configured application reviewers may make this decision.');
      if (record.status !== 'pending') throw new Error('This application has already been reviewed.');
      if (record.operation) throw new Error('This application has an unfinished operation. A server manager must inspect /support-recovery list before another decision.');
      if (record.userId === actor.id) throw new Error('You cannot review your own application.');
      await this.textChannel(interaction.guild, record.channelId);
      let assignedRole: string | null = null;
      let applicant: GuildMember | null = null;
      let acceptedRole = null;
      if (action === 'accept' && config.acceptedRoleId) {
        applicant = await interaction.guild.members.fetch({ user: record.userId, force: true });
        const bot = await interaction.guild.members.fetchMe({ force: true });
        const role = await interaction.guild.roles.fetch(config.acceptedRoleId);
        if (!role || role.guild.id !== interaction.guildId) throw new Error('The acceptance role no longer exists in this server.');
        assertSafeRole(role, bot);
        acceptedRole = role;
      }
      if (action === 'accept') await this.store.update(interaction.guildId, data => { data.applications.find(application => application.id === id)!.operation = { id: randomUUID(), kind: 'application-accept', stage: 'role-changing', actorId: actor.id, startedAt: new Date().toISOString(), roleId: acceptedRole?.id ?? null, roleAlreadyPresent: acceptedRole ? applicant!.roles.cache.has(acceptedRole.id) : false, externalAttempted: Boolean(acceptedRole && !applicant!.roles.cache.has(acceptedRole.id)) }; });
      try {
        if (acceptedRole && applicant && !applicant.roles.cache.has(acceptedRole.id)) { await applicant.roles.add(acceptedRole, g('Application {id} accepted by {actor}', { id, actor: actor.id })); assignedRole = acceptedRole.id; }
        await this.store.update(interaction.guildId, data => { const application = data.applications.find(a => a.id === id)!; application.status = action === 'accept' ? 'accepted' : 'denied'; application.reviewedBy = actor.id; application.reviewedAt = new Date().toISOString(); application.answers = []; delete application.operation; });
      } catch (error) { if (action === 'accept') await this.markIssue(interaction.guildId, 'application', id, 'Acceptance was interrupted. The role may already have been assigned; it was not removed or granted again. A server manager must inspect /support-recovery list.'); throw error; }
      await interaction.message.edit({ components: [], content: g(action === 'accept' ? 'Accepted by <@{member}>.' : 'Declined by <@{member}>.', { member: actor.id }), allowedMentions: NONE }).catch(error => this.logger.warn('Application decision saved, but review message update failed.', { error: errorText(error) }));
      await interaction.editReply(t(action === 'accept' ? 'Application accepted.' : 'Application declined.') + (assignedRole ? t(' The configured role was assigned.') : ''));
    });
  }
}






