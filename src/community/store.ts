import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { defaultGuild, type CommunityConfig, type CommunityGuild } from './types.js';
import { mergeConfig } from './config.js';
import { MAX_MEMBERS_PER_GUILD } from './logic.js';
import { inviteReasonText, MAX_INVITE_LOG } from './invite-log.js';

interface State { version: 1; guilds: Record<string, CommunityGuild> }
export type StateWriter = (path: string, contents: string) => Promise<void>;

function nonnegative(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) && !Object.keys(value).some(key => ['__proto__', 'constructor', 'prototype'].includes(key)); }
function validateGuild(value: unknown): asserts value is CommunityGuild {
  const fail = () => { throw new Error('Invalid community guild data; existing file was preserved.'); };
  if (!record(value) || !record(value.config) || !record(value.counting) || !record(value.inviteMembers) || !record(value.inviteScores) || !record(value.levels)) return fail();
  const count = value.counting;
  if (!nonnegative(count.current) || !nonnegative(count.best) || (count.lastUserId !== null && typeof count.lastUserId !== 'string') || !Array.isArray(count.recentMessageIds) || count.recentMessageIds.length > 200 || !count.recentMessageIds.every(id => typeof id === 'string')) return fail();
  for (const map of [value.inviteMembers, value.inviteScores, value.levels]) if (Object.keys(map).length > MAX_MEMBERS_PER_GUILD) return fail();
  for (const member of Object.values(value.inviteMembers)) if (!record(member) || typeof member.active !== 'boolean' || (member.inviterId !== null && typeof member.inviterId !== 'string')) return fail();
  for (const score of Object.values(value.inviteScores)) if (!record(score) || !nonnegative(score.active) || !nonnegative(score.total) || score.active > score.total) return fail();
  if (!Object.hasOwn(value, 'inviteLog')) value.inviteLog = [];
  if (!Array.isArray(value.inviteLog) || value.inviteLog.length > MAX_INVITE_LOG) return fail();
  for (const entry of value.inviteLog) {
    if (!record(entry) || typeof entry.id !== 'string' || entry.id.length > 64 || !['joined', 'left'].includes(entry.event as string)
      || typeof entry.memberId !== 'string' || typeof entry.memberName !== 'string' || entry.memberName.length > 100
      || !nonnegative(entry.at) || (entry.joinedAt !== null && !nonnegative(entry.joinedAt))
      || !['invite', 'unknown'].includes(entry.source as string) || typeof entry.reason !== 'string' || !Object.hasOwn(inviteReasonText, entry.reason)
      || !['inviterId', 'inviteCode', 'inviteChannelId', 'referralInviterId'].every(key => entry[key] === null || (typeof entry[key] === 'string' && entry[key].length <= 100))) return fail();
    if (entry.source === 'unknown' && (entry.inviterId !== null || entry.inviteCode !== null || entry.inviteChannelId !== null || entry.reason === 'matched')) return fail();
    if (entry.source === 'invite' && (entry.inviteCode === null || entry.reason !== 'matched')) return fail();
  }
  for (const level of Object.values(value.levels)) if (!record(level) || !nonnegative(level.xp) || !nonnegative(level.lastAwardAt)) return fail();
  try { value.config = mergeConfig(defaultGuild().config, value.config); } catch { return fail(); }
  if (!Object.hasOwn(value, 'verificationPanel')) value.verificationPanel = null;
  const panel = value.verificationPanel;
  if (panel !== null && (!record(panel) || !['channelId', 'messageId', 'roleId'].every(key => typeof panel[key] === 'string' && /^\d{17,20}$/.test(panel[key] as string)) || !['reaction', 'challenge'].includes(panel.mode as string))) return fail();
}

async function atomicWrite(path: string, contents: string): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    const file = await open(temporary, 'wx', 0o600);
    try { await file.writeFile(contents, 'utf8'); await file.sync(); } finally { await file.close(); }
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }); }
}

/** One process owns this file. Mutations commit to disk before becoming visible in memory. */
export class CommunityStore {
  private state: State = { version: 1, guilds: {} };
  private tail: Promise<unknown> = Promise.resolve();
  private readonly path: string;
  constructor(private readonly directory: string, private readonly writer: StateWriter = atomicWrite) { this.path = join(directory, 'community.json'); }

  async init(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    try {
      const state: unknown = JSON.parse(await readFile(this.path, 'utf8'));
      if (!state || typeof state !== 'object' || !('version' in state) || state.version !== 1 || !('guilds' in state) || !state.guilds || typeof state.guilds !== 'object' || Array.isArray(state.guilds)) throw new Error('Invalid community.json; repair or restore it before starting.');
      if (!record(state.guilds)) throw new Error('Invalid community guild map; existing file was preserved.');
      for (const value of Object.values(state.guilds)) validateGuild(value);
      this.state = state as State;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }

  get(guildId: string): CommunityGuild { return structuredClone(Object.hasOwn(this.state.guilds, guildId) ? this.state.guilds[guildId]! : defaultGuild()); }
  config(guildId: string): CommunityConfig { return structuredClone(Object.hasOwn(this.state.guilds, guildId) ? this.state.guilds[guildId]!.config : defaultGuild().config); }
  level(guildId: string, userId: string): { xp: number; lastAwardAt: number } | undefined { return structuredClone(this.state.guilds[guildId]?.levels[userId]); }
  activeInviteMember(guildId: string, userId: string): boolean { return this.state.guilds[guildId]?.inviteMembers[userId]?.active === true; }

  mutate<T>(guildId: string, operation: (guild: CommunityGuild) => T): Promise<T> {
    if (['__proto__', 'constructor', 'prototype'].includes(guildId)) return Promise.reject(new Error('Invalid guild ID.'));
    const result = this.tail.then(async () => {
      const next = structuredClone(this.state);
      const guild = Object.hasOwn(next.guilds, guildId) ? next.guilds[guildId]! : defaultGuild();
      next.guilds[guildId] = guild;
      const value = operation(guild);
      await this.writer(this.path, JSON.stringify(next));
      this.state = next;
      return structuredClone(value);
    });
    this.tail = result.catch(() => undefined);
    return result;
  }

  async flush(): Promise<void> { await this.tail; }
  guildIds(): string[] { return Object.keys(this.state.guilds); }
  purgeGuild(guildId: string, shouldPurge: () => boolean = () => true): Promise<void> {
    const result = this.tail.then(async () => {
      if (!shouldPurge() || !Object.hasOwn(this.state.guilds, guildId)) return;
      const next = structuredClone(this.state);
      delete next.guilds[guildId];
      await this.writer(this.path, JSON.stringify(next));
      this.state = next;
    });
    this.tail = result.catch(() => undefined);
    return result;
  }
}
