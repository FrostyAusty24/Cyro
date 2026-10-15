import { BotMessageError } from '../i18n/index.js';
import type { AppConfig } from '../config.js';
import type { Logger } from '../logger.js';
import type { ProviderResult, ResolvedStreamer, StreamerRecord, UploadResult, UploadSnapshot } from '../types.js';
import { isYouTubeChannelId, normalizeUsername } from '../utils/normalize.js';
import { chunks, mapConcurrent, metricCount, PROVIDER_TIMEOUT_MS, providerError, type StreamProvider } from './provider.js';

type Thumbnails = Record<string, { url?: string }>;
interface Channel { id: string; snippet?: { title?: string; thumbnails?: Thumbnails }; contentDetails?: { relatedPlaylists?: { uploads?: string } } }
interface Video {
  id: string;
  snippet?: { channelId?: string; title?: string; publishedAt?: string; liveBroadcastContent?: string; thumbnails?: Thumbnails };
  status?: { privacyStatus?: string; uploadStatus?: string };
  liveStreamingDetails?: { actualStartTime?: string; actualEndTime?: string; concurrentViewers?: string | number };
}
interface Broadcaster { channelId: string; records: StreamerRecord[] }
interface DiscoveryState { ids: string[]; lastSeenAt: number; lastSearchAt?: number; searchError?: string }
const DISCOVERY_INTERVAL_MS = 15 * 60_000;
const DISCOVERY_CACHE_TTL_MS = 24 * 60 * 60_000;
function thumbnail(images?: Thumbnails): string | undefined { return images?.high?.url ?? images?.medium?.url ?? images?.default?.url; }
function videoId(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(value); }
function isLive(video: Video, channelId: string): boolean {
  const details = video.liveStreamingDetails;
  return video.snippet?.channelId === channelId && Boolean(details?.actualStartTime && Number.isFinite(Date.parse(details.actualStartTime))) && !details?.actualEndTime && (video.snippet?.liveBroadcastContent === undefined || video.snippet.liveBroadcastContent === 'live');
}

export class YouTubeProvider implements StreamProvider {
  readonly platform = 'youtube' as const;
  private readonly discovery = new Map<string, DiscoveryState>();
  private readonly uploads = new Map<string, { playlistId?: string; lastCheckedAt: number; lastSeenAt: number }>();
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly config: AppConfig, private readonly logger: Logger, private readonly now: () => number = Date.now) {}

  isConfigured(): boolean { return Boolean(this.config.youtubeApiKey); }
  configurationHint(): string { return 'Enable YouTube Data API v3 in Google Cloud and set YOUTUBE_API_KEY on the bot host.'; }

  private async request<T>(resource: string, parameters: Record<string, string>): Promise<T[]> {
    if (!this.isConfigured()) throw new Error(this.configurationHint());
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
    url.searchParams.set('key', this.config.youtubeApiKey!);
    let response: Response;
    try { response = await fetch(url, { signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) }); }
    catch { throw new Error('YouTube API request failed or timed out.'); }
    let body: { items?: T[]; error?: { errors?: { reason?: string }[] } };
    try { body = await response.json() as typeof body; }
    catch { throw new BotMessageError('YouTube API returned an invalid response (HTTP {status}).',{status:response.status}); }
    if (!response.ok || body.error) {
      // Never echo raw API messages or request URLs: they may contain the private key.
      const reason = body.error?.errors?.[0]?.reason;
      const detail = reason && ['quotaExceeded', 'dailyLimitExceeded', 'keyInvalid', 'accessNotConfigured', 'forbidden', 'channelNotFound', 'rateLimitExceeded', 'ipRefererBlocked'].includes(reason) ? ` (${reason})` : '';
      throw new BotMessageError('YouTube API returned HTTP {status}{detail}. Check the host’s API key, API enablement and quota.',{status:response.status,detail});
    }
    if (!Array.isArray(body.items)) throw new Error('YouTube API returned an invalid items response.');
    return body.items;
  }

  async resolve(input: string): Promise<ResolvedStreamer> {
    const username = normalizeUsername('youtube', input);
    const filter: Record<string, string> = isYouTubeChannelId(username) ? { id: username } : { forHandle: username };
    const channel = (await this.request<Channel>('channels', { part: 'snippet', ...filter }))[0];
    if (!channel || !isYouTubeChannelId(channel.id)) throw new Error('YouTube channel not found. Use its @handle or channel ID.');
    return { username: channel.id, platformUserId: channel.id, displayName: channel.snippet?.title ?? username, avatarUrl: thumbnail(channel.snippet?.thumbnails) };
  }

  checkMany(records: StreamerRecord[]): Promise<Map<string, ProviderResult>> {
    const work = this.queue.then(() => this.check(records));
    this.queue = work.catch(() => undefined);
    return work;
  }

  checkUploads(records: StreamerRecord[]): Promise<Map<string, UploadResult>> {
    const work = this.queue.then(() => this.checkPublishedVideos(records));
    this.queue = work.catch(() => undefined);
    return work;
  }

  private async checkPublishedVideos(records: StreamerRecord[]): Promise<Map<string, UploadResult>> {
    const output = new Map<string, UploadResult>();
    if (!records.length) return output;
    if (!this.isConfigured()) return new Map(records.map(record => [record.id, { kind: 'error', error: this.configurationHint() }]));
    const failures = new Map<string, ProviderResult>();
    const groups = await this.broadcasters(records, failures);
    for (const [id, result] of failures) if (result.kind === 'error') output.set(id, result);
    const now = this.now();
    for (const [id, state] of this.uploads) if (now - state.lastSeenAt > DISCOVERY_CACHE_TTL_MS) this.uploads.delete(id);
    for (const group of groups) {
      const state = this.uploads.get(group.channelId) ?? { lastCheckedAt: -Infinity, lastSeenAt: now };
      state.lastSeenAt = now; this.uploads.set(group.channelId, state);
    }
    // At most ~5,760 playlist/video units per day for ten channels. Larger sets
    // share the same budget by slowing down; guild duplicates share one check.
    const interval = 5 * 60_000 * Math.max(1, this.uploads.size / 10);
    await mapConcurrent(groups, 3, async group => {
      const state = this.uploads.get(group.channelId)!;
      if (now - state.lastCheckedAt < interval) {
        for (const record of group.records) output.set(record.id, { kind: 'deferred' });
        return;
      }
      state.lastCheckedAt = now;
      try {
        if (!state.playlistId) {
          const channel = (await this.request<Channel>('channels', { part: 'contentDetails', id: group.channelId })).find(item => item.id === group.channelId);
          const playlist = channel?.contentDetails?.relatedPlaylists?.uploads;
          if (!playlist || !/^[A-Za-z0-9_-]{10,100}$/.test(playlist)) throw new Error('YouTube did not return a public uploads playlist for this channel.');
          state.playlistId = playlist;
        }
        const playlist = await this.request<{ contentDetails?: { videoId?: string } }>('playlistItems', { part: 'contentDetails', playlistId: state.playlistId, maxResults: '50' });
        const ids = [...new Set(playlist.map(item => item.contentDetails?.videoId).filter(videoId))];
        const items: UploadSnapshot[] = [];
        if (ids.length) for (const video of await this.request<Video>('videos', { part: 'snippet,status,liveStreamingDetails', id: ids.join(',') })) {
          const publishedAt = video.snippet?.publishedAt;
          // Broadcasts/replays belong to live alerts. Exclude them even after
          // their liveBroadcastContent changes to none, to avoid double posts.
          if (!videoId(video.id) || !ids.includes(video.id) || video.snippet?.channelId !== group.channelId ||
              video.status?.privacyStatus !== 'public' || video.status?.uploadStatus !== 'processed' ||
              video.snippet.liveBroadcastContent !== 'none' || video.liveStreamingDetails ||
              !publishedAt || !Number.isFinite(Date.parse(publishedAt)) || Date.parse(publishedAt) > now) continue;
          items.push({ id: video.id, title: video.snippet.title || '', publishedAt,
            url: `https://www.youtube.com/watch?v=${video.id}`, thumbnailUrl: thumbnail(video.snippet.thumbnails) });
        }
        items.sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt) || a.id.localeCompare(b.id));
        for (const record of group.records) output.set(record.id, { kind: 'uploads', items: structuredClone(items), checkedAt: new Date(now).toISOString() });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'YouTube upload check failed.';
        for (const record of group.records) output.set(record.id, { kind: 'error', error: message });
      }
    });
    return output;
  }

  private async check(records: StreamerRecord[]): Promise<Map<string, ProviderResult>> {
    if (!records.length) return new Map();
    if (!this.isConfigured()) return providerError(records, new Error(this.configurationHint()));
    const output = new Map<string, ProviderResult>();
    const groups = await this.broadcasters(records, output);
    const now = this.now();
    for (const [id, state] of this.discovery) if (now - state.lastSeenAt > DISCOVERY_CACHE_TTL_MS) this.discovery.delete(id);
    for (const group of groups) {
      // Persisted IDs are only candidates. Fresh video details must establish
      // current live status and viewer counts before returning any observation.
      const seeds = group.records.filter(record => record.state === 'live').flatMap(record => [record.currentSessionId, record.lastSnapshot?.sessionId]).filter(videoId);
      const state = this.discovery.get(group.channelId) ?? { ids: [...new Set(seeds)], lastSeenAt: now };
      state.lastSeenAt = now;
      this.discovery.set(group.channelId, state);
    }
    // Search has a separate, limited daily quota. Distinct channels share it;
    // duplicate guild subscriptions do not shorten the discovery interval.
    const interval = DISCOVERY_INTERVAL_MS * Math.max(1, this.discovery.size);
    const stateFor = (group: Broadcaster) => this.discovery.get(group.channelId)!;
    const knownIds = [...new Set(groups.flatMap(group => stateFor(group).ids))];
    const { videos, errors } = await this.videos(knownIds);
    const liveFor = (group: Broadcaster) => stateFor(group).ids.map(id => videos.get(id)).find((value): value is Video => Boolean(value && isLive(value, group.channelId)));
    const errorFor = (group: Broadcaster) => stateFor(group).ids.map(id => errors.get(id)).find(Boolean);
    const due = groups.filter(group => {
      const state = stateFor(group);
      return !liveFor(group) && !errorFor(group) && (state.lastSearchAt === undefined || now - state.lastSearchAt >= interval);
    });
    await mapConcurrent(due, 3, async group => {
      const state = stateFor(group);
      state.lastSearchAt = now;
      try { state.ids = await this.discover(group.channelId); state.searchError = undefined; }
      catch (error) {
        state.searchError = error instanceof Error ? error.message : 'YouTube discovery request failed.';
        this.logger.warn('YouTube broadcast discovery failed.', state.searchError);
      }
    });
    const newIds = [...new Set(due.flatMap(group => stateFor(group).ids))].filter(id => !knownIds.includes(id));
    const fresh = await this.videos(newIds);
    for (const [id, value] of fresh.videos) videos.set(id, value);
    for (const [id, error] of fresh.errors) errors.set(id, error);
    for (const group of groups) {
      const state = stateFor(group);
      const live = liveFor(group);
      const error = errorFor(group) ?? (!live ? state.searchError : undefined);
      for (const record of group.records) output.set(record.id, error ? { kind: 'error', error } : live ? this.snapshot(live, record) : { kind: 'offline' });
      if (!error) state.ids = state.ids.filter(id => {
        const value = videos.get(id);
        return value && (isLive(value, group.channelId) || (value.snippet?.channelId === group.channelId && value.snippet.liveBroadcastContent === 'upcoming' && !value.liveStreamingDetails?.actualEndTime));
      });
    }
    return output;
  }

  private async broadcasters(records: StreamerRecord[], output: Map<string, ProviderResult>): Promise<Broadcaster[]> {
    const names = new Map<string, StreamerRecord[]>();
    for (const record of records) {
      const identity = record.platformUserId ?? record.username;
      const key = isYouTubeChannelId(identity) ? identity : identity.toLowerCase();
      const matches = names.get(key) ?? []; matches.push(record); names.set(key, matches);
    }
    const groups = new Map<string, Broadcaster>();
    await mapConcurrent([...names.values()], 3, async matches => {
      try {
        const identity = matches[0]!.platformUserId ?? matches[0]!.username;
        const channelId = isYouTubeChannelId(identity) ? identity : (await this.resolve(identity)).platformUserId!;
        const group = groups.get(channelId) ?? { channelId, records: [] };
        group.records.push(...matches); groups.set(channelId, group);
      } catch (error) { for (const [id, result] of providerError(matches, error)) output.set(id, result); }
    });
    return [...groups.values()];
  }

  private async discover(channelId: string): Promise<string[]> {
    const results = await this.request<{ id?: { videoId?: string } }>('search', { part: 'snippet', channelId, eventType: 'live', type: 'video', maxResults: '50' });
    return [...new Set(results.map(item => item.id?.videoId).filter(videoId))];
  }

  private async videos(ids: string[]): Promise<{ videos: Map<string, Video>; errors: Map<string, string> }> {
    const videos = new Map<string, Video>(); const errors = new Map<string, string>();
    await mapConcurrent(chunks(ids, 50), 3, async batch => {
      try {
        for (const item of await this.request<Video>('videos', { part: 'snippet,liveStreamingDetails', id: batch.join(',') })) {
          if (videoId(item.id) && batch.includes(item.id)) videos.set(item.id, item);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'YouTube video status request failed.';
        this.logger.warn('YouTube video status check failed.', message);
        for (const id of batch) errors.set(id, message);
      }
    });
    return { videos, errors };
  }

  private snapshot(video: Video, record: StreamerRecord): ProviderResult {
    const viewers = video.liveStreamingDetails?.concurrentViewers;
    return { kind: 'live', snapshot: {
      sessionId: video.id,
      title: video.snippet?.title || '',
      viewerCount: metricCount(typeof viewers === 'string' && /^\d+$/.test(viewers) ? Number(viewers) : viewers),
      thumbnailUrl: thumbnail(video.snippet?.thumbnails),
      avatarUrl: record.avatarUrl,
      startedAt: video.liveStreamingDetails!.actualStartTime,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      // Subscriber totals are not followers and are deliberately not requested.
    } };
  }
}
