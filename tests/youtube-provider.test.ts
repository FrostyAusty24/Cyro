import { afterEach, expect, it, vi } from 'vitest';
import { normalizeUsername, streamUrl } from '../src/utils/normalize.js';
import { YouTubeProvider } from '../src/providers/youtube.js';
import type { AppConfig } from '../src/config.js';
import type { Logger } from '../src/logger.js';
import type { StreamerRecord } from '../src/types.js';
import { createProviders } from '../src/providers/index.js';

const channelId = 'UC_x5XG1OV2P6uZZ5FSM9Ttw';
const config = { youtubeApiKey: 'private-api-key' } as AppConfig;
const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as Logger;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const record = (id: string, overrides: Partial<StreamerRecord> = {}): StreamerRecord => ({ id, guildId: id, platform: 'youtube', username: channelId, displayName: 'Creator', platformUserId: channelId, alertChannelId: 'channel', cooldownSeconds: 0, messageTemplate: '', cleanupMode: 'offline', enabled: true, state: 'unknown', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...overrides });
const video = (id = 'liveVideo01', details: Record<string, unknown> = {}, snippet: Record<string, unknown> = {}) => ({ id, snippet: { channelId, title: 'Currently live', liveBroadcastContent: 'live', ...snippet }, liveStreamingDetails: { actualStartTime: '2026-10-12T10:00:00Z', concurrentViewers: '42', ...details } });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('preserves case-sensitive YouTube channel IDs and accepts handles and channel URLs', () => {
  expect(normalizeUsername('youtube', channelId)).toBe(channelId);
  expect(normalizeUsername('youtube', `https://www.youtube.com/channel/${channelId}/live`)).toBe(channelId);
  expect(normalizeUsername('youtube', 'https://youtube.com/@GoogleDevelopers/streams')).toBe('@googledevelopers');
  expect(normalizeUsername('youtube', '@GoogleDevelopers')).toBe('@googledevelopers');
  expect(streamUrl('youtube', channelId)).toBe(`https://www.youtube.com/channel/${channelId}/live`);
  expect(() => normalizeUsername('youtube', 'https://evil.test/@name')).toThrow();
  expect(() => normalizeUsername('youtube', 'https://youtube.com/watch?v=abcdefghijk')).toThrow();
});

it('includes the configured YouTube adapter in the provider registry', () => {
  expect(createProviders(config, logger).youtube).toBeInstanceOf(YouTubeProvider);
  expect(createProviders(config, logger).youtube.isConfigured()).toBe(true);
});

it('deduplicates discovery across guilds and only announces verified currently-live broadcasts', async () => {
  const fetcher = vi.fn(async (input: URL) => input.pathname.endsWith('/search')
    ? json({ items: ['upcoming001', 'endedVideo1', 'liveVideo01'].map(videoId => ({ id: { videoId } })) })
    : json({ items: [video('upcoming001', { actualStartTime: undefined }, { liveBroadcastContent: 'upcoming' }), video('endedVideo1', { actualEndTime: '2026-10-12T11:00:00Z' }), video()] }));
  vi.stubGlobal('fetch', fetcher);
  const results = await new YouTubeProvider(config, logger).checkMany([record('guild-a'), record('guild-b')]);
  expect(results.get('guild-a')).toMatchObject({ kind: 'live', snapshot: { sessionId: 'liveVideo01', viewerCount: 42, title: 'Currently live', url: 'https://www.youtube.com/watch?v=liveVideo01' } });
  expect(results.get('guild-b')).toEqual(results.get('guild-a'));
  expect(results.get('guild-a')).not.toHaveProperty('snapshot.followerCount');
  expect(fetcher).toHaveBeenCalledTimes(2);
  const search = fetcher.mock.calls[0]![0];
  expect(search.searchParams.get('eventType')).toBe('live');
  expect(search.searchParams.get('type')).toBe('video');
  expect(search.searchParams.get('channelId')).toBe(channelId);
});

it('resolves public handles to a stable channel ID with a private API key and timeout', async () => {
  const fetcher = vi.fn().mockResolvedValue(json({ items: [{ id: channelId, snippet: { title: 'Google Developers', thumbnails: { high: { url: 'https://image.test/avatar' } } } }] }));
  vi.stubGlobal('fetch', fetcher);
  const provider = new YouTubeProvider(config, logger);
  expect(provider.isConfigured()).toBe(true);
  expect(await provider.resolve('@GoogleDevelopers')).toEqual({ username: channelId, platformUserId: channelId, displayName: 'Google Developers', avatarUrl: 'https://image.test/avatar' });
  const url = new URL(String(fetcher.mock.calls[0]![0]));
  expect(url.origin + url.pathname).toBe('https://www.googleapis.com/youtube/v3/channels');
  expect(url.searchParams.get('forHandle')).toBe('@googledevelopers');
  expect(url.searchParams.get('key')).toBe('private-api-key');
  expect(fetcher.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
  expect(new YouTubeProvider({} as AppConfig, logger).isConfigured()).toBe(false);
});

it('refreshes known video metrics without repeating discovery or reusing old viewer samples', async () => {
  let now = Date.parse('2026-10-12T12:00:00Z');
  let viewers: string | undefined = '42';
  const fetcher = vi.fn(async (input: URL) => input.pathname.endsWith('/search')
    ? json({ items: [{ id: { videoId: 'liveVideo01' } }] })
    : json({ items: [video('liveVideo01', { concurrentViewers: viewers })] }));
  vi.stubGlobal('fetch', fetcher);
  const provider = new YouTubeProvider(config, logger, () => now);
  await provider.checkMany([record('a')]);
  now += 60_000; viewers = '51';
  expect((await provider.checkMany([record('a')])).get('a')).toMatchObject({ kind: 'live', snapshot: { viewerCount: 51 } });
  now += 60_000; viewers = undefined;
  const missing = (await provider.checkMany([record('a')])).get('a');
  expect(missing).toMatchObject({ kind: 'live' });
  expect(missing && missing.kind === 'live' && missing.snapshot.viewerCount).toBeUndefined();
  now += 60_000; viewers = '0';
  expect((await provider.checkMany([record('a')])).get('a')).toMatchObject({ kind: 'live', snapshot: { viewerCount: 0 } });
  expect(fetcher.mock.calls.filter(([url]) => url.pathname.endsWith('/search'))).toHaveLength(1);
  expect(fetcher.mock.calls.filter(([url]) => url.pathname.endsWith('/videos'))).toHaveLength(4);
});

it('verifies a persisted broadcast ID after restart without spending a search call', async () => {
  const fetcher = vi.fn(async () => json({ items: [video()] }));
  vi.stubGlobal('fetch', fetcher);
  const provider = new YouTubeProvider(config, logger);
  const result = await provider.checkMany([record('a', { state: 'live', currentSessionId: 'liveVideo01' }), record('b', { state: 'live', lastSnapshot: { sessionId: 'liveVideo01', title: 'Old title', viewerCount: 999, url: 'https://youtube.com/watch?v=liveVideo01' } })]);
  expect(result.get('a')).toMatchObject({ kind: 'live', snapshot: { viewerCount: 42 } });
  expect(result.get('b')).toMatchObject({ kind: 'live', snapshot: { viewerCount: 42 } });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]![0].pathname).toMatch(/\/videos$/);
  expect(fetcher.mock.calls[0]![0].searchParams.get('id')).toBe('liveVideo01');
});

it('paces discovery at fifteen minutes per distinct channel, including manual single-channel checks', async () => {
  let now = 0;
  const fetcher = vi.fn(async () => json({ items: [] }));
  vi.stubGlobal('fetch', fetcher);
  const provider = new YouTubeProvider(config, logger, () => now);
  const other = record('b', { platformUserId: 'UCabcdefghijklmnopqrstuv', username: 'UCabcdefghijklmnopqrstuv' });
  await provider.checkMany([record('a'), record('same-channel'), other]);
  expect(fetcher).toHaveBeenCalledTimes(2);
  now = 15 * 60_000;
  expect((await provider.checkMany([record('a')])).get('a')).toEqual({ kind: 'offline' });
  expect(fetcher).toHaveBeenCalledTimes(2);
  now = 30 * 60_000 - 1;
  await provider.checkMany([record('a'), other]);
  expect(fetcher).toHaveBeenCalledTimes(2);
  now++;
  await provider.checkMany([record('a'), other]);
  expect(fetcher).toHaveBeenCalledTimes(4);
});

it('keeps discovery quota failures as errors during backoff and hides raw key-containing errors', async () => {
  let now = 0;
  const fetcher = vi.fn(async () => json({ error: { message: `Secret ${config.youtubeApiKey}`, errors: [{ reason: 'quotaExceeded' }] } }, 403));
  vi.stubGlobal('fetch', fetcher);
  const provider = new YouTubeProvider(config, logger, () => now);
  const first = (await provider.checkMany([record('a')])).get('a');
  expect(first).toMatchObject({ kind: 'error', error: expect.stringContaining('quotaExceeded') });
  expect(JSON.stringify(first)).not.toContain(config.youtubeApiKey);
  now = 60_000;
  expect((await provider.checkMany([record('a')])).get('a')).toEqual(first);
  expect(fetcher).toHaveBeenCalledTimes(1);
  now = 15 * 60_000;
  fetcher.mockImplementation(async () => json({ items: [] }));
  expect((await provider.checkMany([record('a')])).get('a')).toEqual({ kind: 'offline' });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('breaks observations on a live-video API outage and resumes with a fresh sample', async () => {
  let failing = false;
  const fetcher = vi.fn(async () => {
    if (failing) throw new Error(`Timeout requesting URL with ${config.youtubeApiKey}`);
    return json({ items: [video()] });
  });
  vi.stubGlobal('fetch', fetcher);
  const provider = new YouTubeProvider(config, logger);
  const tracked = record('a', { state: 'live', currentSessionId: 'liveVideo01' });
  expect((await provider.checkMany([tracked])).get('a')).toMatchObject({ kind: 'live' });
  failing = true;
  const outage = (await provider.checkMany([tracked])).get('a');
  expect(outage).toMatchObject({ kind: 'error' });
  expect(JSON.stringify(outage)).not.toContain(config.youtubeApiKey);
  failing = false;
  expect((await provider.checkMany([tracked])).get('a')).toMatchObject({ kind: 'live', snapshot: { viewerCount: 42 } });
  expect(fetcher.mock.calls.every(([url]) => url.pathname.endsWith('/videos'))).toBe(true);
});

it('batches known broadcasts in fifty IDs and isolates a failed batch from other channels', async () => {
  const records = Array.from({ length: 51 }, (_, index) => record(`guild-${index}`, { platformUserId: `UC${String(index).padStart(22, '0')}`, username: `UC${String(index).padStart(22, '0')}`, state: 'live', currentSessionId: `v${String(index).padStart(10, '0')}` }));
  const fetcher = vi.fn(async (url: URL) => {
    const ids = url.searchParams.get('id')!.split(',');
    if (ids.length === 50) return json({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403);
    return json({ items: ids.map(id => video(id, {}, { channelId: records[Number(id.slice(1))]!.platformUserId })) });
  });
  vi.stubGlobal('fetch', fetcher);
  const result = await new YouTubeProvider(config, logger).checkMany(records);
  expect(result.get('guild-0')).toMatchObject({ kind: 'error' });
  expect(result.get('guild-50')).toMatchObject({ kind: 'live' });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls.every(([url]) => url.pathname.endsWith('/videos') && url.searchParams.get('id')!.split(',').length <= 50)).toBe(true);
});

it.each([
  [undefined, 'upcoming'],
  ['2026-10-12T10:00:00Z', 'upcoming'],
  ['2026-10-12T10:00:00Z', 'none'],
  ['invalid-time', 'live'],
])('never treats unverified starts and non-live snippets as live (%s, %s)', async (actualStartTime, liveBroadcastContent) => {
  vi.stubGlobal('fetch', vi.fn(async (url: URL) => url.pathname.endsWith('/search') ? json({ items: [{ id: { videoId: 'liveVideo01' } }] }) : json({ items: [video('liveVideo01', { actualStartTime }, { liveBroadcastContent })] })));
  expect((await new YouTubeProvider(config, logger).checkMany([record('a')])).get('a')).toEqual({ kind: 'offline' });
});
