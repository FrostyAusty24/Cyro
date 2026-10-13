export const PLATFORMS = ['twitch', 'kick', 'tiktok', 'youtube'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const CLEANUP_MODES = ['delete', 'offline', 'keep'] as const;
export type CleanupMode = (typeof CLEANUP_MODES)[number];

export type StreamState = 'unknown' | 'offline' | 'live';

export interface LiveSnapshot {
  sessionId: string;
  title: string;
  category?: string;
  viewerCount?: number;
  followerCount?: number;
  thumbnailUrl?: string;
  avatarUrl?: string;
  startedAt?: string;
  url: string;
}

export interface UploadSnapshot {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  thumbnailUrl?: string;
}

export interface UploadSettings {
  enabled: boolean;
  channelId: string;
  pingRoleId?: string;
  titleFilter?: string;
  messageTemplate: string;
}

export interface UploadDelivery {
  videoId: string;
  channelId: string;
  attemptedAt: string;
  status: 'pending' | 'sent' | 'uncertain';
  messageId?: string;
}

export interface UploadState {
  baselineAt?: string;
  ignorePublishedBefore?: string;
  seen: { id: string; publishedAt: string }[];
  deliveries: UploadDelivery[];
  lastCheckedAt?: string;
  lastError?: string;
}

export type UploadResult =
  | { kind: 'uploads'; items: UploadSnapshot[]; checkedAt: string }
  | { kind: 'deferred' }
  | { kind: 'error'; error: string };

export interface StreamerRecord {
  id: string;
  guildId: string;
  creatorId?: string;
  creatorName?: string;
  platform: Platform;
  username: string;
  displayName: string;
  platformUserId?: string;
  avatarUrl?: string;
  alertChannelId: string;
  pingRoleId?: string;
  liveRoleId?: string;
  discordMemberId?: string;
  titleFilter?: string;
  cooldownSeconds: number;
  messageTemplate: string;
  cleanupMode: CleanupMode;
  enabled: boolean;
  uploads?: UploadSettings;
  uploadState?: UploadState;
  state: StreamState;
  currentSessionId?: string;
  alertedSessionId?: string;
  alertMessageId?: string;
  alertMessageChannelId?: string;
  lastAlertAt?: string;
  lastSnapshot?: LiveSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorProfile {
  id: string;
  guildId: string;
  name: string;
  discordMemberId?: string;
  accountIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BotData {
  version: 1 | 2;
  streamers: StreamerRecord[];
  creators?: CreatorProfile[];
}

export interface ResolvedStreamer {
  username: string;
  displayName: string;
  platformUserId?: string;
  avatarUrl?: string;
}

export type ProviderResult =
  | { kind: 'live'; snapshot: LiveSnapshot }
  | { kind: 'offline' }
  | { kind: 'error'; error: string };
