import { ApplicationCommandType, ChannelType, Events, MessageFlags, PermissionFlagsBits, escapeMarkdown, type Client, type Guild, type Interaction } from 'discord.js';
import { createRegistrationPlan } from '../commands/register.js';
import { botText, BotMessageError } from '../i18n/index.js';
import type { Logger } from '../logger.js';
import { CustomCommandStore } from './store.js';
import { commandId, fields, MAX_CUSTOM_COMMANDS, parseCommand, renderTemplate, type CommandRecord } from './types.js';

export const RESERVED_COMMANDS = new Set(createRegistrationPlan({ discordClientId: '0', commandScope: 'global' }).body.map(c => c.name));
export const COMMAND_CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildStageVoice, ChannelType.GuildForum, ChannelType.GuildMedia];
export class CustomCommandsService {
  private readonly store: CustomCommandStore;
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly active = new Set<Promise<void>>();
  private stopped = false;
  private attached = false;
  constructor(private readonly client: Client, directory: string, private readonly logger: Logger) { this.store = new CustomCommandStore(directory); }
  async init() { await this.store.init(); }
  snapshot(guildId: string) { return { commands: this.store.get(guildId), limit: MAX_CUSTOM_COMMANDS, reservedNames: [...RESERVED_COMMANDS] }; }
  async guildIds() { return this.store.guildIds(); }
  async purgeGuild(id: string, guard: () => boolean = () => true) { await this.enqueue(id, () => this.store.purgeGuild(id, guard)); }
  private enqueue<T>(id: string, fn: () => Promise<T>): Promise<T> {
    const task = (this.queues.get(id) ?? Promise.resolve()).catch(() => undefined).then(fn); this.queues.set(id, task);
    void task.finally(() => { if (this.queues.get(id) === task) this.queues.delete(id); }).catch(() => undefined); return task;
  }
  private running() { if (this.stopped) throw new BotMessageError('Custom commands are stopping. Please try again shortly.'); }
  async change(guild: Guild, input: unknown, authorize: () => Promise<void>) {
    this.running();
    if (!fields(input, ['action','command','id','revision']) || !['save','delete','sync'].includes(String(input.action))) throw new BotMessageError('Invalid custom command request.');
    const config = input.action === 'save' ? parseCommand(input.command) : null;
    const id = config?.id ?? input.id, revision = config?.revision ?? input.revision;
    if (!commandId(id) || !Number.isSafeInteger(revision) || (revision as number) < 0) throw new BotMessageError('Invalid custom command request.');
    return this.enqueue(guild.id, async () => {
      this.running(); await authorize();
      let existing = this.store.get(guild.id).find(c => c.id === id);
      if ((existing?.revision ?? 0) !== revision) throw new BotMessageError('This command changed in another session. Refresh before editing it.');
      if (config) {
        if (RESERVED_COMMANDS.has(config.name)) throw new BotMessageError('That name is reserved for a built-in Cyro command.');
        if (!existing && this.store.get(guild.id).length >= MAX_CUSTOM_COMMANDS) throw new BotMessageError('This server has reached the limit of 25 custom commands.');
        if (this.store.get(guild.id).some(c => c.id !== id && c.name === config.name)) throw new BotMessageError('A command with that name already exists in this server.');
        if (existing?.status === 'deleting') throw new BotMessageError('Finish syncing this command before changing it.');
        // Resolve an uncertain create before allowing its name to change, so it cannot leave an orphan command.
        if (existing && !existing.discordId) {
          await this.synchronize(guild, existing); existing = this.store.get(guild.id).find(c => c.id === id);
          if (!existing?.discordId) throw new BotMessageError('Finish syncing this command before changing it.');
        }
        for (const channelId of config.channelIds) {
          const channel = await guild.channels.fetch(channelId);
          if (!channel || channel.guildId !== guild.id || !COMMAND_CHANNEL_TYPES.includes(channel.type as never)) throw new BotMessageError('Choose channels belonging to this server.');
        }
        const remote = await guild.commands.fetch();
        if (remote.some(c => c.type === ApplicationCommandType.ChatInput && c.name === config.name && c.id !== existing?.discordId)) throw new BotMessageError('A command with that name already exists in this server.');
        await authorize(); this.running();
        const record: CommandRecord = { ...config, revision: config.revision + 1, discordId: existing?.discordId ?? null, status: 'pending' };
        await this.store.mutate(guild.id, rows => { const index = rows.findIndex(c => c.id === id); if (index < 0) rows.push(record); else rows[index] = record; });
      } else {
        if (!existing) throw new BotMessageError('That custom command no longer exists.');
        await authorize(); this.running();
        if (input.action === 'delete') await this.store.mutate(guild.id, rows => { const c = rows.find(c => c.id === id)!; c.status = 'deleting'; c.revision++; });
      }
      await this.synchronize(guild, this.store.get(guild.id).find(c => c.id === id)!);
      return this.snapshot(guild.id);
    });
  }
  private async synchronize(guild: Guild, record: CommandRecord): Promise<void> {
    try {
      const remote = await guild.commands.fetch();
      let command = record.discordId ? remote.get(record.discordId) : remote.find(c => c.type === ApplicationCommandType.ChatInput && c.name === record.name);
      if (record.status === 'deleting') {
        if (command) await guild.commands.delete(command.id);
        await this.store.mutate(guild.id, rows => { rows.splice(rows.findIndex(c => c.id === record.id), 1); }); return;
      }
      if (RESERVED_COMMANDS.has(record.name)) throw new Error('Reserved command');
      if (remote.some(c => c.type === ApplicationCommandType.ChatInput && c.name === record.name && c.id !== command?.id)) throw new Error('Command name collision');
      const body = { name: record.name, description: record.description, type: ApplicationCommandType.ChatInput as const, options: [], defaultMemberPermissions: null, nsfw: false };
      // Per-command writes preserve every built-in and unrelated guild command. Never bulk overwrite here.
      if (command) { if (command.name !== body.name || command.description !== body.description || command.options.length) command = await guild.commands.edit(command.id, body); }
      else command = await guild.commands.create(body);
      const discordId = command.id;
      await this.store.mutate(guild.id, rows => { Object.assign(rows.find(c => c.id === record.id)!, { discordId, status: 'synced' }); });
    } catch {
      // Persist desired state first; a fetch on retry/restart reconciles uncertain creates and deletes.
      await this.store.mutate(guild.id, rows => { const row = rows.find(c => c.id === record.id); if (row && row.status !== 'deleting') row.status = 'error'; });
      this.logger.warn('Custom command sync needs retry.', { guildId: guild.id, commandId: record.id });
    }
  }
  async reconcile(): Promise<void> {
    for (const id of await this.store.guildIds()) {
      if (this.stopped) return;
      const guild = this.client.guilds.cache.get(id); if (!guild?.available) continue;
      await this.enqueue(id, async () => { for (const record of this.store.get(id)) { if (this.stopped) return; await this.synchronize(guild, record); } });
    }
  }
  attach() { if (!this.attached && !this.stopped) { this.attached = true; this.client.on(Events.InteractionCreate, this.onInteraction); } }
  stop() { this.stopped = true; this.client.off(Events.InteractionCreate, this.onInteraction); this.attached = false; }
  async flush() { while (this.queues.size || this.active.size) await Promise.allSettled([...this.queues.values(), ...this.active]); await this.store.flush(); }
  private readonly onInteraction = (interaction: Interaction) => {
    if (this.stopped) return;
    const task = this.handle(interaction).catch(() => this.logger.warn('Custom command reply failed.'));
    this.active.add(task); void task.finally(() => this.active.delete(task));
  };
  async handle(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand() || RESERVED_COMMANDS.has(interaction.commandName) || !interaction.inCachedGuild()) return;
    const record = this.store.get(interaction.guildId).find(c => c.discordId === interaction.commandId && c.name === interaction.commandName);
    const privateReply = (text: string) => interaction.reply({ content: text, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    const text = (source: string, params = {}) => botText(interaction.guildId, source, params, interaction.locale);
    if (!record || record.status !== 'synced') { await privateReply(text('This custom command is being updated or has been removed. Please try again shortly.')); return; }
    if (interaction.member.pending) { await privateReply(text('Complete server membership screening first.')); return; }
    const parentId = interaction.channel?.isThread() ? interaction.channel.parentId : null;
    if (record.channelIds.length && !record.channelIds.includes(interaction.channelId) && (!parentId || !record.channelIds.includes(parentId))) {
      const visible = record.channelIds.filter(id => interaction.guild.channels.cache.get(id)?.permissionsFor(interaction.member)?.has(PermissionFlagsBits.ViewChannel));
      await privateReply(visible.length ? text('Use this command in: {channels}', { channels: visible.map(id => `<#${id}>`).join(', ') }) : text('This command is limited to channels you cannot currently view. Ask server staff where to use it.')); return;
    }
    if (record.mode === 'embed' && !interaction.appPermissions?.has(PermissionFlagsBits.EmbedLinks)) { await privateReply(text('Cyro needs Embed Links in this channel to show this command.')); return; }
    const values = { mention: `<@${interaction.user.id}>`, server: escapeMarkdown(interaction.guild.name), user: escapeMarkdown(interaction.user.username), channel: `<#${interaction.channelId}>` };
    const reply = record.mode === 'text' ? { content: renderTemplate(record.content, values, 2000) } : { embeds: [{ title: record.title ? renderTemplate(record.title, values, 256) : undefined, description: renderTemplate(record.content, values, 4096), color: parseInt(record.color.slice(1),16) }] };
    await interaction.reply({ ...reply, ...(record.ephemeral ? { flags: MessageFlags.Ephemeral } : {}), allowedMentions: { parse: [], users: [interaction.user.id], repliedUser: false } });
  }
}
