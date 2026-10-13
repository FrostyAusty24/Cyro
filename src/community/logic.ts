import type { CommunityGuild } from './types.js';
import { resolveInviteSource } from './invite-log.js';

export interface InviteUse { code: string; uses: number; inviterId: string | null; channelId?: string | null }
export const MAX_MEMBERS_PER_GUILD = 100_000;

export function awardMessageXp(guild: CommunityGuild, userId: string, now: number): number {
  const current = guild.levels[userId];
  if (current && now - current.lastAwardAt < 60_000) return 0;
  if (!current && Object.keys(guild.levels).length >= MAX_MEMBERS_PER_GUILD) return 0;
  const member = guild.levels[userId] ??= { xp: 0, lastAwardAt: 0 };
  member.xp = Math.min(Number.MAX_SAFE_INTEGER, member.xp + 10);
  member.lastAwardAt = now;
  return 10;
}

export function applyInviteJoin(guild: CommunityGuild, memberId: string, inviterId: string | null): void {
  const previous = Object.hasOwn(guild.inviteMembers, memberId) ? guild.inviteMembers[memberId] : undefined;
  if (previous) {
    if (!previous.active && previous.inviterId && guild.inviteScores[previous.inviterId]) guild.inviteScores[previous.inviterId]!.active++;
    previous.active = true;
    return;
  }
  if (Object.keys(guild.inviteMembers).length >= MAX_MEMBERS_PER_GUILD) return;
  const credited = inviterId && inviterId !== memberId ? inviterId : null;
  guild.inviteMembers[memberId] = { inviterId: credited, active: true };
  if (credited) {
    const score = guild.inviteScores[credited] ??= { active: 0, total: 0 };
    score.active++;
    score.total++;
  }
}

export function applyInviteLeave(guild: CommunityGuild, memberId: string): void {
  const previous = guild.inviteMembers[memberId];
  if (!previous?.active) return;
  previous.active = false;
  if (previous.inviterId && guild.inviteScores[previous.inviterId]) guild.inviteScores[previous.inviterId]!.active = Math.max(0, guild.inviteScores[previous.inviterId]!.active - 1);
}

export function resolveInvite(before: InviteUse[] | undefined, after: InviteUse[]): string | null {
  return resolveInviteSource(before, after).inviterId;
}

export type CountResult = { kind: 'ignored' | 'duplicate' } | { kind: 'correct'; current: number } | { kind: 'wrong'; expected: number; reason: 'same-user' | 'wrong-number' };

export function applyCount(guild: CommunityGuild, content: string, userId: string, messageId: string): CountResult {
  if (!/^\d+$/.test(content.trim())) return { kind: 'ignored' };
  if (guild.counting.recentMessageIds.includes(messageId)) return { kind: 'duplicate' };
  guild.counting.recentMessageIds.push(messageId);
  guild.counting.recentMessageIds = guild.counting.recentMessageIds.slice(-200);
  const expected = guild.counting.current + 1;
  const sameUser = guild.counting.lastUserId === userId;
  if (sameUser || Number(content) !== expected || !Number.isSafeInteger(Number(content))) {
    guild.counting.current = 0;
    guild.counting.lastUserId = null;
    return { kind: 'wrong', expected, reason: sameUser ? 'same-user' : 'wrong-number' };
  }
  guild.counting.current = expected;
  guild.counting.best = Math.max(guild.counting.best, expected);
  guild.counting.lastUserId = userId;
  return { kind: 'correct', current: expected };
}
