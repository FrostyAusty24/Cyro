import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaultTimeClockGuild, MAX_PANELS, MAX_RECEIPTS, panelOperationId, parseTimeClockConfig, snowflake, type TimeClockGuild, type TimeClockMember } from './types.js';

const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const fields = (value: unknown, keys: string[]): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key));
function memberValid(value: unknown): value is TimeClockMember {
  if (!fields(value, ['completedMs', 'startedAt', 'shifts', 'lastShiftMs'])) return false;
  return integer(value.completedMs) && integer(value.shifts) && integer(value.lastShiftMs) && value.lastShiftMs <= value.completedMs && (value.startedAt === null || integer(value.startedAt));
}
function validateGuild(input: unknown): TimeClockGuild {
  const invalid = (): never => { throw new Error('Invalid time clock history; restore time-clock.json before starting.'); };
  if (!fields(input, ['config', 'members', 'receipts', 'panels'])) return invalid();
  const value = input as unknown as TimeClockGuild;
  value.config = parseTimeClockConfig(value.config);
  if (!value.members || typeof value.members !== 'object' || Array.isArray(value.members) || !Array.isArray(value.receipts) || value.receipts.length > MAX_RECEIPTS || !Array.isArray(value.panels) || value.panels.length > MAX_PANELS) return invalid();
  for (const [id, member] of Object.entries(value.members)) if (!snowflake(id) || !memberValid(member)) return invalid();
  const receiptIds = new Set<string>();
  for (const receipt of value.receipts) {
    if (!fields(receipt, ['id', 'userId', 'action', 'at', 'row']) || !snowflake(receipt.id) || receiptIds.has(receipt.id) || !snowflake(receipt.userId) || !['in', 'out'].includes(receipt.action) || !integer(receipt.at) || !fields(receipt.row, ['userId', 'completedMs', 'startedAt', 'shifts', 'lastShiftMs', 'activeMs', 'totalMs'])) return invalid();
    const { userId, totalMs, activeMs, ...member } = receipt.row;
    if (userId !== receipt.userId || !memberValid(member) || !integer(totalMs) || !integer(activeMs) || totalMs !== member.completedMs + activeMs || (receipt.action === 'in' ? member.startedAt === null : member.startedAt !== null) || !value.members[userId]) return invalid();
    receiptIds.add(receipt.id);
  }
  const panelIds = new Set<string>();
  for (const panel of value.panels) {
    if (!fields(panel, ['id', 'actorId', 'channelId', 'delivery', 'messageId']) || !panelOperationId(panel.id) || panelIds.has(panel.id) || !snowflake(panel.actorId) || !snowflake(panel.channelId) || !['pending', 'sent'].includes(panel.delivery) || (panel.delivery === 'sent' ? !snowflake(panel.messageId) : panel.messageId !== undefined)) return invalid();
    panelIds.add(panel.id);
  }
  return value;
}

/** One bot process owns this atomic store. Memory advances only after a successful file replacement. */
export class TimeClockStore {
  private guilds: Record<string, TimeClockGuild> = {};
  private tail: Promise<unknown> = Promise.resolve();
  private readonly file: string;
  constructor(directory: string) { this.file = path.join(directory, 'time-clock.json'); }
  async init(): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8'));
      if (!fields(data, ['version', 'guilds']) || data.version !== 1 || !data.guilds || typeof data.guilds !== 'object' || Array.isArray(data.guilds)) throw new Error('Invalid time clock file; restore time-clock.json before starting.');
      for (const [id, value] of Object.entries(data.guilds)) { if (!snowflake(id)) throw new Error('Invalid time clock server.'); validateGuild(value); }
      this.guilds = data.guilds as Record<string, TimeClockGuild>;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  get(guildId: string): TimeClockGuild { if (!snowflake(guildId)) throw new Error('Invalid server.'); return structuredClone(this.guilds[guildId] ?? defaultTimeClockGuild()); }
  mutate<T>(guildId: string, fn: (state: TimeClockGuild) => T): Promise<T> {
    if (!snowflake(guildId)) return Promise.reject(new Error('Invalid server.'));
    const job = this.tail.then(async () => {
      const next = structuredClone(this.guilds), state = next[guildId] ??= defaultTimeClockGuild();
      const result = fn(state); validateGuild(state); await this.write(next); this.guilds = next; return structuredClone(result);
    }); this.tail = job.catch(() => undefined); return job;
  }
  private async write(guilds: Record<string, TimeClockGuild>): Promise<void> {
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
