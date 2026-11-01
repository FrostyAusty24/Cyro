import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { commandConfig, fields, MAX_CUSTOM_COMMANDS, parseCommand, snowflake, type CommandRecord } from './types.js';

function validate(records: CommandRecord[]): void {
  if (!Array.isArray(records) || records.length > MAX_CUSTOM_COMMANDS) throw new Error('Invalid custom commands file.');
  const ids = new Set<string>(), names = new Set<string>(), discordIds = new Set<string>();
  for (const record of records) {
    if (!fields(record, ['id','revision','name','description','mode','content','title','color','channelIds','ephemeral','discordId','status'])) throw new Error('Invalid custom command record.');
    parseCommand(commandConfig(record));
    if (record.revision < 1 || ids.has(record.id) || names.has(record.name) || !['pending','synced','error','deleting'].includes(record.status)
      || (record.discordId !== null && (!snowflake(record.discordId) || discordIds.has(record.discordId))) || (record.status === 'synced' && !record.discordId)) throw new Error('Invalid custom command history.');
    ids.add(record.id); names.add(record.name); if (record.discordId) discordIds.add(record.discordId);
  }
}
export class CustomCommandStore {
  private guilds: Record<string, CommandRecord[]> = {};
  private tail: Promise<unknown> = Promise.resolve();
  private readonly file: string;
  constructor(directory: string) { this.file = path.join(directory, 'custom-commands.json'); }
  async init(): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8'));
      if (!fields(data, ['version','guilds']) || data.version !== 1 || !data.guilds || typeof data.guilds !== 'object' || Array.isArray(data.guilds)) throw new Error('Invalid custom commands file.');
      for (const [id, records] of Object.entries(data.guilds)) { if (!snowflake(id)) throw new Error('Invalid custom command server.'); validate(records as CommandRecord[]); }
      this.guilds = data.guilds as Record<string, CommandRecord[]>;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  get(guildId: string): CommandRecord[] { if (!snowflake(guildId)) throw new Error('Invalid server.'); return structuredClone(this.guilds[guildId] ?? []); }
  mutate<T>(guildId: string, fn: (records: CommandRecord[]) => T): Promise<T> {
    if (!snowflake(guildId)) return Promise.reject(new Error('Invalid server.'));
    const task = this.tail.then(async () => {
      const next = structuredClone(this.guilds), records = next[guildId] ??= [];
      const result = fn(records); validate(records); await this.write(next); this.guilds = next; return structuredClone(result);
    }); this.tail = task.catch(() => undefined); return task;
  }
  private async write(guilds: Record<string, CommandRecord[]>): Promise<void> {
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
    const task = this.tail.then(async () => { if (!guard() || !Object.hasOwn(this.guilds, guildId)) return;
      const next = structuredClone(this.guilds); delete next[guildId]; await this.write(next); this.guilds = next;
    }); this.tail = task.catch(() => undefined); await task;
  }
}
