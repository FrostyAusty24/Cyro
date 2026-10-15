import { BotMessageError } from '../i18n/index.js';
import type { AppConfig } from '../config.js';
import type { Logger } from '../logger.js';
import type { ProviderResult, ResolvedStreamer, StreamerRecord } from '../types.js';
import { streamUrl } from '../utils/normalize.js';
import { chunks, mapConcurrent, metricCount, providerError, resolveBroadcasters, responseJson, PROVIDER_TIMEOUT_MS, type StreamProvider } from './provider.js';

interface TwitchTokenResponse { access_token: string; expires_in: number }
interface TwitchUser { id: string; login: string; display_name: string; profile_image_url?: string }
interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
}

export class TwitchProvider implements StreamProvider {
  readonly platform = 'twitch' as const;
  private token?: { value: string; expiresAt: number };

  constructor(private readonly config: AppConfig, private readonly logger: Logger) {}

  isConfigured(): boolean { return Boolean(this.config.twitchClientId && this.config.twitchClientSecret); }
  configurationHint(): string { return 'Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env.'; }

  async resolve(username: string): Promise<ResolvedStreamer> {
    this.assertConfigured();
    const data = await this.api<{ data: TwitchUser[] }>(`/users?login=${encodeURIComponent(username)}`);
    const user = data.data[0];
    if (!user) throw new BotMessageError('Twitch channel “{username}” was not found.',{username});
    return { username: user.login.toLowerCase(), displayName: user.display_name, platformUserId: user.id, avatarUrl: user.profile_image_url };
  }

  async checkMany(records: StreamerRecord[]): Promise<Map<string, ProviderResult>> {
    if (!records.length) return new Map();
    try {
      this.assertConfigured();
      const output = new Map<string, ProviderResult>();
      const broadcasters = await resolveBroadcasters(records, username => this.resolve(username));
      for (const group of chunks(broadcasters, 100)) {
        const query = group.map(({ userId }) => `user_id=${encodeURIComponent(userId)}`).join('&');
        const data = await this.api<{ data: TwitchStream[] }>(`/streams?${query}&first=100`);
        const byUser = new Map(data.data.map((stream) => [stream.user_id, stream]));
        const followers = new Map(await mapConcurrent(group.filter(({ userId }) => byUser.has(userId)), 4, async ({ userId }) => [userId, await this.followerCount(userId)] as const));
        for (const { records: matches, userId } of group) for (const record of matches) {
          const stream = byUser.get(userId);
          if (!stream) {
            output.set(record.id, { kind: 'offline' });
            continue;
          }
          output.set(record.id, {
            kind: 'live',
            snapshot: {
              sessionId: stream.id,
              title: stream.title || '',
              category: stream.game_name || undefined,
              viewerCount: metricCount(stream.viewer_count),
              followerCount: followers.get(userId),
              thumbnailUrl: stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720'),
              avatarUrl: record.avatarUrl,
              startedAt: stream.started_at,
              url: streamUrl('twitch', stream.user_login),
            },
          });
        }
      }
      return output;
    } catch (error) {
      this.logger.warn('Twitch status check failed.', error instanceof Error ? error.message : error);
      return providerError(records, error);
    }
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) throw new Error(this.configurationHint());
  }

  private async followerCount(userId: string): Promise<number | undefined> {
    try {
      // The app token exposes only the public total, never the private follower list.
      const data = await this.api<{ total?: unknown }>(`/channels/followers?broadcaster_id=${encodeURIComponent(userId)}&first=1`);
      return metricCount(data.total);
    } catch (error) {
      this.logger.warn('Twitch follower total unavailable; live status retained.', { userId, error: error instanceof Error ? error.message : String(error) });
      return undefined;
    }
  }

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt) return this.token.value;
    const body = new URLSearchParams({
      client_id: this.config.twitchClientId!,
      client_secret: this.config.twitchClientSecret!,
      grant_type: 'client_credentials',
    });
    const response = await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body, signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
    const data = await responseJson<TwitchTokenResponse>(response, 'Twitch authentication');
    this.token = { value: data.access_token, expiresAt: Date.now() + Math.max(60, data.expires_in - 120) * 1000 };
    return this.token.value;
  }

  private async api<T>(path: string): Promise<T> {
    const token = await this.accessToken();
    const request = () => fetch(`https://api.twitch.tv/helix${path}`, {
      headers: { Authorization: `Bearer ${token}`, 'Client-Id': this.config.twitchClientId! },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    let response = await request();
    if (response.status === 401) {
      this.token = undefined;
      response = await fetch(`https://api.twitch.tv/helix${path}`, {
        headers: { Authorization: `Bearer ${await this.accessToken()}`, 'Client-Id': this.config.twitchClientId! },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });
    }
    return responseJson<T>(response, 'Twitch API');
  }
}
