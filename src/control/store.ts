import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseServerLocale, type ServerLocale } from './language.js';

export const COMMAND_KEYS = ['dashboard', 'twitch', 'kick', 'youtube', 'tiktok', 'streamalerts', 'streamer-leaderboard', 'counting', 'invites', 'rank', 'leaderboard', 'roles-panel', 'moderate', 'ticket', 'apply', 'staff-leaderboard', 'support-recovery','room','bugreport', 'poll', 'embed', 'suggestion', 'confess', 'playmusic', 'musicqueue', 'skipmusic', 'stopmusic', 'addtts', 'stoptts', 'ttsvoice'] as const;
export interface AccessConfig { managerAccess: boolean; dashboardRoleIds: string[]; commandRoles: Record<string, string[]> }
export interface PublishedPost { id: string; kind: 'message' | 'poll'; channelId: string; actorId: string; title: string; createdAt: string; status: 'pending' | 'sent'; messageId?: string; payloadHash: string }
interface ControlGuild { access: AccessConfig; posts: PublishedPost[]; locale: ServerLocale }
export const defaultAccess = (): AccessConfig => ({ managerAccess: true, dashboardRoleIds: [], commandRoles: {} });
export function parseAccess(input: unknown): AccessConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid access settings.');
  const v = input as Record<string, unknown>;
  if (Object.keys(v).some(k => !['managerAccess', 'dashboardRoleIds', 'commandRoles'].includes(k)) || typeof v.managerAccess !== 'boolean') throw new Error('Invalid access settings.');
  const roles = (value: unknown): string[] => {
    if (!Array.isArray(value) || value.length > 25 || !value.every(id => typeof id === 'string' && /^\d{17,20}$/.test(id))) throw new Error('Select up to 25 server roles.');
    return [...new Set(value)];
  };
  if (!v.commandRoles || typeof v.commandRoles !== 'object' || Array.isArray(v.commandRoles)) throw new Error('Invalid command role settings.');
  const commandRoles: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(v.commandRoles)) {
    if (!(COMMAND_KEYS as readonly string[]).includes(key)) throw new Error('Unknown command in access settings.');
    commandRoles[key] = roles(value);
  }
  return { managerAccess: v.managerAccess, dashboardRoleIds: roles(v.dashboardRoleIds), commandRoles };
}

/** The bot owns one file; every change is serialized and fsynced before it becomes visible. */
export class ControlStore {
  private guilds: Record<string, ControlGuild> = {};
  private tail: Promise<unknown> = Promise.resolve();
  private file: string;
  constructor(directory: string) { this.file = path.join(directory, 'control.json'); }
  async init(): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8'));
      if (data.version !== 1 || !data.guilds || typeof data.guilds !== 'object' || Array.isArray(data.guilds)) throw new Error('Invalid control.json; restore the file before starting.');
      for (const [id, value] of Object.entries(data.guilds)) {
        if (!/^\d{17,20}$/.test(id)) throw new Error('Invalid control guild.');
        const guild = value as ControlGuild; guild.access = parseAccess(guild.access);
        guild.locale = guild.locale === undefined ? 'en' : parseServerLocale(guild.locale);
        if (!Array.isArray(guild.posts) || guild.posts.length > 500 || guild.posts.some(p => !p || typeof p.id !== 'string' || !['pending','sent'].includes(p.status) || !['message','poll'].includes(p.kind) || !/^\d{17,20}$/.test(p.channelId) || typeof p.payloadHash !== 'string')) throw new Error('Invalid publishing history.');
      }
      this.guilds = data.guilds;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  get(guildId: string): ControlGuild { return structuredClone(this.guilds[guildId] ?? { access: defaultAccess(), posts: [], locale: 'en' }); }
  mutate<T>(guildId: string, fn: (guild: ControlGuild) => T | Promise<T>): Promise<T> {
    if (!/^\d{17,20}$/.test(guildId)) return Promise.reject(new Error('Invalid server.'));
    const job = this.tail.then(async () => {
      const next = structuredClone(this.guilds); const guild = next[guildId] ??= { access: defaultAccess(), posts: [], locale: 'en' };
      const result = await fn(guild); await this.write(next); this.guilds = next; return structuredClone(result);
    }); this.tail = job.catch(() => undefined); return job;
  }
  private async write(guilds: Record<string, ControlGuild>): Promise<void> {
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
    const job = this.tail.then(async () => { if (!guard() || !Object.hasOwn(this.guilds, id)) return; const next = structuredClone(this.guilds); delete next[id]; await this.write(next); this.guilds = next; });
    this.tail = job.catch(() => undefined); await job;
  }
}
