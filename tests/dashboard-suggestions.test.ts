import { afterEach, expect, it, vi } from 'vitest';
import type { Client, Guild } from 'discord.js';
import type { AccessService } from '../src/control/access.js';
import { DashboardServer } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';

const origin = 'https://cyro.example';
const guildId = '123456789012345678';
const otherGuildId = '223456789012345678';
const userId = '323456789012345678';
const running: DashboardServer[] = [];
afterEach(async () => { await Promise.all(running.splice(0).map(server => server.stop())); });

async function fixture() {
  const sessions = new SessionStore();
  const sid = sessions.create({ id: userId, username: 'staff', avatar: null }, 'unused-access', 3600);
  let allowed = true;
  const guild = { id: guildId, name: 'First', ownerId: 'owner', icon: null, memberCount: 2,
    members: { cache: new Map() }, channels: { fetch: async () => new Map() }, roles: { cache: new Map() } };
  const otherGuild = { ...guild, id: otherGuildId, name: 'Second' };
  const access = {
    dashboard: vi.fn(async () => { if (!allowed) throw new Error('Access revoked.'); }),
    config: () => ({ managerAccess: true, dashboardRoleIds: [], commandRoles: {} }),
  };
  const suggestions = {
    getConfig: vi.fn(async () => ({ enabled: false, channelId: null, cooldownMinutes: 5 })),
    snapshot: vi.fn(async (id: string, page = 1) => ({ config: { enabled: false, channelId: null, cooldownMinutes: 5 }, items: [{ id: `${id}-item`, number: 1, status: 'open' }], counts: { open: 1, accepted: 0, declined: 0, closed: 0, pending: 0 }, page, totalPages: 2 })),
    updateConfig: vi.fn(async (_id: string, input: unknown, authorize?: () => Promise<void>) => { await authorize?.(); return input; }),
    decide: vi.fn(async (_guild: Guild, _actorId: string, id: string, input: unknown) => ({ id, ...(input as object) })),
  };
  const module = { getConfig: async () => ({}), snapshot: async () => ({}), updateConfig: async () => ({}) };
  const server = new DashboardServer({ client: { isReady: () => true, guilds: { cache: new Map([[guildId, guild], [otherGuildId, otherGuild]]) } } as unknown as Client,
    config: { discordClientId: '1', discordToken: '', dataDir: '.', logLevel: 'error', autoDeployCommands: false, pollIntervalSeconds: 60, dashboardUrl: origin },
    logger: new Logger('error'), community: module, moderation: module, sessions, streams: { list: async () => [] } as never,
    access: access as unknown as AccessService, suggestions, publicDir: 'public' });
  running.push(server); const port = await server.start(0, '127.0.0.1');
  const base = `http://127.0.0.1:${port}`;
  const headers = { Cookie: `dashboard_session=${sid}`, Origin: origin, 'X-CSRF-Token': sessions.peek(sid)!.csrfToken, 'Content-Type': 'application/json' };
  return { base, headers, guild, otherGuild, suggestions, access, sessions, sid, revoke: () => { allowed = false; } };
}

it('scopes suggestion snapshots to the selected guild and rechecks current dashboard access', async () => {
  const f = await fixture();
  for (const id of [guildId, otherGuildId]) {
    const response = await fetch(`${f.base}/api/guilds/${id}/suggestions`, { headers: f.headers });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ items: [{ id: `${id}-item` }] });
    expect(f.suggestions.snapshot).toHaveBeenLastCalledWith(id, 1);
  }
  expect(f.access.dashboard).toHaveBeenNthCalledWith(1, f.guild, userId);
  expect(f.access.dashboard).toHaveBeenNthCalledWith(2, f.otherGuild, userId);
  f.revoke();
  expect((await fetch(`${f.base}/api/guilds/${guildId}/suggestions`, { headers: f.headers })).status).toBe(403);
  expect((await fetch(`${f.base}/api/guilds/999999999999999999/suggestions`, { headers: f.headers })).status).toBe(404);
  expect((await fetch(`${f.base}/api/guilds/${guildId}/suggestions`)).status).toBe(401);
  expect(f.suggestions.snapshot).toHaveBeenCalledTimes(2);
});

it('protects suggestion configuration writes with session, origin, CSRF and current dashboard roles', async () => {
  const f = await fixture();
  const url = `${f.base}/api/guilds/${guildId}/suggestions`;
  const input = { enabled: true, channelId: '423456789012345678', cooldownMinutes: 5 };
  const request = { method: 'PATCH', headers: f.headers, body: JSON.stringify(input) };
  expect((await fetch(url, { ...request, headers: { 'Content-Type': 'application/json' } })).status).toBe(401);
  expect((await fetch(url, { ...request, headers: { ...f.headers, Origin: 'https://untrusted.example' } })).status).toBe(403);
  expect((await fetch(url, { ...request, headers: { ...f.headers, 'X-CSRF-Token': '' } })).status).toBe(403);
  expect(f.suggestions.updateConfig).not.toHaveBeenCalled();
  const response = await fetch(url, request);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ config: input });
  expect(f.suggestions.updateConfig).toHaveBeenCalledExactlyOnceWith(guildId, input, expect.any(Function));
  f.revoke();
  expect((await fetch(url, request)).status).toBe(403);
  expect(f.suggestions.updateConfig).toHaveBeenCalledOnce();
});

it('uses the authorized guild and signed-in actor for decisions and does not expose a member voting API', async () => {
  const f = await fixture();
  const id = 'suggestion-item';
  const input = { status: 'accepted', reason: 'Adding this next.' };
  const request = { method: 'POST', headers: f.headers, body: JSON.stringify(input) };
  const response = await fetch(`${f.base}/api/guilds/${otherGuildId}/suggestions/${id}`, request);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ suggestion: { id, ...input } });
  expect(f.suggestions.decide).toHaveBeenCalledExactlyOnceWith(f.otherGuild, userId, id, input);
  expect((await fetch(`${f.base}/api/guilds/${guildId}/suggestions/${id}`, { ...request, headers: { ...f.headers, 'X-CSRF-Token': 'forged' } })).status).toBe(403);
  expect((await fetch(`${f.base}/api/guilds/${guildId}/suggestions`, request)).status).toBe(405);
  expect((await fetch(`${f.base}/api/guilds/${guildId}/suggestions/${id}`, { ...request, method: 'PATCH' })).status).toBe(405);
  expect((await fetch(`${f.base}/api/guilds/${guildId}/suggestions/${id}/vote`, request)).status).toBe(404);
  f.revoke();
  expect((await fetch(`${f.base}/api/guilds/${guildId}/suggestions/${id}`, request)).status).toBe(403);
  expect(f.suggestions.decide).toHaveBeenCalledOnce();
});

it('includes the same guild suggestions snapshot in the main dashboard payload', async () => {
  const f = await fixture();
  const response = await fetch(`${f.base}/api/guilds/${guildId}`, { headers: f.headers });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ guild: { id: guildId }, suggestions: { items: [{ id: `${guildId}-item` }], counts: { open: 1 } } });
  expect(f.suggestions.snapshot).toHaveBeenCalledExactlyOnceWith(guildId);
});

it('returns validation errors without accepting unsupported settings or cross-guild decisions', async () => {
  const f = await fixture();
  f.suggestions.updateConfig.mockRejectedValueOnce(new Error('Choose a text or announcement channel in this server.'));
  const configResponse = await fetch(`${f.base}/api/guilds/${guildId}/suggestions`, {
    method: 'PATCH', headers: f.headers, body: JSON.stringify({ enabled: true, channelId: 'foreign-channel' }),
  });
  expect(configResponse.status).toBe(400);
  expect(await configResponse.json()).toEqual({ error: 'Choose a text or announcement channel in this server.', i18n: { key: 'Choose a text or announcement channel in this server.', params: {} } });
  f.suggestions.decide.mockRejectedValueOnce(new Error('That suggestion does not belong to this server.'));
  const decisionResponse = await fetch(`${f.base}/api/guilds/${guildId}/suggestions/other-guild-item`, {
    method: 'POST', headers: f.headers, body: JSON.stringify({ status: 'accepted' }),
  });
  expect(decisionResponse.status).toBe(400);
  expect(await decisionResponse.json()).toEqual({ error: 'That suggestion does not belong to this server.', i18n: { key: 'That suggestion does not belong to this server.', params: {} } });
  expect(f.suggestions.decide).toHaveBeenCalledExactlyOnceWith(f.guild, userId, 'other-guild-item', { status: 'accepted' });
});

it('rechecks dashboard authority after a queued configuration write before committing it', async () => {
  const f = await fixture();
  const committed = vi.fn();
  f.suggestions.updateConfig.mockImplementation(async (_id, input, authorize) => {
    f.revoke();
    await authorize?.();
    committed();
    return input;
  });
  const response = await fetch(`${f.base}/api/guilds/${guildId}/suggestions`, {
    method: 'PATCH', headers: f.headers, body: JSON.stringify({ enabled: true, channelId: '423456789012345678', cooldownMinutes: 5 }),
  });
  expect(response.status).toBe(403);
  expect(committed).not.toHaveBeenCalled();
});

it('allows staff to page older suggestions without accepting invalid page values', async () => {
  const f = await fixture();
  const url = `${f.base}/api/guilds/${guildId}/suggestions`;
  const response = await fetch(`${url}?page=2`, { headers: f.headers });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ page: 2 });
  expect(f.suggestions.snapshot).toHaveBeenCalledExactlyOnceWith(guildId, 2);
  for (const page of ['', '0', '-1', '1.5', '1e2', 'NaN', '100001']) {
    expect((await fetch(`${url}?page=${encodeURIComponent(page)}`, { headers: f.headers })).status).toBe(400);
  }
  expect(f.suggestions.snapshot).toHaveBeenCalledOnce();
});
