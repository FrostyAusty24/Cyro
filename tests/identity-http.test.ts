import { afterEach, expect, it, vi } from 'vitest';
import { Collection, PermissionsBitField, PermissionFlagsBits, type Client } from 'discord.js';
import { DashboardServer } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';
import { createCanvas } from '@napi-rs/canvas';

const running: DashboardServer[] = [];
afterEach(async () => { await Promise.all(running.splice(0).map(server => server.stop())); });
const guildId = '123456789012345678';
async function setup() {
  const sessions = new SessionStore(); const sessionId = sessions.create({ id: 'delegate', username: 'tester', avatar: null }, 'private', 3600);
  const user = { id: 'bot', displayName: 'Cyro', displayAvatarURL: () => 'https://cdn.discordapp.com/default.png' };
  const guild: any = { id: guildId, client: { user }, members: {} };
  const member: any = { id: 'bot', guild, user, nickname: null, avatar: null, displayName: 'Cyro', displayAvatarURL: user.displayAvatarURL, permissions: new PermissionsBitField([PermissionFlagsBits.ChangeNickname]) };
  guild.members.fetchMe = vi.fn(async () => member);
  guild.members.editMe = vi.fn(async (patch: any) => { member.nickname = patch.nick; member.displayName = patch.nick || 'Cyro'; return member; });
  let allowed = true, ready = true;
  const access = { dashboard: vi.fn(async () => { if (!allowed) throw new Error('Revoked'); return {}; }) };
  const module = { getConfig: async () => ({}), snapshot: async () => ({}), updateConfig: vi.fn(async () => ({})) };
  const server = new DashboardServer({ client: { isReady: () => ready, guilds: { cache: new Collection([[guildId, guild]]) } } as unknown as Client, access: access as never, sessions,
    config: { discordClientId: '1', discordToken: '', dataDir: '.', logLevel: 'error', autoDeployCommands: false, pollIntervalSeconds: 60, dashboardUrl: 'http://localhost:3000' },
    logger: new Logger('error'), community: module, moderation: module, streams: {} as never, publicDir: 'public' });
  running.push(server); const port = await server.start(0, '127.0.0.1');
  const base = `http://127.0.0.1:${port}`; const route = `${base}/api/guilds/${guildId}/identity`;
  const headers = { Cookie: `dashboard_session=${sessionId}`, Origin: 'http://localhost:3000', 'X-CSRF-Token': sessions.get(sessionId)!.csrfToken, 'Content-Type': 'application/json' };
  return { base, route, headers, guild, member, access, module, sessions, sessionId, revoke: () => { allowed = false; }, unready: () => { ready = false; } };
}

it('reads and edits a delegated server profile while rejecting anonymous, CSRF, revoked and foreign-guild access', async () => {
  const f = await setup();
  expect((await fetch(f.route)).status).toBe(401);
  let response = await fetch(f.route, { headers: f.headers }); expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ nickname: null, defaultName: 'Cyro' });
  response = await fetch(f.route, { method: 'PATCH', headers: f.headers, body: JSON.stringify({ nickname: 'Server helper' }) });
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ nickname: 'Server helper' });
  expect(f.access.dashboard).toHaveBeenCalledTimes(3); // GET + PATCH entry + immediately before editing.
  expect((await fetch(f.route, { method: 'PATCH', headers: { ...f.headers, Origin: 'https://evil.invalid' }, body: '{}' })).status).toBe(403);
  expect((await fetch(f.route, { method: 'PATCH', headers: { ...f.headers, 'X-CSRF-Token': 'wrong' }, body: '{}' })).status).toBe(403);
  expect((await fetch(`${f.base}/api/guilds/999999999999999999/identity`, { method: 'PATCH', headers: f.headers, body: '{}' })).status).toBe(404);
  f.revoke(); expect((await fetch(f.route, { headers: f.headers })).status).toBe(403);
  expect((await fetch(f.route, { method: 'PATCH', headers: f.headers, body: '{"nickname":"Revoked"}' })).status).toBe(403);
  expect(f.guild.members.editMe).toHaveBeenCalledOnce();
});

it('permits bounded picture uploads only on identity PATCH and retains the smaller request limit for settings', async () => {
  const f = await setup(); const canvas = createCanvas(300, 300); const ctx = canvas.getContext('2d'); const data = ctx.createImageData(300, 300);
  let seed = 21; for (let i = 0; i < data.data.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; data.data[i] = (i % 4 === 3) ? 255 : seed >>> 24; }
  ctx.putImageData(data, 0, 0); const avatar = `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`;
  expect(avatar.length).toBeGreaterThan(131_072);
  expect((await fetch(f.route, { method: 'PATCH', headers: f.headers, body: JSON.stringify({ avatar }) })).status).toBe(200);
  expect((await fetch(f.route, { method: 'PATCH', headers: f.headers, body: JSON.stringify({ avatar: 'a'.repeat(3 * 1024 * 1024) }) })).status).toBe(413);
  expect((await fetch(`${f.base}/api/guilds/${guildId}/community`, { method: 'PATCH', headers: f.headers, body: JSON.stringify({ text: 'a'.repeat(140_000) }) })).status).toBe(413);
  expect(f.guild.members.editMe).toHaveBeenCalledOnce(); expect(f.module.updateConfig).not.toHaveBeenCalled();
});

it('rechecks session, readiness and delegation after Discord loads the profile, before any change', async () => {
  for (const state of ['revoked', 'expired', 'unready'] as const) {
    const f = await setup();
    f.guild.members.fetchMe.mockImplementation(async () => { if (state === 'revoked') f.revoke(); else if (state === 'expired') f.sessions.delete(f.sessionId); else f.unready(); return f.member; });
    const result = await fetch(f.route, { method: 'PATCH', headers: f.headers, body: '{"nickname":"Delayed"}' });
    expect(result.status).toBe(state === 'revoked' ? 403 : state === 'expired' ? 401 : 503);
    expect(f.guild.members.editMe).not.toHaveBeenCalled();
  }
});
