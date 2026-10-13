import type { AccessService } from '../control/access.js';
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, escapeMarkdown, Events, MessageFlags, PermissionFlagsBits, type Client, type Guild, type GuildMember, type PartialGuildMember, type Message, type Invite, type Interaction, type ChatInputCommandInteraction, type ButtonInteraction } from 'discord.js';
import type { Logger } from '../logger.js';
import { CommunityStore } from './store.js';
import { levelForXp, type CommunityConfig, type CommunitySnapshot, type InviteAuditEntry } from './types.js';
import { assertSafeRole, mergeConfig } from './config.js';
import { applyCount, applyInviteJoin, applyInviteLeave, awardMessageXp, MAX_MEMBERS_PER_GUILD, type InviteUse } from './logic.js';
import { appendInviteLog, departureSource, inviteReasonText, resolveInviteSource, unknownInvite } from './invite-log.js';
import { communityCommands } from './commands.js';
import { validateVerificationConfig, VerificationService } from '../verification/service.js';
import { renderMemberCard } from './member-card.js';

function tracksInvites(config: CommunityConfig): boolean { return config.invites.enabled || config.invites.loggingEnabled; }

export class CommunityService {
  private readonly store: CommunityStore;
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly inviteSnapshots = new Map<string, InviteUse[]>();
  private readonly baselines = new Map<string, symbol>();
  private readonly active = new Set<Promise<void>>();
  private attached = false;
  private stopped = false;
  private readonly verification: VerificationService;
  constructor(private readonly client: Client, dataDir: string, private readonly logger: Logger, private readonly access?: AccessService) {
    this.store = new CommunityStore(dataDir);
    this.verification = new VerificationService(client, this.store, (guildId, operation) => this.enqueue(guildId, operation), logger);
  }
  async init(): Promise<void> { await this.store.init(); }
  async guildIds(): Promise<string[]> { return this.store.guildIds(); }
  async purgeGuild(guildId: string, shouldPurge: () => boolean = () => true): Promise<void> {
    await this.enqueue(guildId, async () => {
      if (!shouldPurge()) return;
      await this.store.purgeGuild(guildId, shouldPurge);
      if (shouldPurge()) { this.invalidateInvites(guildId); this.verification.invalidateGuild(guildId); }
    });
  }
  async flush(): Promise<void> {
    await this.verification.flush();
    while (this.active.size || this.queues.size) await Promise.allSettled([...this.active, ...this.queues.values()]);
    await this.store.flush();
    if (this.stopped) { this.inviteSnapshots.clear(); this.baselines.clear(); }
  }
  private enqueue<T>(guildId: string, operation: () => Promise<T>): Promise<T> {
    const task = (this.queues.get(guildId) ?? Promise.resolve()).catch(() => undefined).then(operation);
    this.queues.set(guildId, task);
    void task.finally(() => { if (this.queues.get(guildId) === task) this.queues.delete(guildId); }).catch(() => undefined);
    return task;
  }
  private report(error: unknown): void { this.logger.error('Community operation failed.', error instanceof Error ? error.message : error); }
  private invalidateInvites(guildId: string): void { this.inviteSnapshots.delete(guildId); this.baselines.delete(guildId); }
  private readonly onMessage = (message: Message): void => {
    if (this.stopped) return;
    if (!message.guildId || message.author.bot || message.webhookId) return;
    void this.enqueue(message.guildId, () => this.processMessage(message)).catch(error => this.report(error));
  };
  private readonly onReady = (): void => {
    if (this.stopped) return;
    for (const guild of this.client.guilds.cache.values()) this.onGuildCreate(guild);
  };
  private readonly onGuildCreate = (guild: Guild): void => {
    if (this.stopped) return;
    if (!tracksInvites(this.store.config(guild.id))) return;
    void this.enqueue(guild.id, () => this.baselineInvites(guild)).catch(error => this.report(error));
  };
  private readonly onGuildDelete = (guild: Guild): void => { if (!this.stopped) this.invalidateInvites(guild.id); };
  private readonly onInviteDelete = (invite: Invite): void => { if (!this.stopped && invite.guild) this.invalidateInvites(invite.guild.id); };
  private readonly onInviteCreate = (invite: Invite): void => {
    if (this.stopped) return;
    if (invite.guild && (typeof invite.uses !== 'number' || !Number.isSafeInteger(invite.uses) || invite.uses < 0)) { this.invalidateInvites(invite.guild.id); return; }
    const before = invite.guild && this.inviteSnapshots.get(invite.guild.id);
    if (before && !before.some(value => value.code === invite.code)) before.push({ code: invite.code, uses: invite.uses!, inviterId: invite.inviterId, channelId: invite.channelId });
  };
  private readonly onMemberAdd = (member: GuildMember): void => {
    if (this.stopped) return;
    if (member.user.bot) return;
    void this.enqueue(member.guild.id, () => this.processJoin(member)).catch(error => this.report(error));
  };
  private readonly onMemberRemove = (member: GuildMember | PartialGuildMember): void => {
    if (this.stopped) return;
    if (member.user.bot) return;
    void this.enqueue(member.guild.id, () => this.processLeave(member)).catch(error => this.report(error));
  };
  private readonly onMemberUpdate = (before: GuildMember | PartialGuildMember, member: GuildMember): void => {
    if (this.stopped) return;
    if (before.pending !== true || member.pending !== false || member.user.bot) return;
    void this.enqueue(member.guild.id, () => this.applyWelcomeRoles(member)).catch(error => this.report(error));
  };
  private readonly onInteraction = (interaction: Interaction): void => {
    if (this.stopped) return;
    const command = interaction.isChatInputCommand() && communityCommands.some(builder => builder.name === interaction.commandName);
    const button = interaction.isButton() && interaction.customId.startsWith('community:role:');
    if (!command && !button) return;
    const run = async () => {
      if (!interaction.inCachedGuild()) {
        if (interaction.isRepliable()) await interaction.reply({ content: 'Use this in a Discord server.', flags: MessageFlags.Ephemeral });
        return;
      }
      if (interaction.isChatInputCommand()) await this.command(interaction);
      else if (interaction.isButton()) await this.roleButton(interaction);
    };
    const task = run().catch(async error => {
      this.report(error);
      if (!interaction.isRepliable() || interaction.replied) return;
      const content = 'I could not complete that action. Check the bot permissions and configured roles, then try again.';
      try { if (interaction.deferred) await interaction.editReply({ content }); else await interaction.reply({ content, flags: MessageFlags.Ephemeral }); } catch (replyError) { this.report(replyError); }
    });
    this.active.add(task);
    void task.finally(() => this.active.delete(task)).catch(error => this.report(error));
  };
  attach(): void {
    if (this.attached || this.stopped) return;
    this.attached = true;
    this.verification.attach();
    this.client.on(Events.MessageCreate, this.onMessage);
    this.client.on(Events.ClientReady, this.onReady);
    this.client.on(Events.GuildCreate, this.onGuildCreate);
    this.client.on(Events.GuildDelete, this.onGuildDelete);
    this.client.on(Events.GuildAvailable, this.onGuildCreate);
    this.client.on(Events.GuildUnavailable, this.onGuildDelete);
    this.client.on(Events.GuildMemberAdd, this.onMemberAdd);
    this.client.on(Events.GuildMemberRemove, this.onMemberRemove);
    this.client.on(Events.GuildMemberUpdate, this.onMemberUpdate);
    this.client.on(Events.InviteCreate, this.onInviteCreate);
    this.client.on(Events.InviteDelete, this.onInviteDelete);
    this.client.on(Events.InteractionCreate, this.onInteraction);
    if (this.client.isReady()) this.onReady();
  }
  stop(): void {
    this.stopped = true;
    this.verification.stop();
    if (!this.attached) return;
    this.attached = false;
    this.client.off(Events.MessageCreate, this.onMessage);
    this.client.off(Events.ClientReady, this.onReady);
    this.client.off(Events.GuildCreate, this.onGuildCreate);
    this.client.off(Events.GuildDelete, this.onGuildDelete);
    this.client.off(Events.GuildAvailable, this.onGuildCreate);
    this.client.off(Events.GuildUnavailable, this.onGuildDelete);
    this.client.off(Events.GuildMemberAdd, this.onMemberAdd);
    this.client.off(Events.GuildMemberRemove, this.onMemberRemove);
    this.client.off(Events.GuildMemberUpdate, this.onMemberUpdate);
    this.client.off(Events.InviteCreate, this.onInviteCreate);
    this.client.off(Events.InviteDelete, this.onInviteDelete);
    this.client.off(Events.InteractionCreate, this.onInteraction);
  }
  async updateConfig(guildId: string, input: unknown): Promise<CommunityConfig> {
    if (this.stopped) throw new Error('Community service is stopping.');
    return this.enqueue(guildId, async () => {
      const previousConfig = this.store.config(guildId);
      const config = mergeConfig(previousConfig, input);
      const guild = await this.client.guilds.fetch(guildId);
      await this.validateConfig(guild, config);
      // Seed members before enabling so leave/rejoin loops cannot claim pre-existing members.
      if (tracksInvites(config) && (!this.inviteSnapshots.has(guildId) || (config.invites.enabled && !previousConfig.invites.enabled))) await this.baselineInvites(guild);
      await this.store.mutate(guildId, state => {
        if (state.config.counting.channelId !== config.counting.channelId) { state.counting.current = 0; state.counting.lastUserId = null; state.counting.recentMessageIds = []; }
        const before = state.config.verification, after = config.verification;
        if (before.enabled !== after.enabled || before.channelId !== after.channelId || before.roleId !== after.roleId || before.mode !== after.mode) {
          state.verificationPanel = null;
          this.verification.invalidateGuild(guildId);
        }
        state.config = config;
      });
      if (!tracksInvites(config)) this.invalidateInvites(guildId);
      return config;
    });
  }
  private async validateConfig(guild: Guild, config: CommunityConfig): Promise<void> {
    const bot = await guild.members.fetchMe();
    for (const [enabled, id, reactions] of [[config.counting.enabled, config.counting.channelId, true], [config.welcome.enabled, config.welcome.channelId, false]] as const) {
      if (!enabled || !id) continue;
      const channel = await guild.channels.fetch(id);
      if (!channel || channel.guildId !== guild.id || !channel.isTextBased() || channel.isThread()) throw new Error('Select a text channel in this server.');
      const required = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, ...(reactions ? [PermissionFlagsBits.AddReactions, PermissionFlagsBits.ReadMessageHistory] : [])];
      if (!channel.permissionsFor(bot)?.has(required)) throw new Error('The bot needs View Channel, Send Messages, and counting reaction/history permissions in the selected channel.');
      if (!reactions && [config.welcome.joinFormat, config.welcome.goodbyeFormat].some(format => format === 'card' || format === 'both') && !channel.permissionsFor(bot)?.has(PermissionFlagsBits.AttachFiles)) throw new Error('The bot needs Attach Files in the welcome channel to send image cards.');
    }
    const ids = [...new Set([...config.welcome.autoRoleIds, ...config.selfRoles.roles.map(role => role.roleId)])];
    if (ids.length) {
      if (!bot.permissions.has(PermissionFlagsBits.ManageRoles)) throw new Error('The bot needs Manage Roles for automatic and self roles.');
      const roles = await guild.roles.fetch();
      for (const id of ids) { const role = roles.get(id); if (!role) throw new Error('A configured role does not exist in this server.'); assertSafeRole(role); }
    }
    if (tracksInvites(config) && !bot.permissions.has(PermissionFlagsBits.ManageGuild)) throw new Error('The bot needs Manage Server to track invite uses.');
    if (config.invites.loggingEnabled && config.invites.logChannelId) {
      const channel = await guild.channels.fetch(config.invites.logChannelId);
      if (!channel || channel.guildId !== guild.id || channel.type !== ChannelType.GuildText) throw new Error('Select a regular text channel in this server for the invite log.');
      if (!channel.permissionsFor(bot)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) throw new Error('The bot needs View Channel, Send Messages and Embed Links in the invite log channel.');
    }
    await validateVerificationConfig(guild, config);
  }
  private async processMessage(message: Message): Promise<void> {
    const guildId = message.guildId!;
    const config = this.store.config(guildId);
    const count = config.counting.enabled && config.counting.channelId === message.channelId && /^\d+$/.test(message.content.trim());
    const now = Date.now();
    const previousAward = this.store.level(guildId, message.author.id)?.lastAwardAt;
    const xp = config.levels.enabled && message.content.trim().length >= 3 && (previousAward === undefined || now - previousAward >= 60_000);
    if (!count && !xp) return;
    const result = await this.store.mutate(guildId, state => {
      if (xp) awardMessageXp(state, message.author.id, now);
      return count ? applyCount(state, message.content, message.author.id, message.id) : { kind: 'ignored' as const };
    });
    if (result.kind === 'correct') await message.react('✅');
    else if (result.kind === 'wrong') {
      await message.react('❌');
      await message.reply({ content: result.reason === 'same-user' ? 'Take turns! The count resets. Start again at **1**.' : `The next number was **${result.expected}**. The count resets. Start again at **1**.`, allowedMentions: { parse: [], repliedUser: false } });
    }
  }
  private async fetchInvites(guild: Guild): Promise<InviteUse[]> {
    const invites = await guild.invites.fetch();
    return [...invites.values()].map(invite => {
      if (typeof invite.uses !== 'number' || !Number.isSafeInteger(invite.uses) || invite.uses < 0) throw new Error('Discord did not return reliable invite usage counts. Check Manage Server permission.');
      return { code: invite.code, uses: invite.uses, inviterId: invite.inviterId, channelId: invite.channelId };
    });
  }
  private async baselineInvites(guild: Guild): Promise<void> {
    this.inviteSnapshots.delete(guild.id);
    const token = Symbol();
    this.baselines.set(guild.id, token);
    const valid = () => this.baselines.get(guild.id) === token && guild.available !== false;
    try {
      if (guild.memberCount > MAX_MEMBERS_PER_GUILD) throw new Error('Invite tracking supports up to 100000 members per server in this single-process edition.');
      const members = await guild.members.fetch();
      const invites = await this.fetchInvites(guild);
      if (!valid()) return;
      await this.store.mutate(guild.id, state => {
        if (!valid()) return;
        for (const memberId of Object.keys(state.inviteMembers)) if (!members.has(memberId)) applyInviteLeave(state, memberId);
        for (const member of members.values()) if (!member.user.bot) applyInviteJoin(state, member.id, null);
      });
      if (valid()) this.inviteSnapshots.set(guild.id, invites);
    } finally { if (this.baselines.get(guild.id) === token) this.baselines.delete(guild.id); }
  }
  private async processJoin(member: GuildMember): Promise<void> {
    const config = this.store.config(member.guild.id);
    if (tracksInvites(config)) {
      let source = unknownInvite('no-baseline');
      let attributionSnapshot: InviteUse[] | undefined;
      try {
        const before = this.inviteSnapshots.get(member.guild.id);
        if (!before) await this.baselineInvites(member.guild);
        else {
          const after = await this.fetchInvites(member.guild);
          if (this.inviteSnapshots.get(member.guild.id) === before && member.guild.available !== false) {
            source = resolveInviteSource(before, after);
            this.inviteSnapshots.set(member.guild.id, after);
            attributionSnapshot = after;
          }
        }
      } catch (error) { this.inviteSnapshots.delete(member.guild.id); source = unknownInvite('fetch-failed'); this.report(error); }
      if (attributionSnapshot && (this.inviteSnapshots.get(member.guild.id) !== attributionSnapshot || member.guild.available === false)) source = unknownInvite('no-baseline');
      const entry = await this.store.mutate(member.guild.id, state => {
        if (config.invites.enabled) applyInviteJoin(state, member.id, source.inviterId);
        if (!config.invites.loggingEnabled) return null;
        return appendInviteLog(state, { ...source, event: 'joined', memberId: member.id, memberName: this.inviteMemberName(member), joinedAt: member.joinedTimestamp ?? null, referralInviterId: state.inviteMembers[member.id]?.inviterId ?? null, at: Date.now() });
      });
      if (entry) await this.sendInviteLog(member.guild, entry);
    }
    if (config.welcome.enabled) {
      await this.applyWelcomeRoles(member);
      await this.sendWelcome(member, true);
    }
  }
  private async applyWelcomeRoles(member: GuildMember): Promise<void> {
    const config = this.store.config(member.guild.id);
    if (!config.welcome.enabled || member.pending) return;
    for (const roleId of config.welcome.autoRoleIds) {
      if (config.verification.enabled && config.verification.roleId === roleId) continue;
      try {
        const role = await member.guild.roles.fetch(roleId, { force: true });
        if (!role) continue;
        assertSafeRole(role);
        await member.roles.add(role, 'Configured welcome role');
      } catch (error) { this.report(error); }
    }
  }
  private async processLeave(member: GuildMember | PartialGuildMember): Promise<void> {
    const config = this.store.config(member.guild.id);
    if (config.invites.loggingEnabled || this.store.activeInviteMember(member.guild.id, member.id)) {
      const entry = await this.store.mutate(member.guild.id, guild => {
        applyInviteLeave(guild, member.id);
        if (!config.invites.loggingEnabled) return null;
        const joinedAt = member.joinedTimestamp ?? null;
        return appendInviteLog(guild, { ...departureSource(guild, member.id, joinedAt), event: 'left', memberId: member.id, memberName: this.inviteMemberName(member), joinedAt, referralInviterId: guild.inviteMembers[member.id]?.inviterId ?? null, at: Date.now() });
      });
      if (entry) await this.sendInviteLog(member.guild, entry);
    }
    if (config.welcome.enabled && config.welcome.goodbyeFormat !== 'off' && (config.welcome.goodbyeMessage || config.welcome.goodbyeFormat !== 'text')) await this.sendWelcome(member, false);
  }
  private inviteMemberName(member: GuildMember | PartialGuildMember): string {
    return (member.displayName || member.user.globalName || member.user.username || member.id).slice(0, 100);
  }
  private async sendInviteLog(guild: Guild, entry: InviteAuditEntry): Promise<void> {
    const config = this.store.config(guild.id).invites;
    if (!config.loggingEnabled || !config.logChannelId) return;
    // The durable dashboard history survives delivery failures. Never replay a send after an uncertain result.
    try {
      const channel = await guild.channels.fetch(config.logChannelId);
      const bot = await guild.members.fetchMe();
      if (!channel || channel.guildId !== guild.id || channel.type !== ChannelType.GuildText || !channel.permissionsFor(bot)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) throw new Error('The invite log channel is missing or the bot cannot send embeds there.');
      const embed = new EmbedBuilder().setColor(entry.event === 'joined' ? 0x63D7FF : 0x8CA2B8).setTitle(entry.event === 'joined' ? 'Member joined' : 'Member left')
        .setDescription(`${escapeMarkdown(entry.memberName)} (<@${entry.memberId}>)`).setTimestamp(entry.at)
        .addFields({ name: 'Member ID', value: entry.memberId }, { name: entry.event === 'left' ? 'Last observed join source' : 'Join source', value: entry.source === 'invite' ? `Invite code: ${escapeMarkdown(entry.inviteCode!)}\nCreated by: ${entry.inviterId ? `<@${entry.inviterId}> (${entry.inviterId})` : 'Unknown'}${entry.inviteChannelId ? `\nInvite channel: <#${entry.inviteChannelId}>` : ''}` : 'Unknown' }, { name: 'Attribution', value: inviteReasonText[entry.reason] })
        .setFooter({ text: 'Invite attribution is best effort. No new challenge credit is awarded by logging.' });
      if (entry.referralInviterId && entry.referralInviterId !== entry.inviterId) embed.addFields({ name: 'Original challenge referral', value: `<@${entry.referralInviterId}> (separate from this join source)` });
      await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) { this.report(error); }
  }
  private async sendWelcome(member: GuildMember | PartialGuildMember, ping: boolean): Promise<void> {
    const config = this.store.config(member.guild.id).welcome;
    const channelId = config.channelId;
    if (!channelId) return;
    const channel = await member.guild.channels.fetch(channelId);
    if (!channel?.isTextBased() || channel.guildId !== member.guild.id || !('send' in channel)) return;
    const format = ping ? config.joinFormat : config.goodbyeFormat;
    if (format === 'off') return;
    const template = (ping ? config.message : config.goodbyeMessage) || (ping ? 'Welcome {user} to {server}!' : '{user} has left {server}.');
    const content = template.replaceAll('{user}', `<@${member.id}>`).replaceAll('{server}', member.guild.name).replaceAll('{count}', String(member.guild.memberCount)).slice(0, 2000);
    let attachment: AttachmentBuilder | undefined;
    if (format === 'card' || format === 'both') {
      try {
        const bot = await member.guild.members.fetchMe();
        if (!channel.permissionsFor(bot)?.has(PermissionFlagsBits.AttachFiles)) throw new Error('Attach Files permission is missing.');
        const displayName = member.displayName || member.user.globalName || member.user.username || 'A community member';
        const image = await renderMemberCard({ kind: ping ? 'join' : 'leave', displayName, serverName: member.guild.name, memberCount: member.guild.memberCount, avatarUrl: member.displayAvatarURL?.({ extension: 'png', size: 256, forceStatic: true }), settings: config.card });
        attachment = new AttachmentBuilder(image, { name: ping ? 'cyro-welcome.png' : 'cyro-goodbye.png', description: `${displayName} ${ping ? 'joined' : 'left'} ${member.guild.name}. ${member.guild.memberCount} members.`.slice(0, 1000) });
      } catch (error) {
        this.logger.warn('Member image card unavailable; sending the text greeting.', { guildId: member.guild.id, reason: error instanceof Error ? error.message : 'Rendering failed' });
      }
    }
    // Only fall back before sending; never duplicate a message after an uncertain Discord response.
    await channel.send({ ...(format !== 'card' || !attachment ? { content } : {}), ...(attachment ? { files: [attachment] } : {}), allowedMentions: { parse: [], users: ping ? [member.id] : [] } });
  }
  private async command(interaction: ChatInputCommandInteraction<'cached'>): Promise<void> {
    await interaction.deferReply(interaction.commandName === 'roles-panel' ? {} : { flags: MessageFlags.Ephemeral });
    await this.access?.command(interaction.guild, interaction.user.id, interaction.commandName, interaction.commandName !== 'roles-panel' || interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild));
    const state = this.store.get(interaction.guildId);
    if (interaction.commandName === 'roles-panel') {
      if (!this.access && !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) { await interaction.editReply({ content: 'You need Manage Server permission to publish a roles panel.' }); return; }
      if (!state.config.selfRoles.roles.length) { await interaction.editReply({ content: 'Configure self roles in the dashboard first.' }); return; }
      const channel = await interaction.guild.channels.fetch(interaction.channelId);
      const bot = await interaction.guild.members.fetchMe();
      if (!channel?.permissionsFor(bot)?.has(PermissionFlagsBits.EmbedLinks)) { await interaction.editReply({ content: 'The bot needs Embed Links in this channel to publish a roles panel.' }); return; }
      const roles = await interaction.guild.roles.fetch();
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      for (const [index, configured] of state.config.selfRoles.roles.entries()) {
        const role = roles.get(configured.roleId);
        if (!role) throw new Error('Configured self role no longer exists.');
        assertSafeRole(role);
        if (index % 5 === 0) rows.push(new ActionRowBuilder<ButtonBuilder>());
        rows.at(-1)!.addComponents(new ButtonBuilder().setCustomId(`community:role:${interaction.guildId}:${configured.roleId}`).setLabel(configured.label).setStyle(ButtonStyle.Secondary));
      }
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x82d9f7).setTitle('Choose your roles').setDescription('Click a button to add its role. Click it again to remove the role.')], components: rows, allowedMentions: { parse: [] } });
      return;
    }
    let content: string;
    if (interaction.commandName === 'counting') {
      content = state.config.counting.enabled ? `Counting in <#${state.config.counting.channelId}>\nCurrent: **${state.counting.current}** · Record: **${state.counting.best}**\nNext number: **${state.counting.current + 1}**. Send only a whole number, take turns, and keep the chain going. A wrong number or two turns in a row resets to 1. Edits do not count.` : 'Counting is disabled. A server manager can enable it in the dashboard.';
    } else if (interaction.commandName === 'invites') {
      const score = state.inviteScores[interaction.user.id] ?? { active: 0, total: 0 };
      const leaders = (await this.snapshot(interaction.guildId)).inviteLeaderboard.slice(0, 10);
      content = state.config.invites.enabled ? `**${state.config.invites.challengeName}**\nYour progress: **${score.active}/${state.config.invites.challengeTarget}** active unique members ${score.active >= state.config.invites.challengeTarget ? '🏆' : ''}\nTotal unique referrals: **${score.total}**\n\n${leaders.map((entry, index) => `${index + 1}. <@${entry.userId}> — ${entry.active} active`).join('\n') || 'No attributed invites yet.'}\n\nExisting, ambiguous, vanity, and expired invite joins receive no new credit. Departures reduce active referrals; rejoining never increases total referrals.` : state.config.invites.loggingEnabled ? 'Invite challenges are disabled. Staff invite logging is active; authorized staff can view it in the dashboard or configured log channel.' : 'Invite challenges are disabled. A server manager can enable challenges or separate staff invite logging in the dashboard.';
    } else if (interaction.commandName === 'rank') {
      const xp = state.levels[interaction.user.id]?.xp ?? 0;
      content = state.config.levels.enabled ? `Your level: **${levelForXp(xp)}** · XP: **${xp}**\nNext level at **${100 * (levelForXp(xp) + 1) ** 2} XP**. Chat naturally: eligible messages earn 10 XP at most once each minute.` : 'Chat levels are disabled. A server manager can enable them in the dashboard.';
    } else {
      const leaders = (await this.snapshot(interaction.guildId)).levelLeaderboard.slice(0, 10);
      content = state.config.levels.enabled ? `**Community activity**\n${leaders.map((entry, index) => `${index + 1}. <@${entry.userId}> — level ${entry.level} · ${entry.xp} XP`).join('\n') || 'No activity recorded yet.'}` : 'Chat levels are disabled. A server manager can enable them in the dashboard.';
    }
    await interaction.editReply({ content, allowedMentions: { parse: [] } });
  }
  private async roleButton(interaction: ButtonInteraction<'cached'>): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await this.enqueue(interaction.guildId, async () => {
      const [, , guildId, roleId] = interaction.customId.split(':');
      const config = this.store.config(interaction.guildId);
      if (guildId !== interaction.guildId || !roleId || !config.selfRoles.roles.some(role => role.roleId === roleId) || (config.verification.enabled && config.verification.roleId === roleId)) { await interaction.editReply({ content: 'This role is no longer available. Ask a server manager to publish a new panel.' }); return; }
      await interaction.guild.members.fetchMe();
      const role = await interaction.guild.roles.fetch(roleId, { force: true });
      if (!role) throw new Error('Role no longer exists.');
      assertSafeRole(role);
      const member = await interaction.guild.members.fetch({ user: interaction.user.id, force: true });
      if (member.pending) { await interaction.editReply({ content: 'Complete the server membership screening before choosing roles.' }); return; }
      const remove = member.roles.cache.has(roleId);
      if (remove) await member.roles.remove(roleId, 'Self-role panel');
      else await member.roles.add(roleId, 'Self-role panel');
      await interaction.editReply({ content: `${remove ? 'Removed' : 'Added'} <@&${roleId}>.`, allowedMentions: { parse: [] } });
    });
  }
  async getConfig(guildId: string): Promise<CommunityConfig> { return this.store.config(guildId); }
  async publishVerificationPanel(guildId: string): Promise<{ channelId: string; messageId: string; url: string }> { return this.verification.publishPanel(guildId); }
  async snapshot(guildId: string): Promise<CommunitySnapshot> {
    const state = this.store.get(guildId);
    return {
      config: state.config,
      verificationPanel: state.verificationPanel,
      counting: { current: state.counting.current, best: state.counting.best, lastUserId: state.counting.lastUserId },
      inviteLeaderboard: Object.entries(state.inviteScores).map(([userId, score]) => ({ userId, ...score })).sort((a, b) => b.active - a.active || b.total - a.total || a.userId.localeCompare(b.userId)).slice(0, 25),
      inviteLog: state.inviteLog.slice(-250).reverse(),
      levelLeaderboard: Object.entries(state.levels).map(([userId, value]) => ({ userId, xp: value.xp, level: levelForXp(value.xp) })).sort((a, b) => b.xp - a.xp || a.userId.localeCompare(b.userId)).slice(0, 25),
      inviteTracking: { ready: tracksInvites(state.config) && this.inviteSnapshots.has(guildId), note: !tracksInvites(state.config) ? 'Invite tracking is disabled. Retained history remains available.' : this.inviteSnapshots.has(guildId) ? 'Invite attribution is best effort. Ambiguous, vanity, and deleted invite joins are unknown. Logging works independently of challenges; it does not award referral credit.' : 'Waiting for a valid invite/member baseline. Check Manage Server permission and Server Members intent. Joins remain unattributed until ready.' },
    };
  }
}
