import { TikTokLiveConnection, type WebcastGotHttpConfig } from 'tiktok-live-connector';
import type { AppConfig } from '../config.js';
import type { Logger } from '../logger.js';
import type { ProviderResult, ResolvedStreamer, StreamerRecord, UploadResult } from '../types.js';
import type { TikTokService, TikTokConnectionStatus } from '../tiktok/service.js';
import { streamUrl } from '../utils/normalize.js';
import { mapConcurrent, metricCount, providerError, PROVIDER_TIMEOUT_MS, type StreamProvider } from './provider.js';

type UnknownObject = Record<string, unknown>;

function object(value: unknown): UnknownObject {
  return value && typeof value === 'object' ? value as UnknownObject : {};
}

function stringValue(...values: unknown[]): string | undefined {
  return values.find((value) => typeof value === 'string' && value.length > 0) as string | undefined;
}

function numberValue(...values: unknown[]): number | undefined {
  const value = values.find((item) => typeof item === 'number' && Number.isFinite(item));
  return value as number | undefined;
}

export class TikTokProvider implements StreamProvider {
  readonly platform = 'tiktok' as const;

  constructor(private readonly config: AppConfig, private readonly logger: Logger, private readonly tiktok?: TikTokService) {}

  isConfigured(): boolean { return true; }
  configurationHint(): string { return 'TikTok LIVE uses a best-effort unofficial connector; TIKTOK_EULER_API_KEY may improve reliability. It does not grant access to uploaded posts.'; }

  connectionStatus(record: StreamerRecord): TikTokConnectionStatus | undefined { return this.tiktok?.status(record.guildId, record.id); }
  uploadCapability(record: StreamerRecord): { available: boolean; reason: string } {
    const status = this.connectionStatus(record);
    if (!status) return { available: false, reason: 'TikTok public-video alerts require Login Kit, video.list, and a connection from the linked Discord member.' };
    const matches = Boolean(record.discordMemberId && status.connectedBy === record.discordMemberId);
    return { available: status.configured && status.connected && !status.needsReconnect && matches,
      reason: status.connected && !matches ? 'The linked Discord member changed. The previous creator must disconnect before the new member connects TikTok.' : status.reason };
  }
  checkUploads(records: StreamerRecord[]): Promise<Map<string, UploadResult>> {
    return this.tiktok?.checkUploads(records) ?? Promise.resolve(new Map(records.map(record => [record.id, { kind: 'error' as const, error: this.uploadCapability(record).reason }])));
  }

  async resolve(username: string): Promise<ResolvedStreamer> {
    return { username: username.toLowerCase(), displayName: `@${username}` };
  }

  async checkMany(records: StreamerRecord[]): Promise<Map<string, ProviderResult>> {
    if (!records.length) return new Map();
    try {
      const output = new Map<string, ProviderResult>();
      const byUsername = new Map<string, StreamerRecord[]>();
      for (const record of records) { const key = record.username.toLowerCase(); const group = byUsername.get(key) ?? []; group.push(record); byUsername.set(key, group); }
      await mapConcurrent([...byUsername.values()], 3, async group => {
        const result = await this.checkOne(group[0]!);
        for (const record of group) output.set(record.id, structuredClone(result));
      });
      return output;
    } catch (error) {
      this.logger.warn('TikTok status check failed.', error instanceof Error ? error.message : error);
      return providerError(records, error);
    }
  }

  private async checkOne(record: StreamerRecord): Promise<ProviderResult> {
    try {
      const connection = new TikTokLiveConnection(record.username, {
        ...(this.config.tiktokEulerApiKey ? { signApiKey: this.config.tiktokEulerApiKey } : {}),
        // 2.4.2 types require cookieJar here, but its documented constructor creates its own.
        webClientOptions: { timeout: { request: PROVIDER_TIMEOUT_MS }, retry: { limit: 0 } } as WebcastGotHttpConfig,
      });
      // The connector's fallback uses a separate Axios client, outside webClientOptions.
      connection.apiClient.configuration.baseOptions = { ...connection.apiClient.configuration.baseOptions, timeout: PROVIDER_TIMEOUT_MS };
      const isLive = await connection.fetchIsLive();
      if (!isLive) return { kind: 'offline' };

      const response = object(await connection.fetchRoomInfo());
      const raw = response.data && typeof response.data === 'object' ? object(response.data) : response;
      // The stream can finish between status and room requests. The installed
      // connector uses status 4 for a room that has ended.
      if (raw.status === 4) return { kind: 'offline' };
      const owner = object(raw.owner);
      const avatarThumb = object(owner.avatar_thumb ?? owner.avatarThumb);
      const avatarUrls = avatarThumb.url_list ?? avatarThumb.urlList;
      const avatarUrl = Array.isArray(avatarUrls) ? stringValue(avatarUrls[0]) : undefined;
      const roomId = stringValue(raw.id_str, raw.id, raw.room_id, connection.roomId);
      if (!roomId) return { kind: 'error', error: 'TikTok reported LIVE without a stable room ID. The previous state was preserved until a reliable broadcast can be confirmed.' };
      const createTime = numberValue(raw.create_time, raw.createTime);
      return {
        kind: 'live',
        snapshot: {
          sessionId: roomId,
          title: stringValue(raw.title) ?? 'TikTok LIVE',
          viewerCount: metricCount(raw.user_count ?? raw.userCount),
          // No documented reliable room-owner follower total in this connector.
          // TikTok's official user.info.stats endpoint requires streamer OAuth.
          avatarUrl,
          startedAt: createTime ? new Date(createTime * 1000).toISOString() : undefined,
          url: streamUrl('tiktok', record.username),
        },
      };
    } catch {
      // Connector errors can include signed URLs/API credentials. Do not send
      // raw third-party error text to logs or the dashboard.
      return { kind: 'error', error: 'TikTok LIVE could not be checked. The unofficial connector may be blocked or unavailable; check the host network and optional Euler API key.' };
    }
  }
}
