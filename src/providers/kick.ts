import type { AppConfig } from '../config.js';
import type { Logger } from '../logger.js';
import type { ProviderResult, ResolvedStreamer, StreamerRecord } from '../types.js';
import { streamUrl } from '../utils/normalize.js';
import { chunks, metricCount, providerError, resolveBroadcasters, responseJson, PROVIDER_TIMEOUT_MS, type StreamProvider } from './provider.js';

interface KickTokenResponse { access_token: string; expires_in: number | string }
interface KickChannel {
  broadcaster_user_id: number;
  slug: string;
  stream_title?: string;
  category?: { name?: string };
  banner_picture?: string;
  stream?: null | {
    is_live: boolean;
    start_time?: string;
    thumbnail?: string;
    viewer_count?: number;
  };
}

interface KickLivestream {
  id: string;
  broadcaster_user: { id: number; username: string; profile_picture?: string };
  channel: { slug: string };
  category: { name: string };
  title: string;
  thumbnail?: string;
  viewer_count: number;
  started_at: string;
}

export class KickProvider implements StreamProvider {
  readonly platform = 'kick' as const;
  private token?: { value: string; expiresAt: number };

  constructor(private readonly config: AppConfig, private readonly logger: Logger) {}

  isConfigured(): boolean { return Boolean(this.config.kickClientId && this.config.kickClientSecret); }
  configurationHint(): string { return 'Set KICK_CLIENT_ID and KICK_CLIENT_SECRET in .env.'; }

  async resolve(username: string): Promise<ResolvedStreamer> {
    this.assertConfigured();
    const data = await this.channels([username]);
    const channel = data[0];
    if (!channel) throw new Error(`Kick channel “${username}” was not found.`);
    return {
      username: channel.slug.toLowerCase(),
      displayName: channel.slug,
      platformUserId: String(channel.broadcaster_user_id),
    };
  }

  async checkMany(records: StreamerRecord[]): Promise<Map<string, ProviderResult>> {
    if (!records.length) return new Map();
    try {
      this.assertConfigured();
      const output = new Map<string, ProviderResult>();
      const broadcasters = await resolveBroadcasters(records, username => this.resolve(username));
      for (const group of chunks(broadcasters, 100)) {
        const streams = await this.livestreams(group.map(({ userId }) => userId));
        const byUserId = new Map(streams.map((stream) => [String(stream.broadcaster_user.id), stream]));
        for (const { records: matches, userId } of group) for (const record of matches) {
          const stream = byUserId.get(userId);
          if (!stream) {
            output.set(record.id, { kind: 'offline' });
            continue;
          }
          output.set(record.id, {
            kind: 'live',
            snapshot: {
              sessionId: stream.id,
              title: stream.title || 'Untitled stream',
              category: stream.category?.name,
              viewerCount: metricCount(stream.viewer_count),
              // Kick's official public schema exposes no channel follower total.
              thumbnailUrl: stream.thumbnail,
              avatarUrl: stream.broadcaster_user.profile_picture,
              startedAt: stream.started_at,
              url: streamUrl('kick', stream.channel.slug),
            },
          });
        }
      }
      return output;
    } catch (error) {
      this.logger.warn('Kick status check failed.', error instanceof Error ? error.message : error);
      return providerError(records, error);
    }
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) throw new Error(this.configurationHint());
  }

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt) return this.token.value;
    const body = new URLSearchParams({
      client_id: this.config.kickClientId!,
      client_secret: this.config.kickClientSecret!,
      grant_type: 'client_credentials',
    });
    const response = await fetch('https://id.kick.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    const data = await responseJson<KickTokenResponse>(response, 'Kick authentication');
    const expiresIn = Number(data.expires_in) || 3600;
    this.token = { value: data.access_token, expiresAt: Date.now() + Math.max(60, expiresIn - 120) * 1000 };
    return this.token.value;
  }

  private async channels(usernames: string[]): Promise<KickChannel[]> {
    const query = usernames.map((username) => `slug=${encodeURIComponent(username)}`).join('&');
    let response = await fetch(`https://api.kick.com/public/v1/channels?${query}`, {
      headers: { Authorization: `Bearer ${await this.accessToken()}` },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (response.status === 401) {
      this.token = undefined;
      response = await fetch(`https://api.kick.com/public/v1/channels?${query}`, {
        headers: { Authorization: `Bearer ${await this.accessToken()}` },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });
    }
    const data = await responseJson<{ data: KickChannel[] }>(response, 'Kick API');
    return data.data;
  }

  private async livestreams(userIds: string[]): Promise<KickLivestream[]> {
    const query = userIds.map((userId) => `user_id=${encodeURIComponent(userId)}`).join('&');
    let response = await fetch(`https://api.kick.com/public/v1/users/livestreams?${query}`, {
      headers: { Authorization: `Bearer ${await this.accessToken()}` },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (response.status === 401) {
      this.token = undefined;
      response = await fetch(`https://api.kick.com/public/v1/users/livestreams?${query}`, {
        headers: { Authorization: `Bearer ${await this.accessToken()}` },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });
    }
    const data = await responseJson<{ data: KickLivestream[] }>(response, 'Kick API');
    return data.data;
  }
}
