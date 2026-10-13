import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { TikTokService } from '../src/tiktok/service.js';
import { TikTokProvider } from '../src/providers/tiktok.js';
import { JsonStore } from '../src/storage/store.js';
import type { AppConfig } from '../src/config.js';
import type { Logger } from '../src/logger.js';
import type { StreamerRecord } from '../src/types.js';

const guild = '100000000000000001', otherGuild = '100000000000000002', actor = '200000000000000001', otherActor = '200000000000000002';
const logger = { warn: vi.fn() } as unknown as Logger;
const token = (fields = {}) => ({ open_id: 'private-open-id', access_token: 'private-access-token', refresh_token: 'private-refresh-token', expires_in: 86400, refresh_expires_in: 31536000, scope: 'user.info.basic,video.list', token_type: 'Bearer', ...fields });
const json = (body: unknown, status = 200) => Response.json(body, { status });
let folder: string, config: AppConfig, now: number;
const record = (fields: Partial<StreamerRecord> = {}): StreamerRecord => ({ id: 'record-a', guildId: guild, discordMemberId: actor, platform: 'tiktok', username: 'manual-handle', displayName: 'Manual name', alertChannelId: '', cooldownSeconds: 300, enabled: false, state: 'unknown', cleanupMode: 'keep', messageTemplate: '', createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(), ...fields });
const publicVideo = (fields = {}) => ({ id: '1234567890123456789', title: 'A public video', create_time: Math.floor(now / 1000) - 10, share_url: 'https://www.tiktok.com/@real-person/video/1234567890123456789?tracking=removed', ...fields });
const normalFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const url = String(input);
  if (url.includes('/oauth/token/')) return json(token());
  if (url.includes('/user/info/')) return json({ data: { user: { open_id: 'private-open-id', display_name: 'Official creator' } }, error: { code: 'ok' } });
  if (url.includes('/video/list/')) return json({ data: { videos: [publicVideo()], has_more: false }, error: { code: 'ok' } });
  if (url.includes('/oauth/revoke/')) return json({});
  throw new Error('Unexpected request');
};
async function service(fetcher = vi.fn(normalFetch)) {
  const api = new TikTokService(config, logger, { fetch: fetcher as typeof fetch, now: () => now }); await api.init(); return { api, fetcher };
}
beforeEach(async () => {
  const base = path.resolve('work/test-temp'); await mkdir(base, { recursive: true }); folder = await mkdtemp(path.join(base, 'tiktok-'));
  now = Date.parse('2026-10-13T12:00:00Z'); config = { dataDir: folder, dashboardUrl: 'https://cyrobot.ca', tiktokClientKey: 'app-key', tiktokClientSecret: 'private-app-secret' } as AppConfig;
});
afterEach(async () => { if (folder.startsWith(path.resolve('work/test-temp') + path.sep)) await rm(folder, { recursive: true, force: true }); vi.clearAllMocks(); });

it('requests only approved scopes with a static HTTPS callback and explicit consent', async () => {
  const { api } = await service(); const url = new URL(api.authorizationUrl('a'.repeat(43)));
  expect(url.origin + url.pathname).toBe('https://www.tiktok.com/v2/auth/authorize/');
  expect(url.searchParams.get('scope')).toBe('user.info.basic,video.list');
  expect(url.searchParams.get('redirect_uri')).toBe('https://cyrobot.ca/auth/tiktok/callback');
  expect(url.searchParams.get('disable_auto_auth')).toBe('1');
  expect(url.toString()).not.toContain('private-app-secret');
  expect(() => api.authorizationUrl('short')).toThrow('state');
  expect(new TikTokService({ ...config, dashboardUrl: 'http://localhost:3000' }, logger).configured()).toBe(false);
});

it('persists a private grant across restart and returns only sanitized connection status', async () => {
  const { api, fetcher } = await service(); const status = await api.connect(guild, 'record-a', actor, 'authorization-code');
  expect(status).toMatchObject({ connected: true, connectedBy: actor, displayName: 'Official creator', needsReconnect: false });
  expect(JSON.stringify(status)).not.toMatch(/private-|openId|accessToken|refreshToken/);
  const params = new URLSearchParams(String(fetcher.mock.calls[0]?.[1]?.body)); expect(params.get('redirect_uri')).toBe('https://cyrobot.ca/auth/tiktok/callback');
  const restored = (await service()).api; expect(restored.status(guild, 'record-a')).toEqual(status);
  expect(restored.status(otherGuild, 'record-a').connected).toBe(false);
  expect(restored.ownConnections(otherActor)).toEqual([]);
  expect(await restored.guildIds()).toEqual([guild]);
  if (process.platform !== 'win32') expect((await stat(path.join(folder, 'tiktok-connections.json'))).mode & 0o777).toBe(0o600);
});

it('refuses partial scope grants and revokes a new unused token', async () => {
  const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => String(url).includes('/oauth/token/') ? json(token({ scope: 'user.info.basic' })) : normalFetch(url, init));
  const { api } = await service(fetcher); await expect(api.connect(guild, 'record-a', actor, 'code')).rejects.toThrow('not granted');
  expect(api.status(guild, 'record-a').connected).toBe(false);
  expect(fetcher.mock.calls.filter(([url]) => String(url).includes('/revoke/'))).toHaveLength(1);
});

it('checks the TikTok open_id and rechecks caller authority immediately before persistence', async () => {
  const { api, fetcher } = await service(); const guard = vi.fn(async () => { throw new Error('The Discord member changed.'); });
  await expect(api.connect(guild, 'record-a', actor, 'code', guard)).rejects.toThrow('member changed');
  expect(guard).toHaveBeenCalledOnce(); expect(api.status(guild, 'record-a').connected).toBe(false);
  expect(fetcher.mock.calls.filter(([url]) => String(url).includes('/revoke/'))).toHaveLength(1);
  fetcher.mockImplementation(async (url, init) => String(url).includes('/user/info/') ? json({ data: { user: { open_id: 'different', display_name: 'Imposter' } } }) : normalFetch(url, init));
  await expect(api.connect(guild, 'record-a', actor, 'code2')).rejects.toThrow('identity');
});

it('prevents another Discord actor overwriting a grant or attaching its TikTok identity', async () => {
  const { api, fetcher } = await service(); await api.connect(guild, 'record-a', actor, 'code'); fetcher.mockClear();
  await expect(api.connect(guild, 'record-a', otherActor, 'code2')).rejects.toThrow('previous creator');
  expect(fetcher).not.toHaveBeenCalled();
  await expect(api.connect(otherGuild, 'record-b', otherActor, 'code3')).rejects.toThrow('another Discord user');
  expect(fetcher.mock.calls.some(([url]) => String(url).includes('/revoke/'))).toBe(false);
  expect(api.ownConnections(actor)).toHaveLength(1);
});

it('shares one rotating credential across guilds and revokes only after the last binding is removed', async () => {
  const { api, fetcher } = await service(); await api.connect(guild, 'record-a', actor, 'code'); await api.connect(otherGuild, 'record-b', actor, 'code2');
  const persisted = JSON.parse(await readFile(path.join(folder, 'tiktok-connections.json'), 'utf8')); expect(persisted.accounts).toHaveLength(1); expect(persisted.bindings).toHaveLength(2);
  fetcher.mockClear(); expect(await api.disconnect(guild, 'record-a')).toEqual({ revoked: false, remainingConnections: true });
  expect(fetcher).not.toHaveBeenCalled(); expect(api.status(otherGuild, 'record-b').connected).toBe(true);
  expect(await api.disconnect(otherGuild, 'record-b')).toEqual({ revoked: true, remainingConnections: false });
  expect(JSON.parse(await readFile(path.join(folder, 'tiktok-connections.json'), 'utf8'))).toEqual({ version: 1, accounts: [], bindings: [] });
});

it('deletes local access durably even when provider revocation is unavailable', async () => {
  const { api, fetcher } = await service(); await api.connect(guild, 'record-a', actor, 'code');
  fetcher.mockRejectedValue(new Error('secret request private-access-token'));
  expect(await api.disconnect(guild, 'record-a')).toEqual({ revoked: false, remainingConnections: false });
  expect((await service()).api.status(guild, 'record-a').connected).toBe(false);
  expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain('private-access-token');
});

it('refreshes once during concurrent reads, saves rotation, and sends the newest access token', async () => {
  const { api, fetcher } = await service(); await api.connect(guild, 'record-a', actor, 'code'); await api.connect(otherGuild, 'record-b', actor, 'code2'); now += 86400 * 1000;
  fetcher.mockClear(); fetcher.mockImplementation(async (url, init) => String(url).includes('/oauth/token/') ? json(token({ access_token: 'new-private-access', refresh_token: 'new-private-refresh' })) : normalFetch(url, init));
  const results = await Promise.all([api.videos(guild, 'record-a', actor), api.videos(otherGuild, 'record-b', actor)]);
  expect(results[0]).toEqual(results[1]); expect(fetcher.mock.calls.filter(([url]) => String(url).includes('/oauth/token/'))).toHaveLength(1);
  const refresh = fetcher.mock.calls.find(([url]) => String(url).includes('/oauth/token/'))!; expect(new URLSearchParams(String(refresh[1]?.body)).get('refresh_token')).toBe('private-refresh-token');
  expect(fetcher.mock.calls.find(([url]) => String(url).includes('/video/list/'))?.[1]?.headers).toMatchObject({ authorization: 'Bearer new-private-access' });
  const persisted = JSON.parse(await readFile(path.join(folder, 'tiktok-connections.json'), 'utf8')); expect(persisted.accounts[0].refreshToken).toBe('new-private-refresh');
});

it('marks rejected refreshes for reconnection without leaking raw provider errors', async () => {
  const { api, fetcher } = await service(); await api.connect(guild, 'record-a', actor, 'code'); now += 86400 * 1000;
  fetcher.mockClear(); fetcher.mockResolvedValue(json({ error: 'invalid_grant', error_description: 'private-refresh-token' }, 400));
  const result = await api.videos(guild, 'record-a', actor); expect(result).toMatchObject({ kind: 'error', error: expect.stringContaining('connect TikTok again') });
  expect(JSON.stringify(result)).not.toContain('private-refresh-token'); expect(api.status(guild, 'record-a').needsReconnect).toBe(true);
  await api.videos(guild, 'record-a', actor); expect(fetcher).toHaveBeenCalledOnce();
  expect((await service()).api.status(guild, 'record-a').needsReconnect).toBe(true);
});

it('refuses guild substitution, portal impersonation, and use after creator reassignment', async () => {
  const { api, fetcher } = await service(); await api.connect(guild, 'record-a', actor, 'code'); fetcher.mockClear();
  await expect(api.videos(guild, 'record-a', otherActor)).rejects.toThrow('not found');
  await expect(api.videos(otherGuild, 'record-a', actor)).rejects.toThrow('not found');
  const results = await api.checkUploads([record({ discordMemberId: otherActor }), record({ id: 'record-forged', guildId: otherGuild })]);
  expect([...results.values()].every(item => item.kind === 'error')).toBe(true); expect(fetcher).not.toHaveBeenCalled();
  expect(api.ownConnections(actor)).toHaveLength(1); // Original creator can still revoke.
  const provider = new TikTokProvider(config, logger, api);
  expect(provider.uploadCapability(record()).available).toBe(true);
  expect(provider.uploadCapability(record({ discordMemberId: otherActor })).available).toBe(false);
});

it('shares bounded cached public videos without suppressing the first guild baseline', async () => {
  const { api, fetcher } = await service(); await api.connect(guild, 'record-a', actor, 'code'); await api.connect(otherGuild, 'record-b', actor, 'code2'); fetcher.mockClear();
  const preview = await api.videos(guild, 'record-a', actor);
  expect(preview).toMatchObject({ kind: 'uploads', items: [{ title: 'A public video', url: 'https://www.tiktok.com/@real-person/video/1234567890123456789' }] });
  const records = [record(), record({ id: 'record-b', guildId: otherGuild })]; const results = await api.checkUploads(records);
  expect(results.get('record-a')?.kind).toBe('uploads'); expect(results.get('record-b')).toEqual(results.get('record-a'));
  expect([...((await api.checkUploads(records)).values())]).toEqual([{ kind: 'deferred' }, { kind: 'deferred' }]);
  expect(fetcher).toHaveBeenCalledOnce(); expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({ max_count: 20 });
  now += 300_000; expect((await api.checkUploads(records)).get('record-a')?.kind).toBe('uploads'); expect(fetcher).toHaveBeenCalledTimes(2);
});

it('rejects external share URLs and future videos before producing notification data', async () => {
  const { api, fetcher } = await service(); await api.connect(guild, 'record-a', actor, 'code');
  fetcher.mockResolvedValue(json({ data: { videos: [publicVideo(), publicVideo({ share_url: 'https://tiktok.com.evil.test/post' }), publicVideo({ share_url: 'javascript:alert(1)' }), publicVideo({ create_time: now / 1000 + 1000 })] } }));
  const result = await api.videos(guild, 'record-a', actor); expect(result.kind === 'uploads' && result.items).toHaveLength(1);
});

it('fails closed on invalid stored data without replacing the file', async () => {
  const filename = path.join(folder, 'tiktok-connections.json'); await writeFile(filename, '{broken');
  await expect(service()).rejects.toThrow('Existing data was not replaced'); expect(await readFile(filename, 'utf8')).toBe('{broken');
});

it('does not install an in-memory grant when an atomic persistence step fails', async () => {
  const { api, fetcher } = await service(); await mkdir(path.join(folder, 'tiktok-connections.json'));
  await expect(api.connect(guild, 'record-a', actor, 'code')).rejects.toThrow('Could not save');
  expect(api.status(guild, 'record-a').connected).toBe(false); expect(fetcher.mock.calls.some(([url]) => String(url).includes('/revoke/'))).toBe(true);
});

it('honors guild retention cancellation inside its serialized operation', async () => {
  const { api } = await service(); await api.connect(guild, 'record-a', actor, 'code');
  await api.purgeGuild(guild, () => false); expect(api.status(guild, 'record-a').connected).toBe(true);
  await api.purgeGuild(guild); expect(await api.guildIds()).toEqual([]); expect(api.ownConnections(actor)).toEqual([]);
});

it('loads stored TikTok upload settings without relaxing other platform validation', async () => {
  const filename = path.join(folder, 'streamers.json'), store = new JsonStore(filename); await store.init();
  const saved = await store.add(record({ uploads: { enabled: true, channelId: '300000000000000001', messageTemplate: '{url}' } }));
  const restored = new JsonStore(filename); await restored.init(); expect((await restored.get(saved.id))?.uploads?.enabled).toBe(true);
  await expect(restored.add(record({ id: 'twitch-record', platform: 'twitch', uploads: saved.uploads }))).rejects.toThrow('Invalid');
});
