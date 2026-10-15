import { randomUUID } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Events, MessageFlags, PermissionFlagsBits, type Client, type Guild, type GuildMember, type Interaction, type NewsChannel, type TextChannel } from 'discord.js';
import type { AccessService } from '../control/access.js';
import type { Logger } from '../logger.js';
import { botError, botNumber, botText, BotMessageError } from '../i18n/index.js';
import { TimeClockStore } from './store.js';
import { emptyTimeClockMember, INTERACTION_MAX_AGE_MS, MAX_PANELS, MAX_RECEIPTS, panelOperationId, parseTimeClockConfig, snowflake, timeClockRow, type TimeClockRow } from './types.js';

type ClockChannel = TextChannel | NewsChannel;
const interactionTime = (id: string) => Number((BigInt(id) >> 22n) + 1420070400000n);
const panelResult = (guildId: string, channelId: string, messageId: string) => ({ messageUrl: `https://discord.com/channels/${guildId}/${channelId}/${messageId}` });

export class TimeClockService {
  private readonly store: TimeClockStore;
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly active = new Set<Promise<void>>();
  private stopped = false;
  private attached = false;
  constructor(private readonly client: Client, dataDir: string, private readonly logger: Logger, private readonly access: AccessService) { this.store = new TimeClockStore(dataDir); }
  async init(): Promise<void> { await this.store.init(); }
  getConfig(guildId: string) { return this.store.get(guildId).config; }
  snapshot(guildId: string) {
    const state = this.store.get(guildId), asOf = Date.now();
    const members = Object.entries(state.members).map(([id, member]) => timeClockRow(id, member, asOf)).sort((a, b) => b.totalMs - a.totalMs || a.userId.localeCompare(b.userId));
    return { config: state.config, members, counts: { members: members.length, active: members.filter(member => member.startedAt !== null).length, totalMs: members.reduce((sum, member) => sum + member.totalMs, 0) }, asOf };
  }
  private enqueue<T>(guildId: string, operation: () => Promise<T>): Promise<T> {
    const task = (this.queues.get(guildId) ?? Promise.resolve()).catch(() => undefined).then(operation);
    this.queues.set(guildId, task);
    void task.finally(() => { if (this.queues.get(guildId) === task) this.queues.delete(guildId); }).catch(() => undefined);
    return task;
  }
  private assertRunning(): void { if (this.stopped) throw new BotMessageError('The time clock is stopping. Please try again shortly.'); }
  async guildIds(): Promise<string[]> { return this.store.guildIds(); }
  async purgeGuild(guildId: string, guard: () => boolean = () => true): Promise<void> { await this.enqueue(guildId, () => this.store.purgeGuild(guildId, guard)); }
  async flush(): Promise<void> { while (this.queues.size || this.active.size) await Promise.allSettled([...this.queues.values(), ...this.active]); await this.store.flush(); }
  attach(): void { if (!this.attached && !this.stopped) { this.attached = true; this.client.on(Events.InteractionCreate, this.onInteraction); } }
  stop(): void { this.stopped = true; if (this.attached) { this.attached = false; this.client.off(Events.InteractionCreate, this.onInteraction); } }
  private async member(guild: Guild, userId: string): Promise<GuildMember> {
    if (!snowflake(guild.id) || !snowflake(userId)) throw new BotMessageError('Only members of this server can use its time clock.');
    const member = await this.access.member(guild, userId);
    if (!member || member.guild.id !== guild.id || member.id !== userId || member.user.bot) throw new BotMessageError('Only members of this server can use its time clock.');
    if (member.pending) throw new BotMessageError('Complete server membership screening first.');
    return member;
  }
  private assertFresh(operationId: string): void {
    if (!snowflake(operationId)) throw new BotMessageError('This time clock request has expired. Run the command or press the button again.');
    const age = Date.now() - interactionTime(operationId);
    if (age > INTERACTION_MAX_AGE_MS || age < -60_000) throw new BotMessageError('This time clock request has expired. Run the command or press the button again.');
  }
  private async channel(guild: Guild, channelId: string, actor?: GuildMember): Promise<ClockChannel> {
    const channel = await guild.channels.fetch(channelId);
    if (!channel || channel.id !== channelId || channel.guild.id !== guild.id || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) throw new BotMessageError('Choose a text or announcement channel in this server.');
    if (actor && !channel.permissionsFor(actor)?.has(PermissionFlagsBits.ViewChannel)) throw new BotMessageError('You cannot view this server’s time clock channel.');
    const bot = await guild.members.fetchMe();
    if (!channel.permissionsFor(bot)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) throw new BotMessageError('Cyro needs View Channel, Send Messages, and Embed Links in the time clock channel.');
    return channel as ClockChannel;
  }
  async configure(guild: Guild, input: unknown, authorize?: () => Promise<void>) {
    this.assertRunning(); const config = parseTimeClockConfig(input);
    if (!snowflake(guild.id)) throw new BotMessageError('That server is unavailable.');
    return this.enqueue(guild.id, async () => {
      if (config.channelId) await this.channel(guild, config.channelId);
      await guild.roles.fetch();
      for (const id of config.roleIds) {
        const role = guild.roles.cache.get(id);
        if (!role || role.guild.id !== guild.id || role.id !== id || id === guild.id || role.managed) throw new BotMessageError('Time clock roles must be regular roles belonging to this server.');
      }
      if (authorize) await authorize();
      this.assertRunning();
      return this.store.mutate(guild.id, state => { state.config = config; return config; });
    });
  }
  async updateConfig(guildId: string, input: unknown, authorize?: () => Promise<void>) {
    this.assertRunning();
    if (!snowflake(guildId)) throw new BotMessageError('That server is unavailable.');
    const guild = await this.client.guilds.fetch(guildId);
    if (guild.id !== guildId) throw new BotMessageError('That server is unavailable.');
    return this.configure(guild, input, authorize);
  }
  async clockIn(guild: Guild, userId: string, operationId: string): Promise<TimeClockRow> { return this.transition(guild, userId, operationId, 'in'); }
  async clockOut(guild: Guild, userId: string, operationId: string): Promise<TimeClockRow> { return this.transition(guild, userId, operationId, 'out'); }
  private async transition(guild: Guild, userId: string, operationId: string, action: 'in' | 'out'): Promise<TimeClockRow> {
    this.assertRunning(); this.assertFresh(operationId);
    return this.enqueue(guild.id, async () => {
      this.assertRunning(); this.assertFresh(operationId);
      await this.member(guild, userId); const saved = this.store.get(guild.id);
      const receipt = saved.receipts.find(item => item.id === operationId);
      if (receipt) {
        if (receipt.userId !== userId || receipt.action !== action) throw new BotMessageError('That time clock request belongs to a different action.');
        return receipt.row;
      }
      const current = saved.members[userId] ?? emptyTimeClockMember();
      if (action === 'in') {
        await this.access.command(guild, userId, 'time', true);
        const actor = await this.member(guild, userId);
        if (!saved.config.enabled) throw new BotMessageError('The time clock is not enabled. Ask staff to set it up in the dashboard.');
        if (saved.config.roleIds.length && !saved.config.roleIds.some(id => actor.roles.cache.has(id))) throw new BotMessageError('Your roles cannot clock in. Ask staff to review the time clock member roles.');
        if (current.startedAt !== null) throw new BotMessageError('You are already clocked in. Clock out before starting another shift.');
      } else if (current.startedAt === null) throw new BotMessageError('You are not clocked in. Use /time in or the Clock in button first.');
      // An existing shift can always end after a feature/command-role change. Membership is still required.
      const now = Date.now(); this.assertFresh(operationId); this.assertRunning();
      const retained = saved.receipts.filter(item => now - interactionTime(item.id) <= INTERACTION_MAX_AGE_MS);
      if (retained.length >= MAX_RECEIPTS) throw new BotMessageError('The time clock is busy. Please try again shortly.');
      const next = { ...current };
      if (action === 'in') next.startedAt = now;
      else {
        next.lastShiftMs = Math.max(0, now - current.startedAt!);
        next.completedMs += next.lastShiftMs; next.shifts++; next.startedAt = null;
        if (!Number.isSafeInteger(next.completedMs) || !Number.isSafeInteger(next.shifts)) throw new BotMessageError('Your recorded time has reached its storage limit. Contact staff.');
      }
      const row = timeClockRow(userId, next, now);
      return this.store.mutate(guild.id, state => {
        state.members[userId] = next; state.receipts = retained;
        state.receipts.push({ id: operationId, userId, action, at: now, row }); return row;
      });
    });
  }
  async memberTime(guild: Guild, actorId: string, userId: string = actorId): Promise<TimeClockRow> {
    this.assertRunning();
    await this.member(guild, actorId);
    if (actorId !== userId) { await this.access.command(guild, actorId, 'time', true); await this.access.dashboard(guild, actorId); await this.member(guild, userId); }
    return timeClockRow(userId, this.store.get(guild.id).members[userId] ?? emptyTimeClockMember(), Date.now());
  }
  async clock(guild: Guild, actorId: string, page = 1) {
    this.assertRunning();
    const actor = await this.member(guild, actorId);
    if (!this.access.canDashboard(actor)) return { mode: 'personal' as const, member: await this.memberTime(guild, actorId) };
    await this.access.command(guild, actorId, 'time', true);
    await this.access.dashboard(guild, actorId);
    const snapshot = this.snapshot(guild.id), pages = Math.max(1, Math.ceil(snapshot.members.length / 10));
    if (!Number.isSafeInteger(page) || page < 1 || page > pages) throw new BotMessageError('Choose a time clock page from 1 to {pages}.', { pages });
    return { mode: 'team' as const, members: snapshot.members.slice((page - 1) * 10, page * 10), counts: snapshot.counts, page, pages, asOf: snapshot.asOf };
  }
  async publishPanel(guild: Guild, actorId: string, operationId: string = randomUUID(), authorize?: () => Promise<void>) {
    this.assertRunning();
    if (!panelOperationId(operationId)) throw new BotMessageError('Invalid time clock panel request.');
    return this.enqueue(guild.id, async () => {
      const actor = await this.member(guild, actorId);
      await this.access.dashboard(guild, actorId);
      await this.access.command(guild, actorId, 'time', true);
      if (snowflake(operationId)) this.assertFresh(operationId);
      const state = this.store.get(guild.id), earlier = state.panels.find(item => item.id === operationId);
      if (earlier) {
        if (earlier.actorId !== actorId) throw new BotMessageError('That time clock request belongs to a different action.');
        if (earlier.delivery === 'sent' && earlier.messageId) return panelResult(guild.id, earlier.channelId, earlier.messageId);
        throw new BotMessageError('The earlier panel send has an unknown outcome. Check the channel before publishing another panel.');
      }
      if (!state.config.enabled) throw new BotMessageError('The time clock is not enabled. Ask staff to set it up in the dashboard.');
      if (!state.config.channelId) throw new BotMessageError('Choose a text or announcement channel in this server.');
      if (state.panels.length >= MAX_PANELS) throw new BotMessageError('The time clock panel history is full. Contact the bot operator.');
      const channel = await this.channel(guild, state.config.channelId, actor);
      await this.access.dashboard(guild, actorId);
      await this.access.command(guild, actorId, 'time', true);
      if (authorize) await authorize();
      this.assertRunning();
      // Keep panel receipts permanently: UUID retries have no trustworthy timestamp and cannot safely be evicted.
      await this.store.mutate(guild.id, value => { value.panels.push({ id: operationId, actorId, channelId: channel.id, delivery: 'pending' }); });
      const t = (key: string) => botText(guild.id, key, {}, guild.preferredLocale);
      try {
        const message = await channel.send({
          embeds: [{ title: t('Time clock'), description: t('Clock in when you start, then clock out when you finish. Cyro records your shift and your total time in this server.\n\nYour replies are private. Members can see their own time; people with dashboard access can see everyone’s totals.'), color: 0x82d9f7 }],
          components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('time-clock:in').setLabel(t('Clock in')).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('time-clock:out').setLabel(t('Clock out')).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('time-clock:me').setLabel(t('My time')).setStyle(ButtonStyle.Secondary))],
          allowedMentions: { parse: [] }, nonce: operationId.replaceAll('-', '').slice(0, 25), enforceNonce: true,
        });
        return await this.store.mutate(guild.id, value => { const receipt = value.panels.find(item => item.id === operationId)!; receipt.delivery = 'sent'; receipt.messageId = message.id; return panelResult(guild.id, channel.id, message.id); });
      } catch {
        this.logger.warn('Time clock panel send has an unknown outcome; automatic replay is disabled.', { guildId: guild.id });
        throw new BotMessageError('The time clock panel send has an unknown outcome. Check the channel before publishing another panel.');
      }
    });
  }
  private duration(guildId: string, ms: number, locale: string): string {
    const seconds = Math.floor(ms / 1000);
    return botText(guildId, '{hours}h {minutes}m {seconds}s', { hours: botNumber(guildId, Math.floor(seconds / 3600), locale), minutes: botNumber(guildId, Math.floor(seconds / 60) % 60, locale), seconds: botNumber(guildId, seconds % 60, locale) }, locale);
  }
  private personalEmbed(guildId: string, row: TimeClockRow, locale: string, title = 'Your recorded time') {
    const t = (key: string, params = {}) => botText(guildId, key, params, locale);
    return { title: t(title), color: 0x82d9f7, description: `<@${row.userId}>`, fields: [
      { name: t('Total time'), value: this.duration(guildId, row.totalMs, locale), inline: true },
      { name: t('Completed shifts'), value: botNumber(guildId, row.shifts, locale), inline: true },
      { name: t('Current shift'), value: row.startedAt === null ? t('Clocked out') : this.duration(guildId, row.activeMs, locale), inline: true },
      { name: t('Last completed shift'), value: this.duration(guildId, row.lastShiftMs, locale), inline: true },
    ], footer: { text: t('Total time includes your current shift. Times belong to this server only.') } };
  }
  private readonly onInteraction = (interaction: Interaction): void => {
    if (this.stopped) return;
    const command = interaction.isChatInputCommand() && interaction.commandName === 'time';
    const button = interaction.isButton() && ['time-clock:in', 'time-clock:out', 'time-clock:me'].includes(interaction.customId);
    if (!command && !button) return;
    const run = async () => {
      if (!interaction.isChatInputCommand() && !interaction.isButton()) return;
      const t = (key: string, params = {}) => botText(interaction.guildId, key, params, interaction.locale);
      if (!interaction.inCachedGuild()) { await interaction.reply({ content: t('Use the time clock inside a Discord server.'), flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } }); return; }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const action = interaction.isButton() ? interaction.customId.split(':')[1] : interaction.options.getSubcommand();
      const guild = interaction.guild, userId = interaction.user.id;
      if (action === 'in' || action === 'out') {
        const row = action === 'in' ? await this.clockIn(guild, userId, interaction.id) : await this.clockOut(guild, userId, interaction.id);
        await interaction.editReply({ content: action === 'in' ? t('You are clocked in. Press Clock out or use /time out when you finish.') : t('You clocked out. This shift: {duration}. Total completed time: {total}.', { duration: this.duration(guild.id, row.lastShiftMs, interaction.locale), total: this.duration(guild.id, row.completedMs, interaction.locale) }), embeds: [this.personalEmbed(guild.id, row, interaction.locale)], allowedMentions: { parse: [] } });
      } else if (action === 'me' || action === 'member') {
        const target = action === 'member' && interaction.isChatInputCommand() ? interaction.options.getUser('user', true).id : userId;
        const row = await this.memberTime(guild, userId, target);
        await interaction.editReply({ embeds: [this.personalEmbed(guild.id, row, interaction.locale, target === userId ? 'Your recorded time' : 'Member recorded time')], allowedMentions: { parse: [] } });
      } else if (action === 'clock' && interaction.isChatInputCommand()) {
        const result = await this.clock(guild, userId, interaction.options.getInteger('page') ?? 1);
        if (result.mode === 'personal') await interaction.editReply({ embeds: [this.personalEmbed(guild.id, result.member, interaction.locale)], allowedMentions: { parse: [] } });
        else await interaction.editReply({ embeds: [{ title: t('Server time clock'), color: 0x82d9f7,
          description: result.members.length ? t('Recorded members: {members} · Clocked in: {active}\nTotal recorded time: {total}', { members: botNumber(guild.id, result.counts.members, interaction.locale), active: botNumber(guild.id, result.counts.active, interaction.locale), total: this.duration(guild.id, result.counts.totalMs, interaction.locale) }) : t('No time has been recorded in this server yet.'),
          fields: result.members.map(row => ({ name: t('Total: {duration}', { duration: this.duration(guild.id, row.totalMs, interaction.locale) }), value: `<@${row.userId}> · ${row.startedAt === null ? t('Clocked out') : t('Clocked in')} · ${t('Completed shifts: {count}', { count: botNumber(guild.id, row.shifts, interaction.locale) })}` })),
          footer: { text: t('Page {page} of {pages} · Totals include active shifts.', { page: result.page, pages: result.pages }) },
        }], allowedMentions: { parse: [] } });
      } else if (action === 'panel') {
        const result = await this.publishPanel(guild, userId, interaction.id);
        await interaction.editReply({ content: t('Time clock panel published: {url}', { url: result.messageUrl }), allowedMentions: { parse: [] } });
      }
    };
    const task = run().catch(async error => {
      this.logger.warn('Time clock interaction could not complete.', { guildId: interaction.guildId });
      if ((!interaction.isChatInputCommand() && !interaction.isButton()) || interaction.replied) return;
      const content = botError(interaction.guildId, error, interaction.locale, 'I could not complete that time clock action. Please try again shortly.');
      try { if (interaction.deferred) await interaction.editReply({ content, allowedMentions: { parse: [] } }); else await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } }); } catch { this.logger.warn('Time clock response could not be delivered.'); }
    });
    this.active.add(task); void task.finally(() => this.active.delete(task)).catch(() => undefined);
  };
}
