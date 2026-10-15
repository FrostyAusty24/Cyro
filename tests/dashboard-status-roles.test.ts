import { afterEach, expect, it, vi } from 'vitest';
import type { Client } from 'discord.js';
import type { AccessService } from '../src/control/access.js';
import { DashboardServer } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';

const origin = 'https://cyro.example';
const guildId = '123456789012345678';
const otherGuildId = '223456789012345678';
const userId = '323456789012345678';
const roleId = '423456789012345678';
const running: DashboardServer[] = [];
afterEach(async () => { await Promise.all(running.splice(0).map(server => server.stop())); });

async function fixture() {
  const sessions = new SessionStore();
  const sid = sessions.create({ id: userId, username: 'owner', avatar: null }, 'unused-access', 3600);
  let allowed = true;
  const guild = { id: guildId, name: 'First', ownerId: userId, icon: null, memberCount: 2, fetch: vi.fn(async () => undefined),
    members: { cache: new Map() }, channels: { fetch: async () => new Map() }, roles: { cache: new Map() } };
  const otherGuild = { ...guild, id: otherGuildId, name: 'Second' };
  const access = {
    dashboard: vi.fn(async () => { if (!allowed) throw new Error('Access revoked.'); }),
    config: () => ({ managerAccess: true, dashboardRoleIds: [], commandRoles: {} }),
    update: vi.fn(async (_guild: unknown, _actor: string, input: unknown) => input),
  };
  const config = { enabled: true, text: 'cyro', roleId, match: 'contains', caseSensitive: false, offlineBehavior: 'keep' };
  const statusRoles = {
    getConfig: vi.fn(() => config),
    automaticRoleIds: vi.fn(() => [config.roleId]),
    snapshot: vi.fn((id: string) => ({ config: { ...config, text: `status-${id}` }, available: true, counts: { assigned: 1, pendingAdd: 0, pendingRemove: 0 }, warnings: [] })),
    updateConfig: vi.fn(async (_id: string, input: unknown, authorize?: () => Promise<void>) => { await authorize?.(); return input; }),
  };
  const module = { getConfig: async () => ({}), snapshot: async () => ({}), updateConfig: async () => ({}) };
  const server = new DashboardServer({ client: { isReady: () => true, guilds: { cache: new Map([[guildId, guild], [otherGuildId, otherGuild]]) } } as unknown as Client,
    config: { discordClientId: '1', discordToken: '', dataDir: '.', logLevel: 'error', autoDeployCommands: false, pollIntervalSeconds: 60, dashboardUrl: origin },
    logger: new Logger('error'), community: module, moderation: module, sessions, streams: { list: async () => [] } as never,
    access: access as unknown as AccessService, statusRoles, publicDir: 'public' });
  running.push(server); const port = await server.start(0, '127.0.0.1');
  const base = `http://127.0.0.1:${port}`;
  const headers = { Cookie: `dashboard_session=${sid}`, Origin: origin, 'X-CSRF-Token': sessions.peek(sid)!.csrfToken, 'Content-Type': 'application/json' };
  return { base, headers, guild, otherGuild, statusRoles, config, access, sessions, sid, revoke: () => { allowed = false; } };
}

it('scopes status role snapshots to the selected server and checks fresh dashboard access', async () => {
  const f = await fixture();
  for (const id of [guildId, otherGuildId]) {
    const response = await fetch(`${f.base}/api/guilds/${id}/status-roles`, { headers: f.headers });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ config: { text: `status-${id}` }, available: true, counts: { assigned: 1 } });
    expect(f.statusRoles.snapshot).toHaveBeenLastCalledWith(id);
  }
  expect(f.access.dashboard).toHaveBeenNthCalledWith(1, f.guild, userId);
  expect(f.access.dashboard).toHaveBeenNthCalledWith(2, f.otherGuild, userId);
  f.revoke();
  expect((await fetch(`${f.base}/api/guilds/${guildId}/status-roles`, { headers: f.headers })).status).toBe(403);
  expect((await fetch(`${f.base}/api/guilds/999999999999999999/status-roles`, { headers: f.headers })).status).toBe(404);
  expect((await fetch(`${f.base}/api/guilds/${guildId}/status-roles`)).status).toBe(401);
  expect(f.statusRoles.snapshot).toHaveBeenCalledTimes(2);
});

it('protects status role changes with session, origin, CSRF and current dashboard roles', async () => {
  const f = await fixture();
  const url = `${f.base}/api/guilds/${guildId}/status-roles`;
  const request = { method: 'PATCH', headers: f.headers, body: JSON.stringify(f.config) };
  expect((await fetch(url, { ...request, headers: { 'Content-Type': 'application/json' } })).status).toBe(401);
  expect((await fetch(url, { ...request, headers: { ...f.headers, Origin: 'https://untrusted.example' } })).status).toBe(403);
  expect((await fetch(url, { ...request, headers: { ...f.headers, 'X-CSRF-Token': '' } })).status).toBe(403);
  expect(f.statusRoles.updateConfig).not.toHaveBeenCalled();
  const response = await fetch(url, request);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ config: f.config });
  expect(f.statusRoles.updateConfig).toHaveBeenCalledExactlyOnceWith(guildId, f.config, expect.any(Function));
  f.revoke();
  expect((await fetch(url, request)).status).toBe(403);
  expect(f.statusRoles.updateConfig).toHaveBeenCalledOnce();
});

it('prevents the owner from granting dashboard or command access through a configured status role', async () => {
  const f = await fixture();
  const url = `${f.base}/api/guilds/${guildId}/access`;
  for (const input of [
    { managerAccess: true, dashboardRoleIds: [roleId], commandRoles: {} },
    { managerAccess: true, dashboardRoleIds: [], commandRoles: { moderate: [roleId] } },
  ]) {
    const response = await fetch(url, { method: 'PATCH', headers: f.headers, body: JSON.stringify(input) });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('Remove that assignment first') });
  }
  expect(f.statusRoles.getConfig).toHaveBeenCalledTimes(2);
  expect(f.statusRoles.getConfig).toHaveBeenLastCalledWith(guildId);
  expect(f.access.update).not.toHaveBeenCalled();
  // An unrelated regular access role stays allowed.
  const otherRole = '523456789012345678';
  const input = { managerAccess: true, dashboardRoleIds: [otherRole], commandRoles: {} };
  expect((await fetch(url, { method: 'PATCH', headers: f.headers, body: JSON.stringify(input) })).status).toBe(200);
  expect(f.access.update).toHaveBeenCalledExactlyOnceWith(f.guild, userId, input);
});

it('includes status role availability and counts in the main selected-server payload', async () => {
  const f = await fixture();
  const response = await fetch(`${f.base}/api/guilds/${otherGuildId}`, { headers: f.headers });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ guild: { id: otherGuildId }, statusRoles: { config: { text: `status-${otherGuildId}` }, available: true, counts: { assigned: 1 } } });
  expect(f.statusRoles.snapshot).toHaveBeenCalledExactlyOnceWith(otherGuildId);
});

it('rechecks the session and dashboard permission immediately before a queued status-role write commits', async () => {
  const f = await fixture();
  const committed = vi.fn();
  f.statusRoles.updateConfig.mockImplementation(async (_id, input, authorize) => {
    f.revoke();
    await authorize?.();
    committed();
    return input;
  });
  const response = await fetch(`${f.base}/api/guilds/${guildId}/status-roles`, {
    method: 'PATCH', headers: f.headers, body: JSON.stringify(f.config),
  });
  expect(response.status).toBe(403);
  expect(committed).not.toHaveBeenCalled();

  const expired = await fixture();
  expired.statusRoles.updateConfig.mockImplementation(async (_id, input, authorize) => {
    expired.sessions.delete(expired.sid);
    await authorize?.();
    committed();
    return input;
  });
  const expiryResponse = await fetch(`${expired.base}/api/guilds/${guildId}/status-roles`, {
    method: 'PATCH', headers: expired.headers, body: JSON.stringify(expired.config),
  });
  expect(expiryResponse.status).toBe(401);
  expect(committed).not.toHaveBeenCalled();
});

it('returns service validation errors and rejects unsupported status-role operations', async () => {
  const f = await fixture();
  const url = `${f.base}/api/guilds/${guildId}/status-roles`;
  f.statusRoles.updateConfig.mockRejectedValueOnce(new Error('Choose a role belonging to this server.'));
  const request = { method: 'PATCH', headers: f.headers, body: JSON.stringify(f.config) };
  const response = await fetch(url, request);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: 'Choose a role belonging to this server.', i18n: { key: 'Choose a role belonging to this server.', params: {} } });
  expect((await fetch(url, { ...request, method: 'POST' })).status).toBe(405);
  expect((await fetch(`${url}/foreign-role`, request)).status).toBe(405);
  expect((await fetch(`${url}/foreign-role`, { headers: f.headers })).status).toBe(405);
  expect(f.statusRoles.updateConfig).toHaveBeenCalledOnce();
});

it('serializes status-role and access saves so simultaneous requests cannot grant access to a new reward role', async () => {
  const f = await fixture();
  let saved = { ...f.config, roleId: '523456789012345678' };
  f.statusRoles.getConfig.mockImplementation(() => saved);
  f.statusRoles.automaticRoleIds.mockImplementation(() => [saved.roleId]);
  let entered!: () => void, release!: () => void, accessEntered!: () => void;
  const saving = new Promise<void>(resolve => { entered = resolve; });
  const hold = new Promise<void>(resolve => { release = resolve; });
  const accessRequestStarted = new Promise<void>(resolve => { accessEntered = resolve; });
  let checks = 0;
  f.access.dashboard.mockImplementation(async () => { if (++checks === 2) accessEntered(); });
  f.statusRoles.updateConfig.mockImplementation(async (_id, input, authorize) => {
    entered();
    await hold;
    await authorize?.();
    saved = input as typeof saved;
    return input;
  });
  const statusSave = fetch(`${f.base}/api/guilds/${guildId}/status-roles`, {
    method: 'PATCH', headers: f.headers, body: JSON.stringify(f.config),
  });
  await saving;
  const accessSave = fetch(`${f.base}/api/guilds/${guildId}/access`, {
    method: 'PATCH', headers: f.headers,
    body: JSON.stringify({ managerAccess: true, dashboardRoleIds: [roleId], commandRoles: {} }),
  });
  await accessRequestStarted;
  await new Promise(resolve => setTimeout(resolve, 20));
  const writesWhileStatusSavePending = f.access.update.mock.calls.length;
  release();
  const [statusResponse, accessResponse] = await Promise.all([statusSave, accessSave]);
  expect(statusResponse.status).toBe(200);
  expect(writesWhileStatusSavePending).toBe(0);
  expect(accessResponse.status).toBe(400);
  expect(f.access.update).not.toHaveBeenCalled();
  // Rejected queued writes release the server queue for later unrelated grants.
  const recovery = await fetch(`${f.base}/api/guilds/${guildId}/access`, {
    method: 'PATCH', headers: f.headers,
    body: JSON.stringify({ managerAccess: true, dashboardRoleIds: ['623456789012345678'], commandRoles: {} }),
  });
  expect(recovery.status).toBe(200);
  expect(f.access.update).toHaveBeenCalledOnce();
});

it('keeps role configuration queues separate by server and rechecks ownership after waiting', async () => {
  const f = await fixture();
  let entered!: () => void, release!: () => void, accessEntered!: () => void;
  const saving = new Promise<void>(resolve => { entered = resolve; });
  const hold = new Promise<void>(resolve => { release = resolve; });
  const accessRequestStarted = new Promise<void>(resolve => { accessEntered = resolve; });
  let checks = 0;
  f.access.dashboard.mockImplementation(async () => { if (++checks === 2) accessEntered(); });
  f.statusRoles.updateConfig.mockImplementation(async (_id, input, authorize) => {
    entered(); await hold; await authorize?.(); return input;
  });
  const statusSave = fetch(`${f.base}/api/guilds/${guildId}/status-roles`, {
    method: 'PATCH', headers: f.headers, body: JSON.stringify(f.config),
  });
  await saving;
  const request = { method: 'PATCH', headers: f.headers,
    body: JSON.stringify({ managerAccess: true, dashboardRoleIds: ['623456789012345678'], commandRoles: {} }) };
  const accessSave = fetch(`${f.base}/api/guilds/${guildId}/access`, request);
  await accessRequestStarted;
  const otherSave = await fetch(`${f.base}/api/guilds/${otherGuildId}/access`, request);
  f.guild.ownerId = '723456789012345678';
  release();
  const [statusResponse, accessResponse] = await Promise.all([statusSave, accessSave]);
  expect(otherSave.status).toBe(200);
  expect(statusResponse.status).toBe(200);
  expect(accessResponse.status).toBe(403);
  expect(f.access.update).toHaveBeenCalledExactlyOnceWith(f.otherGuild, userId, JSON.parse(request.body));
});

it('blocks access grants for old reward roles until their queued assignments are removed', async () => {
  const f = await fixture();
  const nextRole = '523456789012345678';
  // Changing/clearing the current role does not instantly remove previously assigned rewards.
  f.statusRoles.getConfig.mockReturnValue({ ...f.config, enabled: false, roleId: nextRole });
  f.statusRoles.automaticRoleIds.mockReturnValue([roleId, nextRole]);
  const request = { method: 'PATCH', headers: f.headers,
    body: JSON.stringify({ managerAccess: true, dashboardRoleIds: [roleId], commandRoles: {} }) };
  const url = `${f.base}/api/guilds/${guildId}/access`;
  const response = await fetch(url, request);
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ error: expect.stringContaining('automatic assignment') });
  expect(f.access.update).not.toHaveBeenCalled();
  // Cleanup removes the receipt only after Discord confirms removal.
  f.statusRoles.automaticRoleIds.mockReturnValue([nextRole]);
  expect((await fetch(url, request)).status).toBe(200);
  expect(f.statusRoles.automaticRoleIds).toHaveBeenLastCalledWith(guildId);
  expect(f.access.update).toHaveBeenCalledOnce();
});
