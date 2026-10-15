import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Events, MessageFlags, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle, type Client, type Guild, type GuildMember, type TextChannel, type NewsChannel, type Message, type MessageCreateOptions, type Interaction } from 'discord.js';
import type { AccessService } from '../control/access.js';
import type { Logger } from '../logger.js';
import { SuggestionsStore } from './store.js';
import { MAX_HISTORY, MAX_VOTERS, parseSuggestionsConfig, snowflake, suggestionSummary, type SuggestionRecord, type SuggestionStatus, type VoteChoice } from './types.js';
import { botText, botError, BotMessageError } from '../i18n/index.js';

type SuggestionChannel = TextChannel | NewsChannel;
type VoteMessage = Pick<Message, 'id' | 'guildId' | 'channelId' | 'author'>;
export function suggestionPayload(guildId: string, record: SuggestionRecord, discordLocale?: string): MessageCreateOptions {
  const value = suggestionSummary(guildId, record);
  const labels = { open: botText(guildId, 'Open for voting', {}, discordLocale), accepted: botText(guildId, 'Accepted', {}, discordLocale), declined: botText(guildId, 'Declined', {}, discordLocale), closed: botText(guildId, 'Closed', {}, discordLocale) };
  const colors = { open: 0x78d5fa, accepted: 0x7ee0b2, declined: 0xeb8493, closed: 0x9aa9c2 };
  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`suggest:vote:${record.id}:up`).setLabel(botText(guildId, 'Upvote · {count}', { count: value.upVotes }, discordLocale)).setStyle(ButtonStyle.Success).setDisabled(record.status !== 'open'),
    new ButtonBuilder().setCustomId(`suggest:vote:${record.id}:down`).setLabel(botText(guildId, 'Downvote · {count}', { count: value.downVotes }, discordLocale)).setStyle(ButtonStyle.Danger).setDisabled(record.status !== 'open'),
    new ButtonBuilder().setCustomId(`suggest:vote:${record.id}:remove`).setLabel(botText(guildId, 'Remove vote', {}, discordLocale)).setStyle(ButtonStyle.Secondary).setDisabled(record.status !== 'open'),
  );
  return {
    embeds: [{ title: botText(guildId, 'Suggestion #{number} · {status}', { number: record.number, status: labels[record.status] }, discordLocale), description: record.text, color: colors[record.status], author: { name: record.authorName }, footer: { text: record.status === 'open' ? botText(guildId, 'One vote per member. You can change or remove your vote.', {}, discordLocale) : botText(guildId, 'Voting closed · {up} for / {down} against', { up: value.upVotes, down: value.downVotes }, discordLocale) }, timestamp: record.createdAt, ...(record.decision?.reason ? { fields: [{ name: botText(guildId, 'Staff response', {}, discordLocale), value: record.decision.reason }] } : {}) }],
    components: [buttons], allowedMentions: { parse: [], repliedUser: false },
  };
}
export class SuggestionsService {
  private readonly store: SuggestionsStore;
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly active = new Set<Promise<void>>();
  private attached = false;
  private timer?: ReturnType<typeof setInterval>;
  private reconciling?: Promise<void>;
  private reconcileCursor = '';
  private stopped = false;
  constructor(private readonly client: Client, dataDir: string, private readonly logger: Logger, private readonly access: AccessService) { this.store = new SuggestionsStore(dataDir); }
  async init(): Promise<void> { await this.store.init(); }
  getConfig(guildId: string) { return this.store.get(guildId).config; }
  snapshot(guildId: string, requestedPage = 1) {
    if (!Number.isSafeInteger(requestedPage) || requestedPage < 1 || requestedPage > 100000) throw new BotMessageError('Choose a valid suggestions page.');
    const guild = this.store.get(guildId);
    const counts = { open: 0, accepted: 0, declined: 0, closed: 0, pending: 0 };
    for (const item of guild.items) { if (item.delivery === 'pending') counts.pending++; else counts[item.status]++; }
    const totalPages = Math.max(1, Math.ceil(guild.items.length / 100)), page = Math.min(requestedPage, totalPages);
    const items = guild.items.slice().reverse().slice((page - 1) * 100, page * 100).map(item => suggestionSummary(guildId, item));
    return { config: guild.config, items, counts, limits: { history: MAX_HISTORY, votersPerSuggestion: MAX_VOTERS }, displayed: items.length, page, totalPages };
  }
  private enqueue<T>(guildId: string, operation: () => Promise<T>): Promise<T> {
    const task = (this.queues.get(guildId) ?? Promise.resolve()).catch(() => undefined).then(operation);
    this.queues.set(guildId, task);
    void task.finally(() => { if (this.queues.get(guildId) === task) this.queues.delete(guildId); }).catch(() => undefined);
    return task;
  }
  private assertRunning(): void { if (this.stopped) throw new BotMessageError('Suggestions are stopping. Please try again shortly.'); }
  async guildIds(): Promise<string[]> { return this.store.guildIds(); }
  async purgeGuild(guildId: string, guard: () => boolean = () => true): Promise<void> { await this.enqueue(guildId, () => this.store.purgeGuild(guildId, guard)); }
  async flush(): Promise<void> { while (this.queues.size || this.active.size || this.reconciling) await Promise.allSettled([...this.queues.values(), ...this.active, ...(this.reconciling ? [this.reconciling] : [])]); await this.store.flush(); }
  private track(task: Promise<void>): void {
    this.active.add(task);
    void task.finally(() => this.active.delete(task)).catch(() => undefined);
  }
  private readonly onReady = (): void => {
    if (!this.stopped) this.track(this.reconcile().catch(() => { this.logger.warn('Suggestions reconciliation could not complete.'); }));
  };
  private readonly onInteraction = (interaction: Interaction): void => {
    if (this.stopped) return;
    const command = interaction.isChatInputCommand() && interaction.commandName === 'suggestion';
    const modal = interaction.isModalSubmit() && interaction.customId === 'suggest:create';
    const vote = interaction.isButton() && interaction.customId.startsWith('suggest:vote:');
    if (!command && !modal && !vote) return;
    const run = async () => {
      if (!interaction.inCachedGuild()) {
        if (interaction.isRepliable()) await interaction.reply({ content: botText(interaction.guildId, 'Use suggestions inside a Discord server.', {}, interaction.locale), flags: MessageFlags.Ephemeral });
        return;
      }
      if (interaction.isChatInputCommand()) {
        this.access.commandMember(interaction.member, 'suggestion', true);
        if (!this.getConfig(interaction.guildId).enabled) throw new BotMessageError('Suggestions are not enabled yet. Ask staff to choose a channel in the dashboard.', {});
        const field = new TextInputBuilder().setCustomId('text').setLabel(botText(interaction.guildId, 'Your suggestion', {}, interaction.locale)).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000).setPlaceholder(botText(interaction.guildId, 'What would make this community better?', {}, interaction.locale));
        await interaction.showModal(new ModalBuilder().setCustomId('suggest:create').setTitle(botText(interaction.guildId, 'Share a suggestion', {}, interaction.locale)).addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(field)));
      } else if (interaction.isModalSubmit()) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const item = await this.create(interaction.guild, interaction.user.id, interaction.fields.getTextInputValue('text'), interaction.id);
        await interaction.editReply({ content: botText(interaction.guildId, 'Suggestion #{number} is ready for votes: {url}', { number: item.number, url: item.messageUrl ?? '' }, interaction.locale), allowedMentions: { parse: [] } });
      } else if (interaction.isButton()) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const match = /^suggest:vote:(\d{17,20}):(up|down|remove)$/.exec(interaction.customId);
        if (!match) throw new BotMessageError('This suggestion button is invalid.', {});
        const choice = match[2] === 'remove' ? null : match[2] as VoteChoice;
        const item = await this.vote(interaction.guild, interaction.user.id, match[1]!, choice, interaction.id, interaction.message);
        await interaction.editReply({ content: botText(interaction.guildId, 'Your latest vote choice is saved.', {}, interaction.locale) + (item.syncPending ? botText(interaction.guildId, ' The count on the message will refresh when Discord is available.', {}, interaction.locale) : ''), allowedMentions: { parse: [] } });
      }
    };
    const task = run().catch(async error => {
      this.logger.warn('Suggestion interaction could not complete.', { guildId: interaction.guildId });
      if (!interaction.isRepliable() || interaction.replied) return;
      const content = botError(interaction.guildId, error, interaction.locale, 'I could not complete that action. Please check channel permissions or try again shortly.');
      try { if (interaction.deferred) await interaction.editReply({ content, allowedMentions: { parse: [] } }); else await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } }); }
      catch { this.logger.warn('Suggestion interaction response could not be delivered.'); }
    });
    this.track(task);
  };
  attach(): void {
    if (this.attached || this.stopped) return;
    this.attached = true;
    this.client.on(Events.InteractionCreate, this.onInteraction);
    this.client.on(Events.ClientReady, this.onReady);
    this.client.on(Events.GuildCreate, this.onReady);
    this.timer = setInterval(this.onReady, 60_000); this.timer.unref();
    if (this.client.isReady()) this.onReady();
  }
  stop(): void {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    if (!this.attached) return;
    this.attached = false;
    this.client.off(Events.InteractionCreate, this.onInteraction);
    this.client.off(Events.ClientReady, this.onReady);
    this.client.off(Events.GuildCreate, this.onReady);
  }
  private async channel(guild: Guild, id: string, actor?: GuildMember): Promise<SuggestionChannel> {
    const channel = await guild.channels.fetch(id);
    if (!channel || channel.guild.id !== guild.id || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) throw new BotMessageError('Choose a text or announcement channel in this server.');
    if (actor && !channel.permissionsFor(actor)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) throw new BotMessageError('You need View Channel and Send Messages in the suggestions channel.');
    const bot = await guild.members.fetchMe();
    if (!channel.permissionsFor(bot)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory])) throw new BotMessageError('Cyro needs View Channel, Send Messages, Embed Links, and Read Message History in the suggestions channel.');
    return channel as SuggestionChannel;
  }
  async updateConfig(guildId: string, input: unknown, authorize?: () => Promise<void>) {
    this.assertRunning(); const config = parseSuggestionsConfig(input);
    return this.enqueue(guildId, async () => {
      if (config.channelId) await this.channel(await this.client.guilds.fetch(guildId), config.channelId);
      if (authorize) await authorize();
      this.assertRunning();
      return this.store.mutate(guildId, state => { state.config = config; return config; });
    });
  }
  async create(guild: Guild, actorId: string, input: unknown, operationId: string) {
    this.assertRunning();
    if (!snowflake(operationId) || !snowflake(actorId) || typeof input !== 'string' || !input.trim() || input.length > 2000) throw new BotMessageError('A suggestion must contain 1–2,000 characters.');
    const text = input.trim();
    return this.enqueue(guild.id, async () => {
      await this.access.command(guild, actorId, 'suggestion', true);
      const member = await this.access.member(guild, actorId);
      if (member.user.bot) throw new BotMessageError('Only server members can suggest ideas.');
      const saved = this.store.get(guild.id);
      if (!saved.config.enabled || !saved.config.channelId) throw new BotMessageError('Suggestions are not enabled yet. Ask staff to choose a channel in the dashboard.');
      const channel = await this.channel(guild, saved.config.channelId, member);
      const existing = saved.items.find(item => item.id === operationId);
      if (existing) {
        if (existing.authorId !== actorId || existing.text !== text) throw new BotMessageError('That suggestion request was already used for different content.');
        if (existing.delivery === 'pending') throw new BotMessageError('The earlier send has an unknown outcome. Ask staff to check the channel; Cyro will not post it twice.');
        return suggestionSummary(guild.id, existing);
      }
      const latest = saved.items.filter(item => item.authorId === actorId).at(-1);
      const wait = latest ? saved.config.cooldownMinutes * 60_000 - (Date.now() - Date.parse(latest.createdAt)) : 0;
      if (wait > 0) throw new BotMessageError('Please wait {minutes} minute(s) before sharing another suggestion.', { minutes: Math.ceil(wait / 60_000) });
      const evict = saved.items.length >= MAX_HISTORY ? saved.items.find(item => item.status !== 'open' && item.delivery === 'sent' && !item.syncPending) : undefined;
      if (saved.items.length >= MAX_HISTORY && !evict) throw new BotMessageError('This server has reached its 1,000-suggestion limit. Staff must resolve an open suggestion before accepting more.');
      if (saved.nextNumber >= Number.MAX_SAFE_INTEGER) throw new BotMessageError('Suggestion numbering is full. Contact the bot operator.');
      const record: SuggestionRecord = { id: operationId, number: saved.nextNumber, authorId: actorId, authorName: member.displayName.slice(0, 100), text, channelId: channel.id, createdAt: new Date().toISOString(), status: 'open', delivery: 'pending', syncPending: false, votes: {} };
      await this.store.mutate(guild.id, state => { if (evict) state.items = state.items.filter(item => item.id !== evict.id); state.items.push(record); state.nextNumber++; });
      try {
        const message = await channel.send({ ...suggestionPayload(guild.id, record, guild.preferredLocale), nonce: operationId, enforceNonce: true });
        return await this.store.mutate(guild.id, state => {
          const item = state.items.find(item => item.id === operationId)!; item.delivery = 'sent'; item.messageId = message.id; return suggestionSummary(guild.id, item);
        });
      } catch {
        this.logger.warn('Suggestion send has an unknown outcome; automatic replay is disabled.', { guildId: guild.id, suggestionId: operationId });
        throw new BotMessageError('The suggestion send has an unknown outcome. Ask staff to check the channel before posting again.');
      }
    });
  }
  private matchesMessage(guildId: string, item: SuggestionRecord, message: VoteMessage): boolean {
    return item.delivery === 'sent' && message.id === item.messageId && message.channelId === item.channelId && message.guildId === guildId && message.author.id === this.client.user?.id;
  }
  private async syncMessage(guild: Guild, item: SuggestionRecord): Promise<void> {
    if (item.delivery !== 'sent' || !item.messageId) return;
    const channel = await this.channel(guild, item.channelId);
    const message = await channel.messages.fetch(item.messageId);
    if (!this.matchesMessage(guild.id, item, message)) throw new BotMessageError('This message is not the saved Cyro suggestion.');
    const payload = suggestionPayload(guild.id, item, guild.preferredLocale);
    await message.edit({ embeds: payload.embeds, components: payload.components, allowedMentions: payload.allowedMentions });
    await this.store.mutate(guild.id, state => { const saved = state.items.find(value => value.id === item.id); if (saved) saved.syncPending = false; });
  }
  private async trySync(guild: Guild, item: SuggestionRecord): Promise<void> {
    try { await this.syncMessage(guild, item); }
    catch { this.logger.warn('Suggestion saved; Discord message refresh is pending.', { guildId: guild.id, suggestionId: item.id }); }
  }
  async reconcile(): Promise<void> {
    if (this.stopped || !this.client.isReady()) return;
    if (this.reconciling) return this.reconciling;
    const run = async () => {
      const candidates: { guild: Guild; id: string; key: string }[] = [];
      for (const guildId of await this.store.guildIds()) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild || guild.available === false) continue;
        for (const item of this.store.get(guildId).items) if (item.syncPending && item.delivery === 'sent') candidates.push({ guild, id: item.id, key: `${guildId}:${item.id}` });
      }
      // Rotate after each attempted record so a deleted message cannot starve newer repairs.
      const start = candidates.findIndex(item => item.key === this.reconcileCursor) + 1;
      for (const target of [...candidates.slice(start), ...candidates.slice(0, start)].slice(0, 10)) {
        if (this.stopped || !this.client.isReady()) break;
        this.reconcileCursor = target.key;
        await this.enqueue(target.guild.id, async () => {
          if (this.stopped || target.guild.available === false) return;
          const item = this.store.get(target.guild.id).items.find(item => item.id === target.id);
          if (item?.syncPending && item.delivery === 'sent') await this.trySync(target.guild, item);
        });
      }
    };
    this.reconciling = run();
    try { await this.reconciling; } finally { this.reconciling = undefined; }
  }
  async vote(guild: Guild, actorId: string, id: string, choice: VoteChoice, interactionId: string, message: VoteMessage) {
    this.assertRunning();
    if (!snowflake(actorId) || !snowflake(id) || !snowflake(interactionId) || !['up', 'down', null].includes(choice)) throw new BotMessageError('Invalid suggestion vote.');
    return this.enqueue(guild.id, async () => {
      const member = await this.access.member(guild, actorId);
      if (member.user.bot) throw new BotMessageError('Only server members can vote.');
      const state = this.store.get(guild.id);
      if (!state.config.enabled) throw new BotMessageError('Suggestions are not enabled in this server.');
      const item = state.items.find(value => value.id === id);
      if (!item || !this.matchesMessage(guild.id, item, message)) throw new BotMessageError('This vote does not belong to a saved suggestion in this server.');
      const channel = await this.channel(guild, item.channelId);
      if (!channel.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel)) throw new BotMessageError('You cannot view this suggestions channel.');
      if (item.status !== 'open') throw new BotMessageError('Voting has closed on this suggestion.');
      if (!item.votes[actorId] && Object.keys(item.votes).length >= MAX_VOTERS) throw new BotMessageError('This suggestion has reached its 10,000-voter limit. Existing voters can still change or remove their vote.');
      if (!item.votes[actorId] || BigInt(item.votes[actorId].interactionId) < BigInt(interactionId)) {
        await this.store.mutate(guild.id, state => {
          const saved = state.items.find(value => value.id === id)!;
          saved.votes[actorId] = { choice, interactionId }; saved.syncPending = true;
        });
      }
      const current = this.store.get(guild.id).items.find(value => value.id === id)!;
      if (current.syncPending) await this.trySync(guild, current);
      return suggestionSummary(guild.id, this.store.get(guild.id).items.find(value => value.id === id)!);
    });
  }
  async decide(guild: Guild, actorId: string, id: string, input: unknown) {
    this.assertRunning();
    if (!snowflake(id) || !input || typeof input !== 'object' || Array.isArray(input)) throw new BotMessageError('Choose a suggestion decision.');
    const value = input as Record<string, unknown>;
    if (Object.keys(value).some(key => !['status', 'reason'].includes(key)) || !['accepted', 'declined', 'closed'].includes(value.status as string) || (value.reason !== undefined && (typeof value.reason !== 'string' || value.reason.length > 1000))) throw new BotMessageError('Choose accept, decline, or close, with a response up to 1,000 characters.');
    const status = value.status as Exclude<SuggestionStatus, 'open'>, reason = (value.reason as string | undefined)?.trim() ?? '';
    return this.enqueue(guild.id, async () => {
      const actor = await this.access.dashboard(guild, actorId);
      const item = this.store.get(guild.id).items.find(value => value.id === id);
      if (!item) throw new BotMessageError('That suggestion does not belong to this server.');
      if (item.delivery !== 'sent') throw new BotMessageError('This suggestion has an unconfirmed send. Check its channel before taking action.');
      await this.channel(guild, item.channelId, actor);
      if (item.status !== 'open' && (item.decision?.status !== status || item.decision.reason !== reason)) throw new BotMessageError('This suggestion already has a staff decision.');
      if (item.status === 'open') await this.store.mutate(guild.id, state => {
        const saved = state.items.find(value => value.id === id)!;
        saved.status = status; saved.decision = { actorId, status, reason, at: new Date().toISOString() }; saved.syncPending = true;
      });
      const current = this.store.get(guild.id).items.find(value => value.id === id)!;
      if (current.syncPending) await this.trySync(guild, current);
      return suggestionSummary(guild.id, this.store.get(guild.id).items.find(value => value.id === id)!);
    });
  }
}
