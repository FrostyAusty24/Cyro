import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaultConfessionsGuild, MAX_RECEIPTS, parseConfessionsConfig, snowflake, type ConfessionsGuild } from './types.js';

function validateGuild(input: unknown): ConfessionsGuild {
  const invalid = (): never => { throw new Error('Invalid confessions history; restore confessions.json before starting.'); };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid();
  const guild = input as ConfessionsGuild;
  if (Object.keys(guild).some(key => !['config', 'nextNumber', 'published', 'receipts'].includes(key))) return invalid();
  guild.config = parseConfessionsConfig(guild.config);
  if (!Number.isSafeInteger(guild.nextNumber) || guild.nextNumber < 1 || !Number.isSafeInteger(guild.published) || guild.published < 0 || guild.published >= guild.nextNumber || !Array.isArray(guild.receipts) || guild.receipts.length > MAX_RECEIPTS) return invalid();
  const ids = new Set<string>(), numbers = new Set<number>();
  for (const receipt of guild.receipts) {
    if (!receipt || Object.keys(receipt).some(key => !['id', 'number', 'channelId', 'createdAt', 'delivery', 'messageId'].includes(key)) || !snowflake(receipt.id) || ids.has(receipt.id) || !Number.isSafeInteger(receipt.number) || receipt.number < 1 || receipt.number >= guild.nextNumber || numbers.has(receipt.number) || !snowflake(receipt.channelId) || !Number.isFinite(Date.parse(receipt.createdAt)) || !['pending', 'sent'].includes(receipt.delivery) || (receipt.delivery === 'sent' ? !snowflake(receipt.messageId) : receipt.messageId !== undefined)) return invalid();
    ids.add(receipt.id); numbers.add(receipt.number);
  }
  return guild;
}

/** Single-process atomic store. Strict receipt fields prevent accidental retention of text or authors. */
export class ConfessionsStore {
  private guilds: Record<string, ConfessionsGuild> = {};
  private tail: Promise<unknown> = Promise.resolve();
  private readonly file: string;
  constructor(directory: string) { this.file = path.join(directory, 'confessions.json'); }
  async init(): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8'));
      if (data.version !== 1 || !data.guilds || typeof data.guilds !== 'object' || Array.isArray(data.guilds)) throw new Error('Invalid confessions file; restore confessions.json before starting.');
      for (const [id, value] of Object.entries(data.guilds)) { if (!snowflake(id)) throw new Error('Invalid confessions server.'); validateGuild(value); }
      this.guilds = data.guilds;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  get(guildId: string): ConfessionsGuild { return structuredClone(this.guilds[guildId] ?? defaultConfessionsGuild()); }
  mutate<T>(guildId: string, fn: (state: ConfessionsGuild) => T): Promise<T> {
    if (!snowflake(guildId)) return Promise.reject(new Error('Invalid server.'));
    const job = this.tail.then(async () => {
      const next = structuredClone(this.guilds), state = next[guildId] ??= defaultConfessionsGuild();
      const result = fn(state); validateGuild(state); await this.write(next); this.guilds = next; return structuredClone(result);
    }); this.tail = job.catch(() => undefined); return job;
  }
  private async write(guilds: Record<string, ConfessionsGuild>): Promise<void> {
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try {
      const file = await open(temporary, 'wx', 0o600);
      try { await file.writeFile(JSON.stringify({ version: 1, guilds })); await file.sync(); } finally { await file.close(); }
      await rename(temporary, this.file);
    } finally { await rm(temporary, { force: true }); }
  }
  async guildIds(): Promise<string[]> { return Object.keys(this.guilds); }
  async flush(): Promise<void> { await this.tail; }
  async purgeGuild(guildId: string, guard: () => boolean = () => true): Promise<void> {
    const job = this.tail.then(async () => {
      if (!guard() || !Object.hasOwn(this.guilds, guildId)) return;
      const next = structuredClone(this.guilds); delete next[guildId]; await this.write(next); this.guilds = next;
    }); this.tail = job.catch(() => undefined); await job;
  }
}
