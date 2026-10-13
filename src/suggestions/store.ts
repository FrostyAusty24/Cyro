import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaultSuggestionsGuild, MAX_HISTORY, MAX_VOTERS, parseSuggestionsConfig, snowflake, type SuggestionsGuild } from './types.js';

function validateGuild(input: unknown): SuggestionsGuild {
  const invalid = () => { throw new Error('Invalid suggestions history; restore suggestions.json before starting.'); };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid();
  const guild = input as SuggestionsGuild;
  guild.config = parseSuggestionsConfig(guild.config);
  if (!Number.isSafeInteger(guild.nextNumber) || guild.nextNumber < 1 || !Array.isArray(guild.items) || guild.items.length > MAX_HISTORY) return invalid();
  const ids = new Set<string>(), numbers = new Set<number>();
  for (const item of guild.items) {
    if (!item || !snowflake(item.id) || ids.has(item.id) || !Number.isSafeInteger(item.number) || item.number < 1 || item.number >= guild.nextNumber || numbers.has(item.number) || !snowflake(item.authorId) || !snowflake(item.channelId) || typeof item.authorName !== 'string' || !item.authorName || item.authorName.length > 100 || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 2000 || !Number.isFinite(Date.parse(item.createdAt)) || !['open', 'accepted', 'declined', 'closed'].includes(item.status) || !['pending', 'sent'].includes(item.delivery) || typeof item.syncPending !== 'boolean' || (item.delivery === 'sent' && !snowflake(item.messageId)) || !item.votes || typeof item.votes !== 'object' || Array.isArray(item.votes) || Object.keys(item.votes).length > MAX_VOTERS) return invalid();
    if ((item.delivery === 'pending' && (item.messageId || Object.keys(item.votes).length)) || (item.status === 'open' && item.decision)) return invalid();
    if (item.status !== 'open') {
      const d = item.decision;
      if (!d || !snowflake(d.actorId) || d.status !== item.status || typeof d.reason !== 'string' || d.reason.length > 1000 || !Number.isFinite(Date.parse(d.at))) return invalid();
    }
    for (const [userId, vote] of Object.entries(item.votes)) if (!snowflake(userId) || !vote || !['up', 'down', null].includes(vote.choice) || !snowflake(vote.interactionId)) return invalid();
    ids.add(item.id); numbers.add(item.number);
  }
  return guild;
}

/** One process owns this file; mutations become visible only after an atomic, fsynced save. */
export class SuggestionsStore {
  private guilds: Record<string, SuggestionsGuild> = {};
  private tail: Promise<unknown> = Promise.resolve();
  private file: string;
  constructor(directory: string) { this.file = path.join(directory, 'suggestions.json'); }
  async init(): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8'));
      if (data.version !== 1 || !data.guilds || typeof data.guilds !== 'object' || Array.isArray(data.guilds)) throw new Error('Invalid suggestions file; restore suggestions.json before starting.');
      for (const [id, value] of Object.entries(data.guilds)) { if (!snowflake(id)) throw new Error('Invalid suggestions server.'); validateGuild(value); }
      this.guilds = data.guilds;
    }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  get(guildId: string): SuggestionsGuild { return structuredClone(this.guilds[guildId] ?? defaultSuggestionsGuild()); }
  mutate<T>(guildId: string, fn: (guild: SuggestionsGuild) => T): Promise<T> {
    if (!/^\d{17,20}$/.test(guildId)) return Promise.reject(new Error('Invalid server.'));
    const job = this.tail.then(async () => {
      const next = structuredClone(this.guilds); const guild = next[guildId] ??= defaultSuggestionsGuild();
      const result = fn(guild); await this.write(next); this.guilds = next; return structuredClone(result);
    }); this.tail = job.catch(() => undefined); return job;
  }
  private async write(guilds: Record<string, SuggestionsGuild>): Promise<void> {
    const tmp = `${this.file}.${randomUUID()}.tmp`;
    try {
      const file = await open(tmp, 'wx', 0o600);
      try { await file.writeFile(JSON.stringify({ version: 1, guilds })); await file.sync(); } finally { await file.close(); }
      await rename(tmp, this.file);
    } finally { await rm(tmp, { force: true }); }
  }
  async guildIds(): Promise<string[]> { return Object.keys(this.guilds); }
  async flush(): Promise<void> { await this.tail; }
  async purgeGuild(id: string, guard: () => boolean = () => true): Promise<void> {
    const job = this.tail.then(async () => {
      if (!guard() || !Object.hasOwn(this.guilds, id)) return;
      const next = structuredClone(this.guilds); delete next[id]; await this.write(next); this.guilds = next;
    }); this.tail = job.catch(() => undefined); await job;
  }
}
