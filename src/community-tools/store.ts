import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { bugStatuses, defaultCommunityToolsGuild, key, MAX_REPORTS, parseBugContent, parseCommunityToolsConfig, snowflake, type CommunityToolsGuild } from './types.js';
function validate(input: unknown): CommunityToolsGuild {
  const invalid = (): never => { throw new Error('Invalid community-tools.json; restore the file before starting.'); };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid();
  const v = input as CommunityToolsGuild; v.config = parseCommunityToolsConfig(v.config);
  if (!Number.isSafeInteger(v.nextNumber) || v.nextNumber < 1 || !Array.isArray(v.reports) || v.reports.length > MAX_REPORTS || !v.receipts || typeof v.receipts !== 'object' || Array.isArray(v.receipts) || Object.keys(v.receipts).length > 100) return invalid();
  const ids = new Set<string>(), numbers = new Set<number>();
  for (const r of v.reports) {
    if (!r || !snowflake(r.id) || ids.has(r.id) || !Number.isSafeInteger(r.number) || r.number < 1 || r.number >= v.nextNumber || numbers.has(r.number) || !snowflake(r.authorId) || !snowflake(r.channelId) || !key(r.categoryId) || typeof r.authorName !== 'string' || r.authorName.length > 100 || typeof r.categoryName !== 'string' || !r.categoryName || r.categoryName.length > 60 || !Number.isFinite(Date.parse(r.createdAt)) || !bugStatuses.includes(r.status) || !['pending', 'sent'].includes(r.delivery) || typeof r.syncPending !== 'boolean' || (r.delivery === 'sent' ? !snowflake(r.messageId) : r.messageId !== undefined)) return invalid();
    parseBugContent({ title: r.title, details: r.details, steps: r.steps });
    if (r.decision && (!snowflake(r.decision.actorId) || r.decision.status !== r.status || !Number.isFinite(Date.parse(r.decision.at)))) return invalid();
    ids.add(r.id); numbers.add(r.number);
  }
  for (const [id, r] of Object.entries(v.receipts)) if (!key(id) || !r || !snowflake(r.channelId) || [r.messageId, r.previousMessageId, r.lastActivityId].some(x => x !== undefined && !snowflake(x)) || (r.pendingNonce !== undefined && !/^[a-f0-9]{24}$/.test(r.pendingNonce)) || !Number.isSafeInteger(r.activity) || r.activity < 0 || r.activity > 100 || !Number.isSafeInteger(r.lastPostedAt) || r.lastPostedAt < 0 || !Number.isSafeInteger(r.dueAt) || r.dueAt < 0) return invalid();
  return v;
}
export class CommunityToolsStore {
  private guilds: Record<string, CommunityToolsGuild> = {};
  private tail: Promise<unknown> = Promise.resolve();
  private readonly file: string;
  constructor(directory: string) { this.file = path.join(directory, 'community-tools.json'); }
  async init() { await mkdir(path.dirname(this.file), { recursive: true }); try { const value = JSON.parse(await readFile(this.file, 'utf8')); if (value.version !== 1 || !value.guilds || typeof value.guilds !== 'object' || Array.isArray(value.guilds)) throw new Error('Invalid community-tools.json.'); for (const [id, entry] of Object.entries(value.guilds)) { if (!snowflake(id)) throw new Error('Invalid community tools server.'); validate(entry); } this.guilds = value.guilds; } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; } }
  get(id: string) { return structuredClone(this.guilds[id] ?? defaultCommunityToolsGuild()); }
  mutate<T>(id: string, callback: (guild: CommunityToolsGuild) => T): Promise<T> { if (!snowflake(id)) return Promise.reject(new Error('Invalid server.')); const job = this.tail.then(async () => { const next = structuredClone(this.guilds), guild = next[id] ??= defaultCommunityToolsGuild(); const result = callback(guild); await this.write(next); this.guilds = next; return structuredClone(result); }); this.tail = job.catch(() => undefined); return job; }
  private async write(guilds: Record<string, CommunityToolsGuild>) { const tmp = `${this.file}.${randomUUID()}.tmp`; try { const file = await open(tmp, 'wx', 0o600); try { await file.writeFile(JSON.stringify({ version: 1, guilds })); await file.sync(); } finally { await file.close(); } await rename(tmp, this.file); } finally { await rm(tmp, { force: true }); } }
  async guildIds() { return Object.keys(this.guilds); }
  async flush() { await this.tail; }
  async purgeGuild(id: string, guard: () => boolean = () => true) { const job = this.tail.then(async () => { if (!guard() || !Object.hasOwn(this.guilds, id)) return; const next = structuredClone(this.guilds); delete next[id]; await this.write(next); this.guilds = next; }); this.tail = job.catch(() => undefined); await job; }
}
