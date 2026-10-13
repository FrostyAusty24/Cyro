import { afterEach, expect, it, vi } from 'vitest';
import type { Client } from 'discord.js';
import { DashboardServer } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';

const running: DashboardServer[] = [];
afterEach(async () => { await Promise.all(running.splice(0).map(server => server.stop())); });

it('authorizes panel publishing for the selected guild, requires CSRF, and checks revoked access', async () => {
  const guildId = '123456789012345678';
  const sessions = new SessionStore();
  const sid = sessions.create({ id: 'manager', username: 'manager', avatar: null }, 'unused', 3600);
  let allowed = true;
  const guild = { id: guildId, members: { fetch: async () => ({ permissions: { has: () => allowed } }) }, roles: { fetch: async () => undefined } };
  const publishPanel = vi.fn(async () => ({ messageId: '1', channelId: '2', url: 'https://discord.com/channels/1/2/3' }));
  const publishVerificationPanel = vi.fn(async () => ({ messageId: '4', channelId: '5', url: 'https://discord.com/channels/1/5/4' }));
  const module = { getConfig: async () => ({}), snapshot: async () => ({}), updateConfig: async () => ({}) };
  const server = new DashboardServer({ client: { isReady: () => true, guilds: { cache: new Map([[guildId, guild]]) } } as unknown as Client,
    config: { discordClientId: '1', discordToken: '', dataDir: '.', logLevel: 'error', autoDeployCommands: false, pollIntervalSeconds: 60, dashboardUrl: 'http://localhost:3000' },
    logger: new Logger('error'), community: { ...module, publishVerificationPanel }, moderation: { ...module, publishPanel }, sessions, streams: {} as never, publicDir: 'public' });
  running.push(server); const port = await server.start(0, '127.0.0.1');
  const base = `http://127.0.0.1:${port}/api/guilds/${guildId}`;
  const headers = { Cookie: `dashboard_session=${sid}`, Origin: 'http://localhost:3000', 'X-CSRF-Token': sessions.get(sid)!.csrfToken, 'Content-Type': 'application/json' };
  const input = { panelId: 'support', channelId: '123456789012345679' };
  expect((await fetch(`${base}/moderation/panel`, { method: 'POST', headers, body: JSON.stringify(input) })).status).toBe(201);
  expect(publishPanel).toHaveBeenCalledExactlyOnceWith(guildId, input);
  expect((await fetch(`${base}/community/verification-panel`, { method: 'POST', headers, body: '{}' })).status).toBe(201);
  expect(publishVerificationPanel).toHaveBeenCalledExactlyOnceWith(guildId);
  expect((await fetch(`${base}/community/verification-panel`, { method: 'POST', headers, body: '{"roleId":"forged"}' })).status).toBe(400);
  expect((await fetch(`${base}/moderation/panel`, { method: 'POST', headers: { ...headers, 'X-CSRF-Token': 'wrong' }, body: '{}' })).status).toBe(403);
  expect((await fetch(`${base.replace(guildId, '999999999999999999')}/moderation/panel`, { method: 'POST', headers, body: '{}' })).status).toBe(404);
  allowed = false;
  expect((await fetch(`${base}/moderation/panel`, { method: 'POST', headers, body: '{}' })).status).toBe(403);
  expect(publishPanel).toHaveBeenCalledOnce(); expect(publishVerificationPanel).toHaveBeenCalledOnce();
  expect((await fetch(`http://127.0.0.1:${port}/setup.js`)).status).toBe(200);
});
