import { afterEach, expect, it, vi } from 'vitest';
import { DashboardServer } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';

const origin = 'https://cyro.example';
const guildId = '123456789012345678', otherId = '223456789012345678', userId = '323456789012345678';
const servers: DashboardServer[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(server => server.stop())); });
async function fixture() {
  const sessions = new SessionStore();
  const sid = sessions.create({ id: userId, username: 'staff', avatar: null }, 'unused', 3600);
  let allowed = true, ready = true;
  const guild = { id: guildId, ownerId: userId, name: 'First', members: { cache: new Map() }, roles: { cache: new Map() }, channels: { fetch: async () => new Map() } };
  const other = { ...guild, id: otherId, name: 'Second' };
  const cache = new Map([[guildId, guild], [otherId, other]]);
  const access = { dashboard: vi.fn(async () => { if (!allowed) throw Error('Revoked'); }), config: () => ({ managerAccess: true, dashboardRoleIds: [], commandRoles: {} }) };
  const config = { enabled: false, channelId: null, roleIds: [] };
  const clock = {
    snapshot: vi.fn((id: string) => ({ config, members: [], counts: { members: 0, active: 0, totalMs: 0 }, asOf: 123, scope: id })),
    updateConfig: vi.fn(async (_id: string, input: unknown, authorize?: () => Promise<void>) => { await authorize?.(); return input; }),
    publishPanel: vi.fn(async (_guild: unknown, _actor: string, _op?: string, authorize?: () => Promise<void>) => { await authorize?.(); return { messageUrl: 'https://discord.com/channels/g/c/m' }; }),
  };
  const module = { getConfig: async () => ({}), snapshot: async () => ({}), updateConfig: async () => ({}) };
  const server = new DashboardServer({ client: { isReady: () => ready, guilds: { cache } } as never,
    config: { discordClientId: '1', discordToken: '', dataDir: '.', logLevel: 'error', autoDeployCommands: false, pollIntervalSeconds: 60, dashboardUrl: origin },
    logger: new Logger('error'), community: module, moderation: module, streams: { list: async () => [] } as never,
    access: access as never, timeClock: clock, sessions, publicDir: 'public' });
  servers.push(server); const port = await server.start(0, '127.0.0.1');
  return { base: `http://127.0.0.1:${port}`, guild, other, cache, clock, config, sessions, sid, access,
    headers: { Cookie: `dashboard_session=${sid}`, Origin: origin, 'X-CSRF-Token': sessions.peek(sid)!.csrfToken, 'Content-Type': 'application/json' },
    revoke: () => { allowed = false; }, disconnect: () => { ready = false; } };
}

it('keeps time clock data within the requested authorized guild and includes it in server details', async () => {
  const f = await fixture();
  for (const id of [guildId, otherId]) {
    const response = await fetch(`${f.base}/api/guilds/${id}/time-clock`, { headers: f.headers });
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ scope: id });
  }
  expect(await (await fetch(`${f.base}/api/guilds/${otherId}`, { headers: f.headers })).json()).toMatchObject({ timeClock: { scope: otherId } });
  expect((await fetch(`${f.base}/api/guilds/${guildId}/time-clock`)).status).toBe(401);
  f.revoke();
  expect((await fetch(`${f.base}/api/guilds/${guildId}/time-clock`, { headers: f.headers })).status).toBe(403);
  expect(f.clock.snapshot).toHaveBeenCalledTimes(3);
});

it('protects saves and panel publication with CSRF and restricts panel input to an operation identifier', async () => {
  const f = await fixture(); const base = `${f.base}/api/guilds/${otherId}/time-clock`;
  const request = { method: 'PATCH', headers: f.headers, body: JSON.stringify(f.config) };
  expect((await fetch(base, { ...request, headers: { ...f.headers, Origin: 'https://foreign.example' } })).status).toBe(403);
  expect((await fetch(base, { ...request, headers: { ...f.headers, 'X-CSRF-Token': '' } })).status).toBe(403);
  expect(f.clock.updateConfig).not.toHaveBeenCalled();
  expect((await fetch(base, request)).status).toBe(200);
  expect(f.clock.updateConfig).toHaveBeenCalledExactlyOnceWith(otherId, f.config, expect.any(Function));
  const operationId = 'b745091a-0aac-4ec8-ae3e-989f37301234';
  const publish = (input: unknown) => fetch(`${base}/panel`, { method: 'POST', headers: f.headers, body: JSON.stringify(input) });
  for (const input of [{}, { operationId: '' }, { operationId, guildId }, { operationId, channelId: guildId }]) expect((await publish(input)).status).toBe(400);
  expect(f.clock.publishPanel).not.toHaveBeenCalled();
  expect((await publish({ operationId })).status).toBe(200);
  expect(f.clock.publishPanel).toHaveBeenCalledExactlyOnceWith(f.other, userId, operationId, expect.any(Function));
});

it.each(['roles', 'session', 'connection', 'guild'])('rechecks %s before queued clock configuration and publication', async reason => {
  for (const operation of ['save', 'publish']) {
    const f = await fixture(), commit = vi.fn();
    const authorization = async (authorize?: () => Promise<void>) => {
      if (reason === 'roles') f.revoke();
      if (reason === 'session') f.sessions.delete(f.sid);
      if (reason === 'connection') f.disconnect();
      if (reason === 'guild') f.cache.delete(guildId);
      await authorize?.(); commit();
    };
    f.clock.updateConfig.mockImplementation(async (_id, input, authorize) => { await authorization(authorize); return input; });
    f.clock.publishPanel.mockImplementation(async (_guild, _actor, _op, authorize) => { await authorization(authorize); return { messageUrl: '' }; });
    const response = await fetch(`${f.base}/api/guilds/${guildId}/time-clock${operation === 'publish' ? '/panel' : ''}`, {
      method: operation === 'publish' ? 'POST' : 'PATCH', headers: f.headers,
      body: JSON.stringify(operation === 'publish' ? { operationId: 'b745091a-0aac-4ec8-ae3e-989f37301234' } : f.config) });
    expect(response.status).toBe(({ roles: 403, session: 401, connection: 503, guild: 404 } as Record<string, number>)[reason]);
    expect(commit).not.toHaveBeenCalled();
  }
});
