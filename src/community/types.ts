export type GreetingFormat = 'text' | 'card' | 'both';
export interface MemberCardSettings {
  joinHeading: string;
  leaveHeading: string;
  background: 'midnight' | 'aurora' | 'ice' | 'custom';
  accentColor: string;
  bar: 'left' | 'top' | 'none';
  barColor: string;
  backgroundColor: string;
  textColor: string;
  secondaryColor: string;
  showAvatar: boolean;
  showDivider: boolean;
  decoration: boolean;
  nameText: string;
  subtitle: string;
  joinFooter: string;
  leaveFooter: string;
  brandText: string;
}

export interface CommunityConfig {
  counting: { enabled: boolean; channelId: string | null };
  welcome: { enabled: boolean; channelId: string | null; message: string; goodbyeMessage: string; autoRoleIds: string[]; joinFormat: GreetingFormat; goodbyeFormat: GreetingFormat | 'off'; card: MemberCardSettings };
  selfRoles: { roles: Array<{ roleId: string; label: string }> };
  invites: { enabled: boolean; loggingEnabled: boolean; logChannelId: string | null; challengeName: string; challengeTarget: number };
  levels: { enabled: boolean };
  verification: { enabled: boolean; channelId: string | null; roleId: string | null; mode: 'reaction' | 'challenge'; title: string; message: string };
}

export interface VerificationPanel { channelId: string; messageId: string; roleId: string; mode: 'reaction' | 'challenge' }

export type InviteAuditReason = 'matched' | 'no-baseline' | 'ambiguous' | 'deleted-invite' | 'no-use-change' | 'fetch-failed' | 'unknown-join';
export interface InviteAttribution {
  source: 'invite' | 'unknown';
  reason: InviteAuditReason;
  inviterId: string | null;
  inviteCode: string | null;
  inviteChannelId: string | null;
}
export interface InviteAuditEntry extends InviteAttribution {
  id: string;
  event: 'joined' | 'left';
  memberId: string;
  memberName: string;
  joinedAt: number | null;
  referralInviterId: string | null;
  at: number;
}

export interface CommunityGuild {
  config: CommunityConfig;
  counting: { current: number; best: number; lastUserId: string | null; recentMessageIds: string[] };
  inviteMembers: Record<string, { inviterId: string | null; active: boolean }>;
  inviteScores: Record<string, { active: number; total: number }>;
  inviteLog: InviteAuditEntry[];
  levels: Record<string, { xp: number; lastAwardAt: number }>;
  verificationPanel: VerificationPanel | null;
}

export interface CommunitySnapshot {
  config: CommunityConfig;
  counting: { current: number; best: number; lastUserId: string | null };
  inviteLeaderboard: Array<{ userId: string; active: number; total: number }>;
  inviteLog: InviteAuditEntry[];
  levelLeaderboard: Array<{ userId: string; xp: number; level: number }>;
  inviteTracking: { ready: boolean; note: string };
  verificationPanel: VerificationPanel | null;
}

export function defaultGuild(): CommunityGuild {
  return {
    config: {
      counting: { enabled: false, channelId: null },
      welcome: { enabled: false, channelId: null, message: 'Welcome {user} to {server}! You are member {count}.', goodbyeMessage: '', autoRoleIds: [], joinFormat: 'text', goodbyeFormat: 'off', card: defaultMemberCard() },
      selfRoles: { roles: [] },
      invites: { enabled: false, loggingEnabled: false, logChannelId: null, challengeName: 'Community invite challenge', challengeTarget: 10 },
      levels: { enabled: false },
      verification: { enabled: false, channelId: null, roleId: null, mode: 'challenge', title: 'Verify your membership', message: 'Verify to receive access to the server.' },
    },
    counting: { current: 0, best: 0, lastUserId: null, recentMessageIds: [] },
    inviteMembers: {}, inviteScores: {}, inviteLog: [], levels: {},
    verificationPanel: null,
  };
}

export function defaultMemberCard(): MemberCardSettings {
  return { joinHeading: 'Welcome aboard', leaveHeading: 'Until next time', background: 'midnight', accentColor: '#63D7FF', bar: 'left', barColor: '#63D7FF', backgroundColor: '#111B31', textColor: '#F2F8FF', secondaryColor: '#A7BACD', showAvatar: true, showDivider: true, decoration: true, nameText: '{user}', subtitle: '{server}', joinFooter: '{count} members and counting', leaveFooter: '{count} members in the community', brandText: 'CYRO' };
}

export function levelForXp(xp: number): number { return Math.floor(Math.sqrt(xp / 100)); }
