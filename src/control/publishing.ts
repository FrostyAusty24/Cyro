import { createHash } from 'node:crypto';
import { ChannelType, PermissionFlagsBits, type Client, type Guild, type MessageCreateOptions, type TextChannel, type NewsChannel, type APIEmbed } from 'discord.js';
import { ControlStore } from './store.js';
import { AccessService } from './access.js';

const object = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Send a message or poll object.'); return v as Record<string, unknown>; };
function text(v: unknown, max: number, label: string, required = false): string {
  if (v === undefined && !required) return '';
  if (typeof v !== 'string' || v.length > max || (required && !v.trim())) throw new Error(`${label} must contain ${required ? 1 : 0}–${max} characters.`);
  return v.trim();
}
function url(v: unknown): string | undefined {
  const value = text(v, 2000, 'URL'); if (!value) return;
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Use an HTTPS image or link URL without credentials.');
  return parsed.toString(); // Passed to Discord; the bot never fetches arbitrary URLs.
}
export function messagePayload(input: unknown): MessageCreateOptions {
  const v = object(input); const content = text(v.content, 2000, 'Message');
  const embeds: APIEmbed[] = [];
  if (v.embed !== undefined && v.embed !== null) {
    const e = object(v.embed);
    const title = text(e.title, 256, 'Title'), description = text(e.description, 4096, 'Description');
    const footer = text(e.footer, 2048, 'Footer'), author = text(e.author, 256, 'Author');
    if (!Array.isArray(e.fields ?? []) || (e.fields as unknown[] | undefined)?.length! > 25) throw new Error('Use at most 25 embed fields.');
    const fields = ((e.fields ?? []) as unknown[]).map(value => {
      const f = object(value); if (typeof f.inline !== 'boolean') throw new Error('Field inline must be true or false.');
      return { name: text(f.name, 256, 'Field name', true), value: text(f.value, 1024, 'Field value', true), inline: f.inline };
    });
    if (title.length + description.length + footer.length + author.length + fields.reduce((n, f) => n + f.name.length + f.value.length, 0) > 6000) throw new Error('Embed text must total 6,000 characters or fewer.');
    let color: number | undefined;
    if (e.color !== null && e.color !== undefined && e.color !== '') {
      if (typeof e.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(e.color)) throw new Error('Choose a six-digit embed color or no color bar.');
      color = Number.parseInt(e.color.slice(1), 16);
    }
    const image = url(e.image), thumbnail = url(e.thumbnail), link = url(e.url);
    if (!title && !description && !fields.length && !image && !thumbnail && !author && !footer) throw new Error('Add some content to the embed.');
    embeds.push({ ...(title ? { title } : {}), ...(description ? { description } : {}), ...(color !== undefined ? { color } : {}), ...(footer ? { footer: { text: footer } } : {}), ...(author ? { author: { name: author } } : {}), ...(fields.length ? { fields } : {}), ...(image ? { image: { url: image } } : {}), ...(thumbnail ? { thumbnail: { url: thumbnail } } : {}), ...(link ? { url: link } : {}) });
  }
  if (!content && !embeds.length) throw new Error('Add a message or embed before publishing.');
  return { ...(content ? { content } : {}), ...(embeds.length ? { embeds } : {}), allowedMentions: { parse: [], repliedUser: false } };
}
export function pollPayload(input: unknown): MessageCreateOptions {
  const v = object(input); const question = text(v.question, 300, 'Poll question', true);
  if (!Array.isArray(v.answers) || v.answers.length < 2 || v.answers.length > 10) throw new Error('Add between 2 and 10 answers.');
  const answers = v.answers.map(a => text(a, 55, 'Answer', true));
  if (new Set(answers.map(a => a.toLowerCase())).size !== answers.length) throw new Error('Each poll answer must be different.');
  if (!Number.isInteger(v.duration) || (v.duration as number) < 1 || (v.duration as number) > 768) throw new Error('Poll duration must be 1–768 hours.');
  if (typeof v.multiple !== 'boolean') throw new Error('Choose single or multiple answers.');
  return { poll: { question: { text: question }, answers: answers.map(answer => ({ text: answer })), duration: v.duration as number, allowMultiselect: v.multiple }, allowedMentions: { parse: [], repliedUser: false } };
}

export class PublishingService {
  private queues = new Map<string, Promise<unknown>>();
  constructor(private client: Client, private store: ControlStore, private access: AccessService) {}
  list(guildId: string) { return this.store.get(guildId).posts; }
  private async channel(guild: Guild, id: string, actorId: string, poll: boolean): Promise<TextChannel | NewsChannel> {
    const actor = await this.access.dashboard(guild, actorId);
    const channel = await guild.channels.fetch(id);
    if (!channel || channel.guild.id !== guild.id || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) throw new Error('Choose a text or announcement channel in this server.');
    if (poll && channel.type !== ChannelType.GuildText) throw new Error('Polls need a regular text channel.');
    const bot = await guild.members.fetchMe();
    const required = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, ...(poll ? [PermissionFlagsBits.SendPolls] : [PermissionFlagsBits.EmbedLinks])];
    if (!channel.permissionsFor(actor)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) throw new Error('You need View Channel and Send Messages in the selected channel.');
    if (!channel.permissionsFor(bot)?.has(required)) throw new Error(`Cyro needs View Channel, Send Messages, and ${poll ? 'Send Polls' : 'Embed Links'} in this channel.`);
    return channel as TextChannel | NewsChannel;
  }
  async publish(guild: Guild, actorId: string, input: unknown, kind: 'message' | 'poll') {
    const v = object(input);
    if (typeof v.operationId !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(v.operationId) || typeof v.channelId !== 'string' || !/^\d{17,20}$/.test(v.channelId)) throw new Error('Choose a channel and use a valid publish request.');
    const id = v.operationId, channelId = v.channelId;
    const payload = kind === 'poll' ? pollPayload(v) : messagePayload(v);
    const hash = createHash('sha256').update(JSON.stringify({ kind, channelId, payload })).digest('hex');
    const previous = this.queues.get(guild.id) ?? Promise.resolve();
    const task = previous.catch(() => undefined).then(async () => {
      const channel = await this.channel(guild, channelId, actorId, kind === 'poll');
      const posts = this.store.get(guild.id).posts;
      const existing = posts.find(p => p.id === id);
      if (existing) {
        if (existing.actorId !== actorId || existing.payloadHash !== hash) throw new Error('This publish request was already used for different content.');
        if (existing.status === 'sent') return existing;
        throw new Error('The earlier send has an unknown outcome. Check the channel before starting a new post; Cyro will not repeat it automatically.');
      }
      if (posts.filter(p => p.status === 'pending').length >= 100) throw new Error('Publishing has too many unconfirmed sends. Contact the bot operator.');
      if (posts.filter(p => Date.parse(p.createdAt) > Date.now() - 60_000).length >= 5) throw new Error('Wait a minute before publishing more messages.');
      const record = { id, kind, channelId, actorId, title: text(kind === 'poll' ? v.question : (v.embed as Record<string, unknown> | undefined)?.title ?? v.content ?? 'Embedded message', kind === 'poll' ? 300 : 2000, 'Title').slice(0, 100), createdAt: new Date().toISOString(), status: 'pending' as const, payloadHash: hash };
      await this.store.mutate(guild.id, g => { g.posts = [...g.posts.filter(p => p.status === 'pending'), ...g.posts.filter(p => p.status === 'sent').slice(-299), record]; });
      // Nonce protects Discord's own retry window. Persistent pending state prevents replay after restarts.
      const message = await channel.send({ ...payload, nonce: createHash('sha256').update(`${guild.id}:${id}`).digest('hex').slice(0, 24), enforceNonce: true });
      return this.store.mutate(guild.id, g => { const saved = g.posts.find(p => p.id === id)!; saved.status = 'sent'; saved.messageId = message.id; return saved; });
    });
    this.queues.set(guild.id, task); void task.finally(() => { if (this.queues.get(guild.id) === task) this.queues.delete(guild.id); }).catch(() => undefined);
    return task;
  }
  async endPoll(guild: Guild, actorId: string, id: string) {
    const post = this.store.get(guild.id).posts.find(p => p.id === id && p.kind === 'poll' && p.status === 'sent');
    if (!post?.messageId) throw new Error('This poll is not in this server’s publishing history.');
    const channel = await this.channel(guild, post.channelId, actorId, true);
    const message = await channel.messages.fetch(post.messageId);
    if (message.author.id !== this.client.user?.id || !message.poll) throw new Error('This is not a Cyro poll.');
    if (!message.poll.expiresAt || message.poll.expiresAt.getTime() > Date.now()) await message.poll.end();
    return { ok: true };
  }
}
