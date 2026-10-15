import { ChannelType, Events, MessageFlags, PermissionFlagsBits, type Client, type Guild, type GuildMember, type TextChannel, type NewsChannel, type Interaction } from 'discord.js';
import type { AccessService } from '../control/access.js';
import type { Logger } from '../logger.js';
import { ConfessionsStore } from './store.js';
import { INTERACTION_MAX_AGE_MS, MAX_RECEIPTS, parseConfessionsConfig, PRIVACY_NOTICE, snowflake, type ConfessionReceipt } from './types.js';
import { botText, botError, BotMessageError } from '../i18n/index.js';

type ConfessionsChannel = TextChannel | NewsChannel;
const receiptResult = (guildId: string, receipt: ConfessionReceipt) => ({ number: receipt.number, ...(receipt.messageId ? { messageUrl: `https://discord.com/channels/${guildId}/${receipt.channelId}/${receipt.messageId}` } : {}) });
const interactionTime = (id: string) => Number((BigInt(id) >> 22n) + 1420070400000n);

export class ConfessionsService {
  private readonly store: ConfessionsStore;
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly active = new Set<Promise<void>>();
  // Author IDs only exist in memory until cooldown expiry; there is no durable author-to-post mapping.
  private readonly cooldowns = new Map<string, Map<string, number>>();
  private stopped = false;
  private attached = false;
  constructor(private readonly client: Client, dataDir: string, private readonly logger: Logger, private readonly access: AccessService) { this.store = new ConfessionsStore(dataDir); }
  async init(): Promise<void> { await this.store.init(); }
  getConfig(guildId: string) { return this.store.get(guildId).config; }
  dashboard(guildId: string) {
    const state = this.store.get(guildId);
    return { config: state.config, counts: { published: state.published, pending: state.receipts.filter(item => item.delivery === 'pending').length }, privacy: PRIVACY_NOTICE };
  }
  snapshot(guildId: string) { return this.dashboard(guildId); }
  private enqueue<T>(guildId: string, operation: () => Promise<T>): Promise<T> {
    const task = (this.queues.get(guildId) ?? Promise.resolve()).catch(() => undefined).then(operation);
    this.queues.set(guildId, task);
    void task.finally(() => { if (this.queues.get(guildId) === task) this.queues.delete(guildId); }).catch(() => undefined);
    return task;
  }
  private assertRunning(): void { if (this.stopped) throw new BotMessageError('Confessions are stopping. Please try again shortly.'); }
  async guildIds(): Promise<string[]> { return this.store.guildIds(); }
  async purgeGuild(guildId: string, guard: () => boolean = () => true): Promise<void> {
    await this.enqueue(guildId, async () => { await this.store.purgeGuild(guildId, guard); if (!(await this.store.guildIds()).includes(guildId)) this.cooldowns.delete(guildId); });
  }
  async flush(): Promise<void> { while (this.queues.size || this.active.size) await Promise.allSettled([...this.queues.values(), ...this.active]); await this.store.flush(); }
  attach(): void { if (!this.attached && !this.stopped) { this.attached = true; this.client.on(Events.InteractionCreate, this.onInteraction); } }
  stop(): void { this.stopped = true; if (this.attached) { this.attached = false; this.client.off(Events.InteractionCreate, this.onInteraction); } }
  private readonly onInteraction = (interaction: Interaction): void => {
    if (this.stopped || !interaction.isChatInputCommand() || interaction.commandName !== 'confess') return;
    const run = async () => {
      if (!interaction.inCachedGuild()) {
        await interaction.reply({ content: botText(interaction.guildId, 'Use /confess inside a Discord server.', {}, interaction.locale), flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const result = await this.create(interaction.guild, interaction.user.id, interaction.options.getString('confession', true), interaction.id);
      await interaction.editReply({ content: botText(interaction.guildId, 'Confession #{number} is posted: {url}\nYour name is hidden on the post. Discord still receives your original command and its author.', { number: result.number, url: result.messageUrl ?? '' }, interaction.locale), allowedMentions: { parse: [] } });
    };
    const task = run().catch(async error => {
      // Never log the interaction, input, author, or raw API/network error.
      this.logger.warn('Confession interaction could not complete.', { guildId: interaction.guildId });
      if (interaction.replied) return;
      const content = botError(interaction.guildId, error, interaction.locale, 'I could not complete that confession. Please check channel permissions or try again shortly.');
      try {
        if (interaction.deferred) await interaction.editReply({ content, allowedMentions: { parse: [] } });
        else await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
      } catch { this.logger.warn('Confession response could not be delivered.'); }
    });
    this.active.add(task);
    void task.finally(() => this.active.delete(task)).catch(() => undefined);
  };
  private async channel(guild: Guild, channelId: string, actor?: GuildMember): Promise<ConfessionsChannel> {
    const channel = await guild.channels.fetch(channelId);
    if (!channel || channel.id !== channelId || channel.guild.id !== guild.id || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) throw new BotMessageError('Choose a text or announcement channel in this server.');
    if (actor && !channel.permissionsFor(actor)?.has(PermissionFlagsBits.ViewChannel)) throw new BotMessageError('You cannot view this server\'s confessions channel.');
    const bot = await guild.members.fetchMe();
    if (!channel.permissionsFor(bot)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) throw new BotMessageError('Cyro needs View Channel, Send Messages, and Embed Links in the confessions channel.');
    return channel as ConfessionsChannel;
  }
  async configure(guild: Guild, input: unknown, authorize?: () => Promise<void>) {
    this.assertRunning(); const config = parseConfessionsConfig(input);
    return this.enqueue(guild.id, async () => {
      if (config.channelId) await this.channel(guild, config.channelId);
      if (authorize) await authorize();
      this.assertRunning();
      return this.store.mutate(guild.id, state => { state.config = config; return config; });
    });
  }
  async updateConfig(guildId: string, input: unknown, authorize?: () => Promise<void>) {
    this.assertRunning();
    const guild = await this.client.guilds.fetch(guildId);
    if (guild.id !== guildId) throw new BotMessageError('That server is unavailable.');
    return this.configure(guild, input, authorize);
  }
  async create(guild: Guild, actorId: string, input: unknown, operationId: string) {
    this.assertRunning();
    if (!snowflake(guild.id) || !snowflake(actorId) || !snowflake(operationId) || typeof input !== 'string' || !input.trim() || input.length > 1500) throw new BotMessageError('A confession must contain 1–1,500 characters.');
    const text = input.trim();
    return this.enqueue(guild.id, async () => {
      this.assertRunning();
      const requestAge = Date.now() - interactionTime(operationId);
      if (requestAge > INTERACTION_MAX_AGE_MS || requestAge < -60_000) throw new BotMessageError('This confession request has expired. Run /confess again.');
      await this.access.command(guild, actorId, 'confess', true);
      const actor = await this.access.member(guild, actorId);
      if (!actor || actor.guild.id !== guild.id || actor.id !== actorId || actor.user.bot) throw new BotMessageError('Only members of this server can send confessions.');
      const saved = this.store.get(guild.id);
      if (!saved.config.enabled || !saved.config.channelId) throw new BotMessageError('Confessions are not enabled yet. Ask staff to choose a channel in the dashboard.');
      const channel = await this.channel(guild, saved.config.channelId, actor);
      const existing = saved.receipts.find(item => item.id === operationId);
      if (existing) {
        if (existing.delivery === 'pending') throw new BotMessageError('The earlier send has an unknown outcome. Ask staff to check the channel; Cyro will not post it twice.');
        return receiptResult(guild.id, existing);
      }
      const now = Date.now(), cooldowns = this.cooldowns.get(guild.id) ?? new Map<string, number>();
      for (const [id, expiresAt] of cooldowns) if (expiresAt <= now) cooldowns.delete(id);
      this.cooldowns.set(guild.id, cooldowns);
      const wait = (cooldowns.get(actorId) ?? 0) - now;
      if (wait > 0) throw new BotMessageError('Please wait {seconds} seconds before sending another confession.', { seconds: Math.ceil(wait / 1000) });
      if (cooldowns.size >= 10000) throw new BotMessageError('Confessions are busy. Please try again after a cooldown expires.');
      // Evict only receipts whose Discord interaction can no longer be accepted. Never replay pending sends.
      const evict = saved.receipts.length >= MAX_RECEIPTS ? saved.receipts.find(item => now - interactionTime(item.id) > INTERACTION_MAX_AGE_MS) : undefined;
      if (saved.receipts.length >= MAX_RECEIPTS && !evict) throw new BotMessageError('Confessions are busy. Please try again in 15 minutes.');
      if (saved.nextNumber >= Number.MAX_SAFE_INTEGER) throw new BotMessageError('Confession numbering is full. Contact the bot operator.');
      const receipt: ConfessionReceipt = { id: operationId, number: saved.nextNumber, channelId: channel.id, createdAt: new Date().toISOString(), delivery: 'pending' };
      this.assertRunning();
      await this.store.mutate(guild.id, state => { if (evict) state.receipts = state.receipts.filter(item => item.id !== evict.id); state.receipts.push(receipt); state.nextNumber++; });
      cooldowns.set(actorId, now + saved.config.cooldownSeconds * 1000);
      try {
        const message = await channel.send({ embeds: [{ title: botText(guild.id, 'Confession #{number}', { number: receipt.number }, guild.preferredLocale), description: text, color: 0x82d9f7 }], allowedMentions: { parse: [] }, nonce: operationId, enforceNonce: true });
        return await this.store.mutate(guild.id, state => {
          const item = state.receipts.find(value => value.id === operationId)!; item.delivery = 'sent'; item.messageId = message.id; state.published++; return receiptResult(guild.id, item);
        });
      } catch {
        this.logger.warn('Confession send has an unknown outcome; automatic replay is disabled.', { guildId: guild.id, number: receipt.number });
        throw new BotMessageError('The confession send has an unknown outcome. Ask staff to check the channel before posting again.');
      }
    });
  }
}
