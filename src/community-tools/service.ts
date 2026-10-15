import { matchesToolsReference } from '../i18n/tools-messages.js';
import { botText, botError, BotMessageError } from '../i18n/index.js';
import { randomBytes } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Events, MessageFlags, MessageType, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle, type Client, type Guild, type GuildMember, type Interaction, type Message, type MessageCreateOptions, type NewsChannel, type TextChannel } from 'discord.js';
import type { AccessService } from '../control/access.js';
import type { Logger } from '../logger.js';
import { CommunityToolsStore } from './store.js';
import { bugStatuses, MAX_REPORTS, parseBugContent, parseCommunityToolsConfig, snowflake, type BugReport, type BugStatus, type StickyConfig, type StickyReceipt } from './types.js';
type Channel = TextChannel | NewsChannel;
const labels: Record<BugStatus, string> = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved', dismissed: 'Dismissed' };
const stickyFooter = (reference: string, guildId?: string, discordLocale?: string) => botText(guildId, 'Channel reminder · {reference}', { reference }, discordLocale);
export function bugReportPayload(report: BugReport, guildId?: string, discordLocale?: string): MessageCreateOptions {
  const t = (text: string, params = {}) => botText(guildId, text, params, discordLocale);
  return { embeds: [{ title: t('Bug #{number} · {title}', { number: report.number, title: report.title }), description: report.details, color: report.status === 'resolved' ? 0x79c8aa : 0x85cae5, author: { name: report.authorName }, fields: [{ name: t('Category'), value: report.categoryName, inline: true }, { name: t('Status'), value: t(labels[report.status]), inline: true }, { name: t('Reported by'), value: `<@${report.authorId}>`, inline: true }, ...(report.steps ? [{ name: t('Steps to reproduce'), value: report.steps }] : [])], footer: { text: t('Reports include the reporter’s Discord account. Staff can update the status below.') }, timestamp: report.createdAt }], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(bugStatuses.map(status => new ButtonBuilder().setCustomId(`bug:status:${report.id}:${status}`).setLabel(t(labels[status])).setStyle(status === 'resolved' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(report.status === status)))], allowedMentions: { parse: [], repliedUser: false } };
}
export class CommunityToolsService {
  private readonly store: CommunityToolsStore;
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly active = new Set<Promise<void>>();
  private timer?: ReturnType<typeof setInterval>;
  private reconciling?: Promise<void>;
  private cursor = 0;
  private readonly recoveryChecks = new Map<string, number>();
  private stopped = false;
  private attached = false;
  constructor(private readonly client: Client, dataDir: string, private readonly logger: Logger, private readonly access: AccessService) { this.store = new CommunityToolsStore(dataDir); }
  async init() { await this.store.init(); }
  getConfig(id: string) { return this.store.get(id).config; }
  snapshot(id: string, page = 1) {
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new BotMessageError('Choose a valid report page.');
    const data = this.store.get(id), counts = { open: 0, in_progress: 0, resolved: 0, dismissed: 0, pending: 0 };
    for (const report of data.reports) { counts[report.status]++; if (report.delivery === 'pending') counts.pending++; }
    const totalPages = Math.max(1, Math.ceil(data.reports.length / 100)); page = Math.min(page, totalPages);
    return { config: data.config, reports: data.reports.slice().reverse().slice((page - 1) * 100, page * 100), counts, page, totalPages, stickyStates: Object.entries(data.receipts).map(([id, r]) => ({ id, channelId: r.channelId, messageId: r.messageId, pending: Boolean(r.pendingNonce), cleanupPending: Boolean(r.previousMessageId), activity: r.activity, lastPostedAt: r.lastPostedAt })) };
  }
  private enqueue<T>(id: string, action: () => Promise<T>): Promise<T> { const task = (this.queues.get(id) ?? Promise.resolve()).catch(() => undefined).then(action); this.queues.set(id, task); void task.finally(() => { if (this.queues.get(id) === task) this.queues.delete(id); }).catch(() => undefined); return task; }
  private track(task: Promise<void>) { this.active.add(task); void task.finally(() => this.active.delete(task)).catch(() => undefined); }
  private running() { if (this.stopped) throw new BotMessageError('Community tools are restarting. Please try again shortly.'); }
  async guildIds() { return this.store.guildIds(); }
  async purgeGuild(id: string, guard: () => boolean = () => true) { await this.enqueue(id, () => this.store.purgeGuild(id, guard)); }
  async flush() { while (this.queues.size || this.active.size || this.reconciling) await Promise.allSettled([...this.queues.values(), ...this.active, ...(this.reconciling ? [this.reconciling] : [])]); await this.store.flush(); }
  private async channel(guild: Guild, id: string, actor?: GuildMember): Promise<Channel> {
    const channel = await guild.channels.fetch(id);
    if (!channel || channel.guild.id !== guild.id || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) throw new BotMessageError('Choose a text or announcement channel in this server.');
    const bot = await guild.members.fetchMe();
    if (!channel.permissionsFor(bot)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory])) throw new BotMessageError('Cyro needs View Channel, Send Messages, Embed Links, and Read Message History in the selected channel.');
    if (actor && !channel.permissionsFor(actor)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) throw new BotMessageError('You need View Channel and Send Messages in the selected channel.');
    return channel as Channel;
  }
  async updateConfig(guild: Guild, input: unknown, authorize?: () => Promise<void>) {
    this.running(); const config = parseCommunityToolsConfig(input);
    return this.enqueue(guild.id, async () => {
      for (const id of new Set([...config.bugs.categories.map(c => c.channelId), ...config.stickies.map(s => s.channelId)])) await this.channel(guild, id);
      if (authorize) await authorize(); this.running();
      const previous = this.store.get(guild.id);
      for (const sticky of config.stickies) if (previous.receipts[sticky.id] && previous.receipts[sticky.id]!.channelId !== sticky.channelId) throw new BotMessageError('Remove and save the old sticky before using its slot in another channel.');
      // Keep ambiguous receipts until their matching message can be identified. Never orphan them by changing an ID.
      const removedPending = Object.entries(previous.receipts).filter(([id, r]) => r.pendingNonce && !config.stickies.some(s => s.id === id));
      if (Object.keys(previous.receipts).length + config.stickies.filter(s => !previous.receipts[s.id]).length > 100 || removedPending.some(([, r]) => config.stickies.some(s => s.channelId === r.channelId))) throw new BotMessageError('A previous sticky has unconfirmed delivery. Check that channel before adding another sticky there.');
      await this.store.mutate(guild.id, state => { state.config = config; });
      // Saving never posts a new message. Disabled and removed stickies clean up only their own tracked message.
      await this.cleanupInactive(guild);
      return config;
    });
  }
  async create(guild: Guild, actorId: string, categoryId: string, input: unknown, operationId: string) {
    this.running(); if (!snowflake(operationId) || !snowflake(actorId)) throw new BotMessageError('Invalid bug report request.'); const content = parseBugContent(input);
    return this.enqueue(guild.id, async () => {
      await this.access.command(guild, actorId, 'bugreport', true); const member = await this.access.member(guild, actorId); if (member.user.bot) throw new BotMessageError('Only server members can report bugs.');
      const saved = this.store.get(guild.id), category = saved.config.bugs.categories.find(c => c.id === categoryId);
      if (!saved.config.bugs.enabled || !category) throw new BotMessageError('That report category is unavailable. Ask staff to review Bug reports in the dashboard.');
      const existing = saved.reports.find(r => r.id === operationId);
      if (existing) { if (existing.authorId !== actorId || existing.categoryId !== categoryId || ['title', 'details', 'steps'].some(k => existing[k as keyof typeof content] !== content[k as keyof typeof content])) throw new BotMessageError('That report request was already used.'); if (existing.delivery === 'pending') throw new BotMessageError('The earlier report send has an unknown outcome. Ask staff to check the channel; it will not be posted twice.'); return existing; }
      const latest = saved.reports.filter(r => r.authorId === actorId).at(-1); if (latest && Date.now() - Date.parse(latest.createdAt) < saved.config.bugs.cooldownMinutes * 60000) throw new BotMessageError('Please wait {minutes} minute(s) between bug reports.', { minutes: saved.config.bugs.cooldownMinutes });
      const evict = saved.reports.length >= MAX_REPORTS ? saved.reports.find(r => ['resolved', 'dismissed'].includes(r.status) && r.delivery === 'sent' && !r.syncPending) : undefined;
      if (saved.reports.length >= MAX_REPORTS && !evict) throw new BotMessageError('The report history is full. Staff need to resolve an existing report first.');
      if (saved.nextNumber >= Number.MAX_SAFE_INTEGER) throw new BotMessageError('Report numbering is full. Contact the bot operator.');
      const channel = await this.channel(guild, category.channelId);
      await this.access.command(guild, actorId, 'bugreport', true); this.running();
      const report: BugReport = { id: operationId, number: saved.nextNumber, authorId: actorId, authorName: member.displayName.slice(0, 100), categoryId, categoryName: category.name, channelId: channel.id, ...content, createdAt: new Date().toISOString(), status: 'open', delivery: 'pending', syncPending: false };
      await this.store.mutate(guild.id, state => { if (evict) state.reports = state.reports.filter(r => r.id !== evict.id); state.reports.push(report); state.nextNumber++; });
      try { const message = await channel.send({ ...bugReportPayload(report, guild.id, guild.preferredLocale), nonce: operationId, enforceNonce: true }); return await this.store.mutate(guild.id, state => { const item = state.reports.find(r => r.id === operationId)!; item.messageId = message.id; item.delivery = 'sent'; return item; }); }
      catch { this.logger.warn('Bug report delivery could not be confirmed; it will not be replayed.', { guildId: guild.id, reportId: operationId }); throw new BotMessageError('Your report was saved, but delivery could not be confirmed. Ask staff to check the reports dashboard before submitting again.'); }
    });
  }
  private owned(guildId: string, channelId: string, messageId: string, message: Pick<Message, 'id' | 'guildId' | 'channelId' | 'author'>) { return message.id === messageId && message.guildId === guildId && message.channelId === channelId && message.author.id === this.client.user?.id; }
  async decide(guild: Guild, actorId: string, id: string, input: unknown, source?: Message, authorize?: () => Promise<void>) {
    this.running(); const v = input as { status?: unknown }; if (!snowflake(id) || !v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => k !== 'status') || !bugStatuses.includes(v.status as BugStatus)) throw new BotMessageError('Choose a valid report status.'); const status = v.status as BugStatus;
    return this.enqueue(guild.id, async () => {
      const actor = await this.access.dashboard(guild, actorId), report = this.store.get(guild.id).reports.find(r => r.id === id);
      if (!report || (source && (!report.messageId || !this.owned(guild.id, report.channelId, report.messageId, source)))) throw new BotMessageError('That report does not belong to this server or message.');
      if (report.delivery !== 'sent') throw new BotMessageError('This report has unconfirmed delivery. Check its channel first.');
      await this.channel(guild, report.channelId, actor);
      await this.access.dashboard(guild, actorId);
      if (authorize) await authorize(); this.running();
      await this.store.mutate(guild.id, state => { const item = state.reports.find(r => r.id === id)!; item.status = status; item.decision = { actorId, status, at: new Date().toISOString() }; item.syncPending = true; });
      await this.syncReport(guild, this.store.get(guild.id).reports.find(r => r.id === id)!);
      return this.store.get(guild.id).reports.find(r => r.id === id)!;
    });
  }
  private async syncReport(guild: Guild, report: BugReport) {
    try { const channel = await this.channel(guild, report.channelId), message = await channel.messages.fetch(report.messageId!); if (!this.owned(guild.id, report.channelId, report.messageId!, message)) throw new BotMessageError('Wrong report message.'); const payload = bugReportPayload(report, guild.id, guild.preferredLocale); await message.edit({ embeds: payload.embeds, components: payload.components, allowedMentions: payload.allowedMentions }); await this.store.mutate(guild.id, state => { const item = state.reports.find(r => r.id === report.id); if (item) item.syncPending = false; }); }
    catch { this.logger.warn('Bug report status saved; message refresh is pending.', { guildId: guild.id, reportId: report.id }); }
  }
  private readonly onInteraction = (interaction: Interaction) => {
    if (this.stopped) return;
    const command = (interaction.isChatInputCommand() || interaction.isAutocomplete()) && interaction.commandName === 'bugreport';
    const modal = interaction.isModalSubmit() && interaction.customId.startsWith('bug:create:'); const button = interaction.isButton() && interaction.customId.startsWith('bug:status:');
    if (!command && !modal && !button) return;
    this.track((async () => {
      if (!interaction.inCachedGuild()) { if (interaction.isAutocomplete()) await interaction.respond([]); else if (interaction.isRepliable()) await interaction.reply({ content: botText(interaction.guildId, 'Use bug reports inside a server.', {}, interaction.locale), flags: MessageFlags.Ephemeral }); return; }
      if (interaction.isAutocomplete()) { const config = this.getConfig(interaction.guildId).bugs, query = interaction.options.getFocused().toLowerCase(); this.access.commandMember(interaction.member, 'bugreport', true); await interaction.respond(config.enabled ? config.categories.filter(c => `${c.name} ${c.id}`.toLowerCase().includes(query)).map(c => ({ name: c.name, value: c.id })).slice(0, 25) : []); return; }
      if (interaction.isChatInputCommand()) {
        this.access.commandMember(interaction.member, 'bugreport', true); const config = this.getConfig(interaction.guildId).bugs; if (!config.enabled) throw new BotMessageError('Bug reports are not enabled. Ask staff to configure a report category in the dashboard.');
        const requested = interaction.options.getString('category')?.toLowerCase(), category = requested ? config.categories.find(c => c.id.toLowerCase() === requested || c.name.toLowerCase() === requested) : config.categories.length === 1 ? config.categories[0] : undefined;
        if (!category) throw new BotMessageError('Choose a category with /bugreport category: {categories}', { categories: config.categories.map(c => c.name).join(', ') });
        const fields = [new TextInputBuilder().setCustomId('title').setLabel(botText(interaction.guildId, 'Short title · your name is included', {}, interaction.locale).slice(0, 45)).setStyle(TextInputStyle.Short).setMaxLength(150).setRequired(true), new TextInputBuilder().setCustomId('details').setLabel(botText(interaction.guildId, 'What happened? Do not include secrets.', {}, interaction.locale).slice(0, 45)).setStyle(TextInputStyle.Paragraph).setMaxLength(2000).setRequired(true), new TextInputBuilder().setCustomId('steps').setLabel(botText(interaction.guildId, 'Steps to reproduce (optional)', {}, interaction.locale).slice(0, 45)).setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(false)];
        await interaction.showModal(new ModalBuilder().setCustomId(`bug:create:${category.id}`).setTitle(botText(interaction.guildId, 'Report a bug · {category}', { category: category.name }, interaction.locale).slice(0, 45)).addComponents(fields.map(f => new ActionRowBuilder<TextInputBuilder>().addComponents(f))));
      } else if (interaction.isModalSubmit()) { await interaction.deferReply({ flags: MessageFlags.Ephemeral }); const result = await this.create(interaction.guild, interaction.user.id, interaction.customId.slice(11), Object.fromEntries(['title', 'details', 'steps'].map(k => [k, interaction.fields.getTextInputValue(k)])), interaction.id); await interaction.editReply({ content: botText(interaction.guildId, 'Report #{number} sent to {category}. Your Discord name is included for staff follow-up.', { number: result.number, category: result.categoryName }, interaction.locale), allowedMentions: { parse: [] } }); }
      else if (interaction.isButton()) { await interaction.deferReply({ flags: MessageFlags.Ephemeral }); const match = /^bug:status:(\d{17,20}):(open|in_progress|resolved|dismissed)$/.exec(interaction.customId); if (!match) throw new BotMessageError('Invalid report button.'); const result = await this.decide(interaction.guild, interaction.user.id, match[1]!, { status: match[2] }, interaction.message); await interaction.editReply({ content: botText(interaction.guildId, 'Report #{number}: {status}.', { number: result.number, status: botText(interaction.guildId, labels[result.status], {}, interaction.locale) }, interaction.locale) + (result.syncPending ? botText(interaction.guildId, ' The saved status will appear on the message when Discord is available.', {}, interaction.locale) : ''), allowedMentions: { parse: [] } }); }
    })().catch(async error => { this.logger.warn('Community tools interaction could not complete.', { guildId: interaction.guildId }); try { if (interaction.isAutocomplete()) { if (!interaction.responded) await interaction.respond([]); } else if (interaction.isRepliable() && !interaction.replied) { const content = botError(interaction.guildId, error, interaction.locale, 'That action could not complete. Check permissions and try again.'); if (interaction.deferred) await interaction.editReply({ content, allowedMentions: { parse: [] } }); else await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } }); } } catch { /* The interaction token may have expired. */ } }));
  };
  private readonly onMessage = (message: Message) => { if (this.stopped || !message.guild || message.author.bot || message.webhookId) return; if (!this.getConfig(message.guild.id).stickies.some(s => s.enabled && s.channelId === message.channelId)) return; this.track(this.noteActivity(message).catch(() => this.logger.warn('Sticky activity could not be saved.', { guildId: message.guildId }))); };
  async noteActivity(message: Pick<Message, 'id' | 'guild' | 'channelId' | 'author' | 'webhookId'>) {
    if (this.stopped || !message.guild || message.author.bot || message.webhookId || !snowflake(message.id)) return;
    const guild = message.guild;
    await this.enqueue(guild.id, async () => { if (this.stopped) return; const state = this.store.get(guild.id), config = state.config.stickies.find(s => s.enabled && s.channelId === message.channelId); if (!config) return;
      if (Object.entries(state.receipts).some(([id, r]) => id !== config.id && r.channelId === config.channelId)) return;
      const receipt = state.receipts[config.id]; if (receipt?.pendingNonce || (receipt?.lastActivityId && BigInt(message.id) <= BigInt(receipt.lastActivityId))) return;
      await this.store.mutate(guild.id, value => { const r = value.receipts[config.id] ??= { channelId: config.channelId, activity: 0, lastPostedAt: 0, dueAt: 0 }; r.activity = Math.min(100, r.activity + 1); r.lastActivityId = message.id; if (!r.dueAt && r.activity >= config.everyMessages) r.dueAt = Math.max(Date.now() + config.delaySeconds * 1000, r.lastPostedAt + config.delaySeconds * 1000); });
    });
  }
  private async deleteOwned(guild: Guild, channelId: string, id: string): Promise<void> {
    try { const channel = await this.channel(guild, channelId), message = await channel.messages.fetch(id); if (!this.owned(guild.id, channelId, id, message)) throw new BotMessageError('The tracked message is not owned by Cyro.'); await message.delete(); }
    catch (error) { if (![10003, 10008].includes(Number((error as { code?: number }).code))) throw error; }
  }
  private async cleanupInactive(guild: Guild) {
    const state = this.store.get(guild.id);
    for (const [id, receipt] of Object.entries(state.receipts)) {
      if (state.config.stickies.some(s => s.id === id && s.enabled) || receipt.pendingNonce) continue;
      try { if (receipt.previousMessageId) await this.deleteOwned(guild, receipt.channelId, receipt.previousMessageId); if (receipt.messageId) await this.deleteOwned(guild, receipt.channelId, receipt.messageId); await this.store.mutate(guild.id, s => { delete s.receipts[id]; }); }
      catch { this.logger.warn('Disabled sticky cleanup is pending.', { guildId: guild.id, stickyId: id }); }
    }
  }
  private async reconcileSticky(guild: Guild, id: string, receipt: StickyReceipt, config?: StickyConfig) {
    if (!receipt.pendingNonce && !receipt.previousMessageId && (!config?.enabled || !receipt.dueAt || receipt.dueAt > Date.now())) return;
    const recoveryKey = `${guild.id}:${id}`;
    if (receipt.pendingNonce && Date.now() - (this.recoveryChecks.get(recoveryKey) ?? 0) < 60000) return;
    const channel = await this.channel(guild, receipt.channelId);
    if (receipt.pendingNonce) {
      this.recoveryChecks.set(recoveryKey, Date.now());
      // REST-fetched messages lose their nonce. Recover only our exact persisted reference in the actual embed.
      const recent = await channel.messages.fetch({ limit: 100 }); const found = recent.find(m => m.author.id === this.client.user?.id && m.guildId === guild.id && m.channelId === receipt.channelId && m.type === MessageType.Default && !m.webhookId && m.embeds.length === 1 && matchesToolsReference(m.embeds[0]?.footer?.text, 'Channel reminder · {reference}', receipt.pendingNonce!));
      if (!found) return;
      this.recoveryChecks.delete(recoveryKey);
      await this.store.mutate(guild.id, s => { const r = s.receipts[id]!; r.messageId = found.id; delete r.pendingNonce; r.lastPostedAt = Date.now(); r.activity = 0; r.dueAt = 0; }); receipt = this.store.get(guild.id).receipts[id]!;
    }
    if (receipt.previousMessageId) { await this.deleteOwned(guild, receipt.channelId, receipt.previousMessageId); await this.store.mutate(guild.id, s => { delete s.receipts[id]!.previousMessageId; }); receipt = this.store.get(guild.id).receipts[id]!; }
    if (!config?.enabled || !receipt.dueAt || receipt.dueAt > Date.now() || receipt.activity < config.everyMessages || this.stopped) return;
    const nonce = randomBytes(12).toString('hex');
    await this.store.mutate(guild.id, s => { const r = s.receipts[id]!; r.pendingNonce = nonce; r.previousMessageId = r.messageId; delete r.messageId; });
    try { const message = await channel.send({ embeds: [{ title: config.title, description: config.body, color: 0x85cae5, footer: { text: stickyFooter(nonce, guild.id, guild.preferredLocale) } }], allowedMentions: { parse: [] }, nonce, enforceNonce: true }); await this.store.mutate(guild.id, s => { const r = s.receipts[id]!; r.messageId = message.id; delete r.pendingNonce; r.lastPostedAt = Date.now(); r.activity = 0; r.dueAt = 0; }); if (receipt.messageId) { await this.deleteOwned(guild, receipt.channelId, receipt.messageId); await this.store.mutate(guild.id, s => { delete s.receipts[id]!.previousMessageId; }); } }
    catch { this.logger.warn('Sticky delivery or cleanup needs reconciliation.', { guildId: guild.id, stickyId: id }); }
  }
  async reconcile(): Promise<void> {
    if (this.stopped) return; if (this.reconciling) return this.reconciling;
    const job = (async () => {
      const ids = await this.store.guildIds(); if (!ids.length) return;
      // Bound each pass while rotating across servers; one busy server cannot starve the next.
      for (let offset = 0; offset < Math.min(10, ids.length); offset++) { if (this.stopped) return; const id = ids[(this.cursor + offset) % ids.length]!; const guild = this.client.guilds.cache.get(id); if (!guild || !guild.available) continue;
        await this.enqueue(id, async () => { const state = this.store.get(id); for (const report of state.reports.filter(r => r.syncPending && r.delivery === 'sent').slice(0, 5)) await this.syncReport(guild, report);
          for (const [stickyId, receipt] of Object.entries(state.receipts)) { if (this.stopped) break; try { await this.reconcileSticky(guild, stickyId, receipt, state.config.stickies.find(s => s.id === stickyId)); } catch { this.logger.warn('Sticky reconciliation is pending.', { guildId: id, stickyId }); } } await this.cleanupInactive(guild); });
      } this.cursor = (this.cursor + Math.min(10, ids.length)) % ids.length;
    })(); this.reconciling = job; try { await job; } finally { if (this.reconciling === job) this.reconciling = undefined; }
  }
  private readonly onReady = () => { if (!this.stopped) this.track(this.reconcile().catch(() => this.logger.warn('Community tools reconciliation is pending.'))); };
  attach() { if (this.attached || this.stopped) return; this.attached = true; this.client.on(Events.InteractionCreate, this.onInteraction); this.client.on(Events.MessageCreate, this.onMessage); this.client.on(Events.ClientReady, this.onReady); this.timer = setInterval(this.onReady, 10000); this.timer.unref(); if (this.client.isReady()) this.onReady(); }
  stop() { this.stopped = true; if (this.timer) clearInterval(this.timer); if (this.attached) { this.client.off(Events.InteractionCreate, this.onInteraction); this.client.off(Events.MessageCreate, this.onMessage); this.client.off(Events.ClientReady, this.onReady); this.attached = false; } }
}
