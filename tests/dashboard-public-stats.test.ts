import { afterEach, expect, it, vi } from 'vitest';
import type { Client } from 'discord.js';
import { DashboardServer } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';

const running: DashboardServer[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(running.splice(0).map(server => server.stop()));
});

async function fixture() {
  const sessions = new SessionStore();
  const cache = new Map([
    ['123456789012345678', { id: '123456789012345678', name: 'Private server', memberCount: 400 }],
    ['223456789012345678', { id: '223456789012345678', name: 'Another private server', memberCount: 200 }],
  ]);
  let ready = true;
  let operational = true;
  const readGuildData = vi.fn(async () => ({}));
  const module = { getConfig: readGuildData, snapshot: readGuildData, updateConfig: readGuildData };
  const server = new DashboardServer({
    client: { isReady: () => ready, guilds: { cache } } as unknown as Client,
    isOperational: () => operational,
    config: { discordClientId: '123', discordToken: 'unused', dataDir: '.', logLevel: 'error', autoDeployCommands: false,
      pollIntervalSeconds: 60, dashboardUrl: 'https://cyro.example' },
    logger: new Logger('error'), community: module, moderation: module, sessions, streams: {} as never, publicDir: '.',
  });
  running.push(server);
  const port = await server.start(0, '127.0.0.1');
  return {
    base: `http://127.0.0.1:${port}`, cache, sessions, readGuildData,
    setReady: (value: boolean) => { ready = value; },
    setOperational: (value: boolean) => { operational = value; },
  };
}

it('publicly reports the current installed-server total without disclosing server records or member totals', async () => {
  const f = await fixture();
  const response = await fetch(`${f.base}/api/public/stats`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ serverCount: 2 });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(response.headers.get('Set-Cookie')).toBeNull();
  f.cache.delete('123456789012345678');
  expect(await (await fetch(`${f.base}/api/public/stats`)).json()).toEqual({ serverCount: 1 });
  f.cache.clear();
  expect(await (await fetch(`${f.base}/api/public/stats`)).json()).toEqual({ serverCount: 0 });
  expect(f.readGuildData).not.toHaveBeenCalled();
});

it('reports unavailable rather than a stale or zero count before reconciliation and during Gateway reconnects', async () => {
  const f = await fixture();
  f.setOperational(false);
  let response = await fetch(`${f.base}/api/public/stats`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ serverCount: null });
  f.setOperational(true);
  f.setReady(false);
  response = await fetch(`${f.base}/api/public/stats`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ serverCount: null });
  f.setReady(true);
  expect(await (await fetch(`${f.base}/api/public/stats`)).json()).toEqual({ serverCount: 2 });
});

it('keeps private API routes and mutations behind the existing authentication and CSRF checks', async () => {
  const f = await fixture();
  for (const route of ['/api/guilds', '/api/me', '/api/guilds/123456789012345678/community']) {
    expect((await fetch(`${f.base}${route}`)).status).toBe(401);
  }
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    expect((await fetch(`${f.base}/api/public/stats`, { method })).status).toBe(401);
  }
  const sid = f.sessions.create({ id: 'user', username: 'tester', avatar: null }, 'unused-token', 3600);
  expect((await fetch(`${f.base}/api/public/stats`, { method: 'POST', headers: { Cookie: `dashboard_session=${sid}` } })).status).toBe(403);
  expect(f.readGuildData).not.toHaveBeenCalled();
});

it('applies the existing public API rate limit to aggregate polling', async () => {
  const f = await fixture();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
  try {
    for (let request = 0; request < 300; request++) {
      const response = await fetch(`${f.base}/api/public/stats`);
      expect(response.status).toBe(200);
      await response.arrayBuffer();
    }
    const limited = await fetch(`${f.base}/api/public/stats`);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: 'Too many requests. Please wait before trying again.' });
  } finally { clock.mockRestore(); }
});

it('does not extend authenticated session inactivity when the public count is polled', async () => {
  const f = await fixture();
  const sid = f.sessions.create({ id: 'user', username: 'tester', avatar: null }, 'unused-token', 86400, 0);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(29 * 60_000);
  try {
    const response = await fetch(`${f.base}/api/public/stats`, { headers: { Cookie: `dashboard_session=${sid}` } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ serverCount: 2 });
    expect(f.sessions.get(sid, 31 * 60_000)).toBeUndefined();
  } finally { clock.mockRestore(); }
});
