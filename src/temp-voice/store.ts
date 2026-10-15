import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { defaultTempVoiceGuild, parseTempVoiceConfig, snowflake, type TempVoiceGuild } from './types.js';

function validate(value: TempVoiceGuild): void {
  const invalid = () => { throw new Error('Invalid temporary voice data; restore temp-voice.json before starting.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  value.config = parseTempVoiceConfig(value.config);
  if (!Array.isArray(value.rooms) || value.rooms.length > 100) return invalid();
  const owners = new Set<string>(), ids = new Set<string>(), channels = new Set<string>();
  for (const room of value.rooms) {
    if (!room || !/^[a-f0-9]{32}$/.test(room.id) || ids.has(room.id) || !snowflake(room.ownerId) || owners.has(room.ownerId)
      || (room.channelId !== null && (!snowflake(room.channelId) || channels.has(room.channelId))) || !snowflake(room.categoryId)
      || room.creationName !== `cyro-room-${room.id}` || typeof room.name !== 'string' || room.name.length > 100
      || !Number.isSafeInteger(room.createdAt) || room.createdAt < 0 || !['creating', 'active', 'deleting'].includes(room.state)
      || (room.state !== 'creating' && !room.channelId) || typeof room.locked !== 'boolean' || typeof room.permissionsPending !== 'boolean'
      || !Array.isArray(room.allowed) || !Array.isArray(room.blocked) || room.allowed.length > 50 || room.blocked.length > 50
      || [...room.allowed, ...room.blocked].some(id => !snowflake(id)) || !room.connectBaseline || typeof room.connectBaseline !== 'object' || Array.isArray(room.connectBaseline)) return invalid();
    for (const [id, before] of Object.entries(room.connectBaseline)) if (!snowflake(id) || !before || ![0, 1].includes(before.type) || ['existed', 'allow', 'deny'].some(key => typeof before[key as keyof typeof before] !== 'boolean')) return invalid();
    owners.add(room.ownerId); ids.add(room.id); if (room.channelId) channels.add(room.channelId);
  }
}

/** One process owns the atomic file. Creation receipts are durable before a channel is requested. */
export class TempVoiceStore {
  private guilds: Record<string, TempVoiceGuild> = {};
  private tail: Promise<unknown> = Promise.resolve();
  private readonly file: string;
  constructor(directory: string) { this.file = path.join(directory, 'temp-voice.json'); }
  async init(): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8'));
      if (data.version !== 1 || !data.guilds || typeof data.guilds !== 'object' || Array.isArray(data.guilds)) throw new Error('Invalid temp-voice.json; restore the saved file.');
      for (const [id, value] of Object.entries(data.guilds)) { if (!snowflake(id)) throw new Error('Invalid temporary voice server.'); validate(value as TempVoiceGuild); }
      this.guilds = data.guilds;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  get(id: string): TempVoiceGuild { return structuredClone(this.guilds[id] ?? defaultTempVoiceGuild()); }
  mutate<T>(id: string, update: (guild: TempVoiceGuild) => T): Promise<T> {
    if (!snowflake(id)) return Promise.reject(new Error('Invalid server.'));
    const task = this.tail.then(async () => { const next = structuredClone(this.guilds), value = next[id] ??= defaultTempVoiceGuild(); const result = update(value); validate(value); await this.write(next); this.guilds = next; return structuredClone(result); });
    this.tail = task.catch(() => undefined); return task;
  }
  private async write(guilds: Record<string, TempVoiceGuild>): Promise<void> {
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try { const file = await open(temporary, 'wx', 0o600); try { await file.writeFile(JSON.stringify({ version: 1, guilds })); await file.sync(); } finally { await file.close(); } await rename(temporary, this.file); }
    finally { await rm(temporary, { force: true }); }
  }
  async flush(): Promise<void> { await this.tail; }
  async guildIds(): Promise<string[]> { return Object.keys(this.guilds); }
  async purgeGuild(id: string, guard: () => boolean = () => true): Promise<void> {
    const task = this.tail.then(async () => { if (!guard() || !Object.hasOwn(this.guilds, id)) return; const next = structuredClone(this.guilds); delete next[id]; await this.write(next); this.guilds = next; });
    this.tail = task.catch(() => undefined); await task;
  }
}
