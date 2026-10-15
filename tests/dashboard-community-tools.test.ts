import { afterEach, expect, it, vi } from 'vitest';
import type { Client, Guild } from 'discord.js';
import type { AccessService } from '../src/control/access.js';
import { DashboardServer } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';
const origin = 'https://cyro.example', guildId = '123456789012345678', otherGuildId = '223456789012345678', userId = '323456789012345678', reportId = '423456789012345678';
const running: DashboardServer[] = [];
afterEach(async () => { await Promise.all(running.splice(0).map(server => server.stop())); });
async function fixture() {
  const sessions = new SessionStore(), sid = sessions.create({ id: userId, username: 'staff', avatar: null }, 'unused-access', 3600);
  let allowed = true, operational = true;
  const guild = { id: guildId, name: 'First', ownerId: 'owner', icon: null, memberCount: 2, members: { cache: new Map() }, channels: { fetch: async () => new Map() }, roles: { cache: new Map() } }, otherGuild = { ...guild, id: otherGuildId, name: 'Second' };
  const guilds = new Map([[guildId, guild], [otherGuildId, otherGuild]]);
  const access = { dashboard: vi.fn(async () => { if (!allowed) throw new Error('Access revoked.'); }), config: () => ({ managerAccess: true, dashboardRoleIds: [], commandRoles: {} }) };
  const feature = () => ({
    getConfig: vi.fn(() => ({ enabled: false })),
    snapshot: vi.fn((id: string, page = 1) => ({ config: { enabled: false }, reports: [{ id: `${id}-report`, title: 'Private report content' }], page, totalPages: 2 })),
    updateConfig: vi.fn(async (_guild: Guild, input: unknown, authorize?: () => Promise<void>) => { await authorize?.(); return input; }),
  });
  const tempVoice = feature(), communityTools = { ...feature(), decide: vi.fn(async (_guild: Guild, _actor: string, id: string, input: unknown, _source?: unknown, authorize?: () => Promise<void>) => { await authorize?.(); return { id, ...(input as object) }; }) };
  const module = { getConfig: async () => ({}), snapshot: async () => ({}), updateConfig: async () => ({}) };
  const server = new DashboardServer({ client: { isReady: () => true, guilds: { cache: guilds } } as unknown as Client, config: { discordClientId: '1', discordToken: '', dataDir: '.', logLevel: 'error', autoDeployCommands: false, pollIntervalSeconds: 60, dashboardUrl: origin }, logger: new Logger('error'), community: module, moderation: module, sessions, streams: { list: async () => [] } as never, access: access as unknown as AccessService, tempVoice, communityTools, publicDir: 'public', isOperational: () => operational });
  running.push(server); const port = await server.start(0, '127.0.0.1'); const headers = { Cookie: `dashboard_session=${sid}`, Origin: origin, 'X-CSRF-Token': sessions.peek(sid)!.csrfToken, 'Content-Type': 'application/json' };
  return { base: `http://127.0.0.1:${port}`, headers, guild, otherGuild, guilds, tempVoice, communityTools, access, sessions, sid, revoke: () => { allowed = false; }, reconnect: () => { operational = false; } };
}
it('scopes both new feature snapshots to the authorized selected server and denies public reads', async () => {
  const f = await fixture();
  for (const section of ['temp-voice', 'community-tools']) {
    for (const id of [guildId, otherGuildId]) { const r = await fetch(`${f.base}/api/guilds/${id}/${section}`, { headers: f.headers }); expect(r.status).toBe(200); expect(await r.json()).toMatchObject({ reports: [{ id: `${id}-report` }] }); }
    expect((await fetch(`${f.base}/api/guilds/${guildId}/${section}`)).status).toBe(401);
  }
  f.revoke(); expect((await fetch(`${f.base}/api/guilds/${guildId}/community-tools`, { headers: f.headers })).status).toBe(403);
  expect((await fetch(`${f.base}/api/guilds/999999999999999999/community-tools`, { headers: f.headers })).status).toBe(404);
  expect(f.communityTools.snapshot).toHaveBeenCalledTimes(2); expect(f.tempVoice.snapshot).toHaveBeenCalledTimes(2);
});
it('requires valid session, origin, and CSRF before either configuration write or report status action', async () => {
  const f = await fixture();
  for (const [section, method] of [['temp-voice', 'PATCH'], ['community-tools', 'PATCH'], [`bug-reports/${reportId}/status`, 'POST']]) {
    const url = `${f.base}/api/guilds/${guildId}/${section}`, request = { method, headers: f.headers, body: JSON.stringify({ status: 'resolved' }) };
    expect((await fetch(url, { ...request, headers: { 'Content-Type': 'application/json' } })).status).toBe(401);
    expect((await fetch(url, { ...request, headers: { ...f.headers, Origin: 'https://untrusted.example' } })).status).toBe(403);
    expect((await fetch(url, { ...request, headers: { ...f.headers, 'X-CSRF-Token': '' } })).status).toBe(403);
  }
  expect(f.tempVoice.updateConfig).not.toHaveBeenCalled(); expect(f.communityTools.updateConfig).not.toHaveBeenCalled(); expect(f.communityTools.decide).not.toHaveBeenCalled();
});
it('passes the authenticated guild, actor, and fresh authorization callback to each mutation', async () => {
  const f = await fixture(), input = { enabled: true };
  for (const [section, feature] of [['temp-voice', f.tempVoice], ['community-tools', f.communityTools]] as const) {
    const response = await fetch(`${f.base}/api/guilds/${otherGuildId}/${section}`, { method: 'PATCH', headers: f.headers, body: JSON.stringify(input) }); expect(response.status).toBe(200); expect(await response.json()).toEqual({ config: input }); expect(feature.updateConfig).toHaveBeenCalledExactlyOnceWith(f.otherGuild, input, expect.any(Function));
  }
  const response = await fetch(`${f.base}/api/guilds/${otherGuildId}/bug-reports/${reportId}/status`, { method: 'POST', headers: f.headers, body: JSON.stringify({ status: 'resolved' }) });
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ report: { id: reportId, status: 'resolved' } }); expect(f.communityTools.decide).toHaveBeenCalledExactlyOnceWith(f.otherGuild, userId, reportId, { status: 'resolved' }, undefined, expect.any(Function));
});
it('rejects queued settings after permissions are revoked and queued decisions after logout', async () => {
  const f = await fixture(), committed = vi.fn();
  f.tempVoice.updateConfig.mockImplementation(async (_guild, input, authorize) => { f.revoke(); await authorize?.(); committed(); return input; });
  expect((await fetch(`${f.base}/api/guilds/${guildId}/temp-voice`, { method: 'PATCH', headers: f.headers, body: '{}' })).status).toBe(403); expect(committed).not.toHaveBeenCalled();
  const g = await fixture(); g.communityTools.decide.mockImplementation(async (_guild, _actor, id, input, _source, authorize) => { g.sessions.delete(g.sid); await authorize?.(); committed(); return { id, ...(input as object) }; });
  expect((await fetch(`${g.base}/api/guilds/${guildId}/bug-reports/${reportId}/status`, { method: 'POST', headers: g.headers, body: '{"status":"resolved"}' })).status).toBe(401); expect(committed).not.toHaveBeenCalled();
});
it('rejects queued mutations if the gateway reconnects or the bot leaves the guild', async () => {
  for (const condition of ['reconnect', 'removed']) { const f = await fixture(), committed = vi.fn(); f.communityTools.updateConfig.mockImplementation(async (_guild, input, authorize) => { if (condition === 'reconnect') f.reconnect(); else f.guilds.delete(guildId); await authorize?.(); committed(); return input; }); const response = await fetch(`${f.base}/api/guilds/${guildId}/community-tools`, { method: 'PATCH', headers: f.headers, body: '{}' }); expect(response.status).toBe(condition === 'reconnect' ? 503 : 404); expect(committed).not.toHaveBeenCalled(); }
});
it('validates paging and rejects unsupported mutation routes and methods', async () => {
  const f = await fixture(); const response = await fetch(`${f.base}/api/guilds/${guildId}/community-tools?page=2`, { headers: f.headers }); expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ page: 2 }); expect(f.communityTools.snapshot).toHaveBeenCalledExactlyOnceWith(guildId, 2);
  for (const page of ['', '0', '-1', '1.5', '1e2', 'NaN', '100001']) expect((await fetch(`${f.base}/api/guilds/${guildId}/community-tools?page=${encodeURIComponent(page)}`, { headers: f.headers })).status).toBe(400);
  expect((await fetch(`${f.base}/api/guilds/${guildId}/bug-reports/${reportId}`, { method: 'POST', headers: f.headers, body: '{}' })).status).toBe(405);
  expect((await fetch(`${f.base}/api/guilds/${guildId}/bug-reports/${reportId}/status`, { method: 'PATCH', headers: f.headers, body: '{}' })).status).toBe(405);
  expect((await fetch(`${f.base}/api/guilds/${guildId}/community-tools/${reportId}/status`, { method: 'POST', headers: f.headers, body: '{}' })).status).toBe(404); expect(f.communityTools.decide).not.toHaveBeenCalled();
});
it('keeps reports behind dashboard authorization and never includes them in public stats', async () => {
  const f = await fixture(); const response = await fetch(`${f.base}/api/guilds/${guildId}`, { headers: f.headers }); expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ guild: { id: guildId }, communityTools: { reports: [{ id: `${guildId}-report` }] } });
  const stats = await fetch(`${f.base}/api/public/stats`); expect(stats.status).toBe(200); const publicText = await stats.text(); expect(publicText).not.toContain('Private report'); expect(publicText).not.toContain('reports');
  expect((await fetch(`${f.base}/api/guilds/${guildId}`)).status).toBe(401);
});
it('returns service validation errors without accepting cross-guild report IDs', async () => {
  const f = await fixture(); f.communityTools.decide.mockRejectedValueOnce(new Error('That report does not belong to this server or message.'));
  const response = await fetch(`${f.base}/api/guilds/${guildId}/bug-reports/${reportId}/status`, { method: 'POST', headers: f.headers, body: '{"status":"resolved"}' }); expect(response.status).toBe(400); expect(await response.json()).toEqual({ error: 'That report does not belong to this server or message.', i18n: { key: 'That report does not belong to this server or message.', params: {} } });
});
