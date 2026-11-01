import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { MAX_HISTORY, MAX_OPEN, object, snowflake, validateRaffle, type Raffle } from './types.js';

export class RaffleStore {
  private guilds: Record<string, Raffle[]> = {};
  private tail: Promise<unknown> = Promise.resolve();
  private file: string;
  constructor(directory: string) { this.file = path.join(directory, 'raffles.json'); }
  async init() {
    await mkdir(path.dirname(this.file), { recursive: true });
    try {
      const data: unknown = JSON.parse(await readFile(this.file, 'utf8'));
      if (!object(data) || data.version !== 1 || !object(data.guilds)) throw new Error('Invalid raffle file.');
      for (const [id, rows] of Object.entries(data.guilds)) { if (!snowflake(id)) throw new Error('Invalid raffle server.'); this.validate(rows); }
      this.guilds = data.guilds as Record<string, Raffle[]>;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  private validate(rows: unknown): asserts rows is Raffle[] {
    if (!Array.isArray(rows) || rows.length > MAX_HISTORY + MAX_OPEN) throw new Error('Invalid raffle history.');
    const ids = new Set<string>(); for (const r of rows) { validateRaffle(r); if (ids.has(r.id)) throw new Error('Duplicate raffle.'); ids.add(r.id); }
  }
  get(id: string): Raffle[] { if (!snowflake(id)) throw new Error('Invalid server.'); return structuredClone(this.guilds[id] ?? []); }
  mutate<T>(id: string, fn: (rows: Raffle[]) => T): Promise<T> {
    if (!snowflake(id)) return Promise.reject(new Error('Invalid server.'));
    const task = this.tail.then(async () => {
      const next = structuredClone(this.guilds), rows = next[id] ??= [], result = fn(rows);
      this.validate(rows); await this.write(next); this.guilds = next; return structuredClone(result);
    }); this.tail = task.catch(() => undefined); return task;
  }
  private async write(guilds: Record<string, Raffle[]>) {
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try { const file = await open(temporary, 'wx', 0o600); try { await file.writeFile(JSON.stringify({ version: 1, guilds })); await file.sync(); } finally { await file.close(); } await rename(temporary, this.file); }
    finally { await rm(temporary, { force: true }); }
  }
  async guildIds() { return Object.keys(this.guilds); }
  async flush() { await this.tail; }
  async purgeGuild(id: string, guard: () => boolean = () => true) {
    const task = this.tail.then(async () => { if (!guard() || !Object.hasOwn(this.guilds, id)) return; const next = structuredClone(this.guilds); delete next[id]; await this.write(next); this.guilds = next; });
    this.tail = task.catch(() => undefined); await task;
  }
}
