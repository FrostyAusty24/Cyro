import { randomUUID } from 'node:crypto';
import type { InviteUse } from './logic.js';
import type { CommunityGuild, InviteAttribution, InviteAuditEntry, InviteAuditReason } from './types.js';

export const MAX_INVITE_LOG = 1000;
function lastMemberEntry(guild: CommunityGuild, memberId: string): InviteAuditEntry | undefined {
  for (let index = guild.inviteLog.length - 1; index >= 0; index--) if (guild.inviteLog[index]!.memberId === memberId) return guild.inviteLog[index];
  return undefined;
}
export function unknownInvite(reason: Exclude<InviteAuditReason, 'matched'>): InviteAttribution {
  return { source: 'unknown', reason, inviterId: null, inviteCode: null, inviteChannelId: null };
}
export function resolveInviteSource(before: InviteUse[] | undefined, after: InviteUse[]): InviteAttribution {
  if (!before) return unknownInvite('no-baseline');
  if (before.some(old => !after.some(value => value.code === old.code))) return unknownInvite('deleted-invite');
  if (after.some(value => { const old = before.find(item => item.code === value.code); return old ? value.uses < old.uses : value.uses > 0; })) return unknownInvite('ambiguous');
  const increases = after.filter(value => value.uses > (before.find(old => old.code === value.code)?.uses ?? value.uses));
  if (!increases.length) return unknownInvite('no-use-change');
  if (increases.length !== 1) return unknownInvite('ambiguous');
  const match = increases[0]!, previous = before.find(value => value.code === match.code)!;
  if (match.uses !== previous.uses + 1) return unknownInvite('ambiguous');
  return { source: 'invite', reason: 'matched', inviterId: match.inviterId, inviteCode: match.code, inviteChannelId: match.channelId ?? null };
}

export function appendInviteLog(guild: CommunityGuild, input: Omit<InviteAuditEntry, 'id'>): InviteAuditEntry | null {
  const previous = lastMemberEntry(guild, input.memberId);
  if (previous?.event === input.event && previous.joinedAt === input.joinedAt) return null;
  const entry = { ...input, id: randomUUID() };
  guild.inviteLog.push(entry);
  if (guild.inviteLog.length > MAX_INVITE_LOG) guild.inviteLog.splice(0, guild.inviteLog.length - MAX_INVITE_LOG);
  return entry;
}

export function departureSource(guild: CommunityGuild, memberId: string, joinedAt: number | null): InviteAttribution {
  const previous = lastMemberEntry(guild, memberId);
  // The latest observed join is independent of a challenge's original referral credit.
  if (joinedAt === null || previous?.event !== 'joined' || previous.joinedAt !== joinedAt) return unknownInvite('unknown-join');
  return { source: previous.source, reason: previous.reason, inviterId: previous.inviterId, inviteCode: previous.inviteCode, inviteChannelId: previous.inviteChannelId };
}

export const inviteReasonText: Record<InviteAuditReason, string> = {
  matched: 'One observed invite-use increase (best effort)',
  'no-baseline': 'No reliable invite baseline was available',
  ambiguous: 'Several joins, changed counters, or new invite uses made attribution ambiguous',
  'deleted-invite': 'An invite disappeared before it could be attributed',
  'no-use-change': 'No unique invite-use increase; vanity or other join sources are possible',
  'fetch-failed': 'Discord invite counts could not be fetched',
  'unknown-join': 'This membership cannot be matched to a join in the retained log',
};
