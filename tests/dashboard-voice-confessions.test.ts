import { afterEach, expect, it, vi } from 'vitest';
import type { Client } from 'discord.js';
import type { AccessService } from '../src/control/access.js';
import { DashboardServer } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';
import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { VoiceService } from '../src/voice/service.js';
import { VoiceStore } from '../src/voice/store.js';

const origin = 'https://cyro.example';
const guildId = '123456789012345678';
const otherGuildId = '223456789012345678';
const userId = '323456789012345678';
const sections = ['voice', 'confessions'] as const;
const running: DashboardServer[] = [];
afterEach(async () => { await Promise.all(running.splice(0).map(server => server.stop())); });

async function fixture(options: { requestTimeoutMs?: number; useAccess?: boolean; omitFeatures?: boolean; voice?: VoiceService } = {}) {
  const sessions = new SessionStore();
  const sid = sessions.create({ id: userId, username: 'owner', avatar: null }, 'unused-access', 3600);
  let allowed = true;
  let ready = true;
  const guild = { id: guildId, name: 'First', ownerId: userId, icon: null, memberCount: 2,
    members: { cache: new Map(), fetch: vi.fn(async () => ({ permissions: { has: () => allowed } })) },
    channels: { fetch: async () => new Map() }, roles: { cache: new Map(), fetch: vi.fn(async () => undefined) } };
  const otherGuild = { ...guild, id: otherGuildId, name: 'Second' };
  const cache = new Map([[guildId, guild], [otherGuildId, otherGuild]]);
  const access = {
    dashboard: vi.fn(async () => { if (!allowed) throw new Error('Access revoked.'); }),
    config: () => ({ managerAccess: true, dashboardRoleIds: [], commandRoles: {} }),
  };
  const configs = {
    voice: { musicEnabled: true, ttsEnabled: true, defaultVoice: 'voice1', volume: 50, maxTrackMinutes: 15 },
    confessions: { enabled: false, channelId: null, cooldownSeconds: 60 },
  };
  const makeFeature = (section: typeof sections[number]) => ({
    snapshot: vi.fn((id: string) => ({ config: configs[section], scope: id })),
    updateConfig: vi.fn(async (_id: string, input: unknown, authorize?: () => Promise<void>) => { await authorize?.(); return input; }),
  });
  const features = { voice: makeFeature('voice'), confessions: makeFeature('confessions') };
  const module = { getConfig: async () => ({}), snapshot: async () => ({}), updateConfig: async () => ({}) };
  const server = new DashboardServer({ client: { isReady: () => ready, guilds: { cache } } as unknown as Client,
    config: { discordClientId: '1', discordToken: '', dataDir: '.', logLevel: 'error', autoDeployCommands: false, pollIntervalSeconds: 60, dashboardUrl: origin },
    logger: new Logger('error'), community: module, moderation: module, sessions, streams: { list: async () => [] } as never,
    ...(options.useAccess === false ? {} : { access: access as unknown as AccessService }),
    ...(options.omitFeatures ? {} : { ...features, ...(options.voice ? { voice: options.voice } : {}) }), requestTimeoutMs: options.requestTimeoutMs, publicDir: 'public' });
  running.push(server); const port = await server.start(0, '127.0.0.1');
  const base = `http://127.0.0.1:${port}`;
  const headers = { Cookie: `dashboard_session=${sid}`, Origin: origin, 'X-CSRF-Token': sessions.peek(sid)!.csrfToken, 'Content-Type': 'application/json' };
  return { base, headers, guild, otherGuild, features, configs, access, sessions, sid, cache,
    revoke: () => { allowed = false; }, disconnect: () => { ready = false; } };
}

it('serves voice and confession snapshots only for the selected installed server with fresh access', async () => {
  const f = await fixture();
  for (const section of sections) {
    for (const id of [guildId, otherGuildId]) {
      const response = await fetch(`${f.base}/api/guilds/${id}/${section}`, { headers: f.headers });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ config: f.configs[section], scope: id });
      expect(f.features[section].snapshot).toHaveBeenLastCalledWith(id);
    }
    expect((await fetch(`${f.base}/api/guilds/${guildId}/${section}`)).status).toBe(401);
    expect((await fetch(`${f.base}/api/guilds/999999999999999999/${section}`, { headers: f.headers })).status).toBe(404);
  }
  expect(f.access.dashboard).toHaveBeenNthCalledWith(1, f.guild, userId);
  expect(f.access.dashboard).toHaveBeenNthCalledWith(2, f.otherGuild, userId);
  f.revoke();
  for (const section of sections) {
    expect((await fetch(`${f.base}/api/guilds/${guildId}/${section}`, { headers: f.headers })).status).toBe(403);
    expect(f.features[section].snapshot).toHaveBeenCalledTimes(2);
  }
});

it('protects feature saves with session, origin, CSRF, and current dashboard access', async () => {
  const f = await fixture();
  for (const section of sections) {
    const url = `${f.base}/api/guilds/${otherGuildId}/${section}`;
    const request = { method: 'PATCH', headers: f.headers, body: JSON.stringify(f.configs[section]) };
    expect((await fetch(url, { ...request, headers: { 'Content-Type': 'application/json' } })).status).toBe(401);
    expect((await fetch(url, { ...request, headers: { ...f.headers, Origin: 'https://untrusted.example' } })).status).toBe(403);
    expect((await fetch(url, { ...request, headers: { ...f.headers, 'X-CSRF-Token': '' } })).status).toBe(403);
    expect(f.features[section].updateConfig).not.toHaveBeenCalled();
    const response = await fetch(url, request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ config: f.configs[section] });
    expect(f.features[section].updateConfig).toHaveBeenCalledOnce();
    expect(f.features[section].updateConfig.mock.calls[0]?.slice(0, 2)).toEqual([otherGuildId, f.configs[section]]);
  }
  f.revoke();
  for (const section of sections) {
    expect((await fetch(`${f.base}/api/guilds/${guildId}/${section}`, { method: 'PATCH', headers: f.headers, body: JSON.stringify(f.configs[section]) })).status).toBe(403);
    expect(f.features[section].updateConfig).toHaveBeenCalledOnce();
  }
});

it('durably saves a default voice and speaker names through the authorized dashboard for only that guild', async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'cyro-dashboard-voices-'));
  const client = Object.assign(new EventEmitter(), { guilds: { cache: new Map() } });
  const voice = new VoiceService(client as never, folder, new Logger('error'), {} as AccessService);
  try {
    await voice.init();
    const f = await fixture({ voice });
    const url = `${f.base}/api/guilds/${guildId}/voice`;
    const response = await fetch(url, { headers: f.headers });
    expect(response.status).toBe(200);
    const snapshot = await response.json();
    expect(snapshot.voices.slice(0, 12).map((item: { id: string }) => item.id)).toEqual(Array.from({ length: 12 }, (_, i) => `voice${i + 1}`));
    expect(snapshot.voices).toHaveLength(27);
    expect(snapshot.voices.filter((item: { language: string }) => item.language === 'de')).toHaveLength(2);
    expect(snapshot.voices.every((item: { available: unknown }) => typeof item.available === 'boolean')).toBe(true);
    expect(snapshot.voices.some((item: { id: string }) => item.id === 'fr-siwis')).toBe(true);
    expect(snapshot.voices.filter((item: { language: string; gender: string }) => item.language === 'en' && item.gender === 'male')).toHaveLength(6);
    expect(snapshot.voices.filter((item: { language: string; gender: string }) => item.language === 'en' && item.gender === 'female')).toHaveLength(6);
    expect(snapshot.config.announceSpeaker).toBe(false);
    const updated = { ...snapshot.config, defaultVoice: 'voice12', announceSpeaker: true };
    const saved = await fetch(url, { method: 'PATCH', headers: f.headers, body: JSON.stringify(updated) });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ config: updated });
    expect(await (await fetch(url, { headers: f.headers })).json()).toMatchObject({ config: updated });
    const restart = new VoiceStore(folder); await restart.init();
    expect(restart.get(guildId).config.defaultVoice).toBe('voice12');
    expect(restart.get(guildId).config.announceSpeaker).toBe(true);
    expect(restart.get(otherGuildId).config.defaultVoice).toBe('voice1');
    expect(restart.get(otherGuildId).config.announceSpeaker).toBe(false);
    f.revoke();
    expect((await fetch(url, { method: 'PATCH', headers: f.headers, body: JSON.stringify({ ...updated, defaultVoice: 'voice10', announceSpeaker: false }) })).status).toBe(403);
    expect(voice.getConfig(guildId).defaultVoice).toBe('voice12');
    expect(voice.getConfig(guildId).announceSpeaker).toBe(true);
  } finally {
    voice.stop(); await voice.flush();
    await rm(folder, { recursive: true, force: true });
  }
});

it('revalidates authority and the live bot before queued feature saves commit', async () => {
  for (const section of sections) {
    for (const reason of ['roles', 'session', 'connection', 'guild', 'session-during-check', 'connection-during-check', 'guild-during-check'] as const) {
      const f = await fixture();
      const committed = vi.fn();
      f.features[section].updateConfig.mockImplementation(async (_id, input, authorize) => {
        if (reason === 'roles') f.revoke();
        if (reason === 'session') f.sessions.delete(f.sid);
        if (reason === 'connection') f.disconnect();
        if (reason === 'guild') f.cache.delete(guildId);
        if (reason.endsWith('-during-check')) f.access.dashboard.mockImplementation(async () => {
          if (reason === 'session-during-check') f.sessions.delete(f.sid);
          if (reason === 'connection-during-check') f.disconnect();
          if (reason === 'guild-during-check') f.cache.delete(guildId);
        });
        await authorize?.();
        committed();
        return input;
      });
      const response = await fetch(`${f.base}/api/guilds/${guildId}/${section}`, { method: 'PATCH', headers: f.headers, body: JSON.stringify(f.configs[section]) });
      const expected = reason === 'roles' ? 403 : reason.startsWith('session') ? 401 : reason.startsWith('connection') ? 503 : 404;
      expect(response.status, `${section}: ${reason}`).toBe(expected);
      expect(committed, `${section}: ${reason}`).not.toHaveBeenCalled();
      expect(f.features[section].updateConfig).toHaveBeenCalledExactlyOnceWith(guildId, f.configs[section], expect.any(Function));
    }
  }
});

it('reports feature validation errors and rejects unsupported operations without extra writes', async () => {
  const f = await fixture();
  for (const section of sections) {
    const url = `${f.base}/api/guilds/${guildId}/${section}`;
    const request = { method: 'PATCH', headers: f.headers, body: JSON.stringify(f.configs[section]) };
    f.features[section].updateConfig.mockRejectedValueOnce(new Error('Choose settings within the allowed range.'));
    const response = await fetch(url, request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Choose settings within the allowed range.' });
    expect((await fetch(url, { ...request, method: 'POST' })).status).toBe(405);
    expect((await fetch(`${url}/foreign-record`, request)).status).toBe(405);
    expect((await fetch(`${url}/foreign-record`, { headers: f.headers })).status).toBe(405);
    expect(f.features[section].updateConfig).toHaveBeenCalledOnce();
  }
  const unavailable = await fixture({ omitFeatures: true });
  for (const section of sections) {
    expect((await fetch(`${unavailable.base}/api/guilds/${guildId}/${section}`, { headers: unavailable.headers })).status).toBe(503);
  }
});

it('includes both features in the selected server detail payload', async () => {
  const f = await fixture();
  const response = await fetch(`${f.base}/api/guilds/${otherGuildId}`, { headers: f.headers });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ guild: { id: otherGuildId }, voice: { config: f.configs.voice, scope: otherGuildId }, confessions: { config: f.configs.confessions, scope: otherGuildId } });
  for (const section of sections) expect(f.features[section].snapshot).toHaveBeenCalledExactlyOnceWith(otherGuildId);
});

it('serves the two dashboard scripts from the explicit public asset allowlist', async () => {
  const f = await fixture();
  for (const [asset, render] of [['audio.js', 'renderVoice'], ['confessions.js', 'renderConfessions']]) {
    const response = await fetch(`${f.base}/${asset}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/javascript');
    expect(await response.text()).toContain(`function ${render}(main)`);
  }
  expect((await fetch(`${f.base}/server.ts`)).status).toBe(404);
});

it('rechecks Discord membership when the optional access service is absent', async () => {
  for (const section of sections) {
    const f = await fixture({ useAccess: false });
    const committed = vi.fn();
    f.features[section].updateConfig.mockImplementation(async (_id, input, authorize) => {
      f.revoke(); await authorize?.(); committed(); return input;
    });
    const response = await fetch(`${f.base}/api/guilds/${guildId}/${section}`, { method: 'PATCH', headers: f.headers, body: JSON.stringify(f.configs[section]) });
    expect(response.status).toBe(403);
    expect(committed).not.toHaveBeenCalled();
    expect(f.guild.members.fetch).toHaveBeenCalledTimes(2);
    expect(f.guild.members.fetch).toHaveBeenLastCalledWith({ user: userId, force: true });
    expect(f.guild.roles.fetch).toHaveBeenCalledTimes(2);
  }
});

it('does not commit a delayed feature save after its HTTP response has timed out', async () => {
  for (const section of sections) {
    const f = await fixture({ requestTimeoutMs: 150 });
    let entered!: () => void, release!: () => void, finished!: () => void;
    const called = new Promise<void>(resolve => { entered = resolve; });
    const hold = new Promise<void>(resolve => { release = resolve; });
    const checked = new Promise<void>(resolve => { finished = resolve; });
    const committed = vi.fn();
    f.features[section].updateConfig.mockImplementation(async (_id, input, authorize) => {
      entered(); await hold;
      try { await authorize?.(); committed(); return input; }
      finally { finished(); }
    });
    const request = fetch(`${f.base}/api/guilds/${guildId}/${section}`, { method: 'PATCH', headers: f.headers, body: JSON.stringify(f.configs[section]) });
    await called;
    try {
      const response = await request;
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ error: expect.stringContaining('timed out') });
    } finally { release(); }
    await checked;
    expect(committed).not.toHaveBeenCalled();
  }
});
