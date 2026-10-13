import { afterEach, expect, it, vi } from 'vitest';
import type { AppConfig } from '../src/config.js';
import { Logger } from '../src/logger.js';
import { TwitchProvider } from '../src/providers/twitch.js';
import { KickProvider } from '../src/providers/kick.js';
import { TikTokProvider } from '../src/providers/tiktok.js';
import { TikTokLiveConnection } from 'tiktok-live-connector';
import type { StreamerRecord } from '../src/types.js';

const config = { twitchClientId: 'client', twitchClientSecret: 'secret', kickClientId: 'client', kickClientSecret: 'secret', logLevel: 'error' } as AppConfig;
const logger = new Logger('error');
const record = (id: string, userId = '42'): StreamerRecord => ({ id, guildId: id, platform: 'twitch', username: 'example', platformUserId: userId, displayName: 'Example', alertChannelId: 'channel', cooldownSeconds: 0, messageTemplate: '{url}', cleanupMode: 'offline', enabled: true, state: 'unknown', createdAt: '', updatedAt: '' });
const stream = { id: 'stream', user_id: '42', user_login: 'example', title: 'Live', game_name: 'Game', viewer_count: 12, started_at: '2026-10-12T00:00:00Z', thumbnail_url: 'https://example.test/{width}/{height}' };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('gets one real Twitch follower baseline and one stream lookup for the same broadcaster in two guilds', async () => {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.hostname === 'id.twitch.tv') return Response.json({ access_token: 'token', expires_in: 3600 });
    if (url.pathname.endsWith('/streams')) { expect(url.searchParams.getAll('user_id')).toEqual(['42']); return Response.json({ data: [stream] }); }
    if (url.pathname.endsWith('/channels/followers')) { expect(url.searchParams.get('broadcaster_id')).toBe('42'); return Response.json({ total: 123, data: [] }); }
    throw new Error('Unexpected request');
  });
  vi.stubGlobal('fetch', fetchMock);
  const results = await new TwitchProvider(config, logger).checkMany([record('guild-a'), record('guild-b')]);
  for (const result of results.values()) expect(result).toMatchObject({ kind: 'live', snapshot: { viewerCount: 12, followerCount: 123 } });
  expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/channels/followers'))).toHaveLength(1);
});

it('reads TikTok wrapped room viewers once per username without mistaking another user follower count for the host', async () => {
  const live = vi.spyOn(TikTokLiveConnection.prototype, 'fetchIsLive').mockResolvedValue(true);
  const info = vi.spyOn(TikTokLiveConnection.prototype, 'fetchRoomInfo').mockResolvedValue({ data: { id_str: 'room', title: 'TikTok Live', user_count: 15, owner: {} }, followInfo: { followerCount: 9999 } });
  const results = await new TikTokProvider(config, logger).checkMany([record('a'), record('b')].map(item => ({ ...item, platform: 'tiktok' })));
  expect(live).toHaveBeenCalledOnce(); expect(info).toHaveBeenCalledOnce();
  for (const result of results.values()) { expect(result).toMatchObject({ kind: 'live', snapshot: { sessionId: 'room', viewerCount: 15 } }); if (result.kind === 'live') expect(result.snapshot.followerCount).toBeUndefined(); }
});

it('preserves TikTok state if no stable room ID is returned and rechecks rooms that ended during polling', async () => {
  vi.spyOn(TikTokLiveConnection.prototype, 'fetchIsLive').mockResolvedValue(true);
  const info = vi.spyOn(TikTokLiveConnection.prototype, 'fetchRoomInfo').mockResolvedValue({ data: { title: 'Incomplete room' } });
  const provider = new TikTokProvider(config, logger);
  expect((await provider.checkMany([{ ...record('a'), platform: 'tiktok' }])).get('a')).toMatchObject({ kind: 'error', error: expect.stringContaining('stable room ID') });
  info.mockResolvedValue({ data: { id_str: 'room', status: 4 } });
  expect((await provider.checkMany([{ ...record('a'), platform: 'tiktok' }])).get('a')).toEqual({ kind: 'offline' });
});

it('does not expose connector errors containing the Euler key or signed URLs', async () => {
  vi.spyOn(TikTokLiveConnection.prototype, 'fetchIsLive').mockRejectedValue(new Error('https://provider.test?apiKey=secret-key&signature=private-signature'));
  const provider = new TikTokProvider({ ...config, tiktokEulerApiKey: 'secret-key' }, logger);
  const result = (await provider.checkMany([{ ...record('a'), platform: 'tiktok' }])).get('a');
  expect(result).toMatchObject({ kind: 'error', error: expect.stringContaining('unofficial connector') });
  expect(JSON.stringify(result)).not.toMatch(/secret-key|private-signature/);
});

it('keeps Twitch live observations when follower totals fail and gives every HTTP request a deadline', async () => {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, options?: RequestInit) => {
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    const url = String(input);
    if (url.includes('id.twitch.tv')) return Response.json({ access_token: 'token', expires_in: 3600 });
    if (url.includes('/streams?')) return Response.json({ data: [stream] });
    return Response.json({ message: 'Unavailable' }, { status: 429 });
  }));
  const result = (await new TwitchProvider(config, logger).checkMany([record('a')])).get('a');
  expect(result).toMatchObject({ kind: 'live', snapshot: { sessionId: 'stream', viewerCount: 12 } });
  if (result?.kind === 'live') expect(result.snapshot.followerCount).toBeUndefined();
});

it('deduplicates Kick broadcaster queries while retaining legitimate zero viewers and unavailable followers', async () => {
  let requests = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, options?: RequestInit) => {
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    const url = new URL(String(input));
    if (url.hostname === 'id.kick.com') return Response.json({ access_token: 'token', expires_in: 3600 });
    expect(url.pathname).toBe('/public/v1/users/livestreams');
    expect(url.searchParams.getAll('user_id')).toEqual(['42']); requests++;
    return Response.json({ data: [{ id: 'kick-session', broadcaster_user: { id: 42, username: 'Example' }, channel: { slug: 'example' }, title: 'Live', category: { name: 'Game' }, viewer_count: 0, started_at: '2026-10-12T00:00:00Z' }] });
  }));
  const result = await new KickProvider(config, logger).checkMany([record('a'), record('b')].map(item => ({ ...item, platform: 'kick' })));
  expect(requests).toBe(1);
  for (const item of result.values()) { expect(item).toMatchObject({ kind: 'live', snapshot: { viewerCount: 0 } }); if (item.kind === 'live') expect(item.snapshot.followerCount).toBeUndefined(); }
});

it('requests all Twitch batch results and bounds follower requests to four without manufacturing malformed totals', async () => {
  let active = 0, maximum = 0;
  const records = Array.from({ length: 8 }, (_, index) => ({ ...record(String(index), String(index)), username: `user${index}` }));
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.hostname === 'id.twitch.tv') return Response.json({ access_token: 'token', expires_in: 3600 });
    if (url.pathname.endsWith('/streams')) {
      expect(url.searchParams.get('first')).toBe('100');
      return Response.json({ data: records.map(item => ({ ...stream, user_id: item.platformUserId, viewer_count: null })) });
    }
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    return Response.json({ total: url.searchParams.get('broadcaster_id') === '0' ? 0 : -1 });
  }));
  const results = await new TwitchProvider(config, logger).checkMany(records);
  expect(maximum).toBe(4);
  for (const [id, result] of results) {
    expect(result.kind).toBe('live');
    if (result.kind === 'live') { expect(result.snapshot.viewerCount).toBeUndefined(); expect(result.snapshot.followerCount).toBe(id === '0' ? 0 : undefined); }
  }
});
