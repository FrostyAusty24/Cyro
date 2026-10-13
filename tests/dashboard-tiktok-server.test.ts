import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Client } from 'discord.js';
import { DashboardServer } from '../src/dashboard/server.js';
import { TikTokCancellation, TikTokDashboardError, type DashboardTikTok } from '../src/dashboard/tiktok.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';

const origin = 'https://cyro.example';
const userId = '323456789012345678';
const selection = { guildId: '123456789012345678', recordId: 'creator-tiktok' };
const running: DashboardServer[] = [];
afterEach(async () => { await Promise.all(running.splice(0).map(server => server.stop())); });

async function fixture(options: { requestTimeoutMs?: number } = {}) {
  const sessions = new SessionStore();
  const sid = sessions.create({ id: userId, username: 'creator', avatar: null }, 'discord-access', 3600);
  const tiktok = {
    records: vi.fn(async () => ({ configured: true, records: [selection] })),
    connections: vi.fn(async () => ({ configured: true, connections: [] })),
    videos: vi.fn(async () => ({ videos: [] })),
    begin: vi.fn(async () => ({ url: 'https://www.tiktok.com/v2/auth/authorize/?state=opaque' })),
    disconnect: vi.fn(async () => ({ revoked: true, remainingConnections: false })),
    callback: vi.fn(async (_state: string, _code: string | null, _userId: string, _sid: string, assertActive: () => void) => { assertActive(); return '/connections?tiktok=connected'; }),
  };
  const oauth = { exchange: vi.fn(async () => ({ access_token: 'discord-access', expires_in: 3600 })), user: vi.fn(async () => ({ id: userId, username: 'creator', avatar: null })), guilds: vi.fn(async () => []), revoke: vi.fn(async () => {}) };
  const module = { getConfig: async () => ({}), updateConfig: async () => ({}), snapshot: async () => ({}) };
  let operational = true;
  const server = new DashboardServer({ client: { isReady: () => true, guilds: { cache: new Map() } } as unknown as Client,
    config: { discordClientId: '1', discordToken: '', discordClientSecret: 'test-client-secret', dataDir: '.', logLevel: 'error', autoDeployCommands: false, pollIntervalSeconds: 60, dashboardUrl: origin },
    logger: new Logger('error'), community: module, moderation: module, streams: {} as never, publicDir: 'public', sessions, oauth,
    tiktok: tiktok as unknown as DashboardTikTok, isOperational: () => operational, ...options });
  running.push(server); const port = await server.start(0, '127.0.0.1');
  const base = `http://127.0.0.1:${port}`;
  const headers = { Cookie: `dashboard_session=${sid}`, Origin: origin, 'X-CSRF-Token': sessions.peek(sid)!.csrfToken, 'Content-Type': 'application/json' };
  return { sessions, sid, tiktok, oauth, base, headers, offline: () => { operational = false; } };
}

describe('TikTok HTTP boundaries', () => {
  it('requires Discord session and same-origin CSRF protection for both connection mutations', async () => {
    const f = await fixture();
    for (const endpoint of ['connect', 'disconnect']) {
      const url = `${f.base}/api/tiktok/${endpoint}`; const body = JSON.stringify(selection);
      expect((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })).status).toBe(401);
      expect((await fetch(url, { method: 'POST', headers: { ...f.headers, 'X-CSRF-Token': 'forged' }, body })).status).toBe(403);
      expect((await fetch(url, { method: 'POST', headers: { ...f.headers, Origin: 'https://untrusted.example' }, body })).status).toBe(403);
    }
    expect(f.tiktok.begin).not.toHaveBeenCalled(); expect(f.tiktok.disconnect).not.toHaveBeenCalled();
    expect((await fetch(`${f.base}/api/tiktok/connect`, { method: 'POST', headers: f.headers, body: JSON.stringify(selection) })).status).toBe(200);
    expect(f.tiktok.begin).toHaveBeenCalledExactlyOnceWith(selection, userId, f.sid);
    expect((await fetch(`${f.base}/api/tiktok/disconnect`, { method: 'POST', headers: f.headers, body: JSON.stringify(selection) })).status).toBe(200);
    expect(f.tiktok.disconnect).toHaveBeenCalledExactlyOnceWith(selection, userId);
  });

  it('requires session for creator reads and supplies the signed-in Discord identity without manager permission', async () => {
    const f = await fixture();
    for (const endpoint of ['records', 'connections', 'videos']) expect((await fetch(`${f.base}/api/tiktok/${endpoint}`)).status).toBe(401);
    expect((await fetch(`${f.base}/api/tiktok/records?guildId=${selection.guildId}`, { headers: f.headers })).status).toBe(200);
    expect(f.tiktok.records).toHaveBeenCalledExactlyOnceWith(userId, selection.guildId);
    expect((await fetch(`${f.base}/api/tiktok/connections`, { headers: f.headers })).status).toBe(200);
    expect(f.tiktok.connections).toHaveBeenCalledExactlyOnceWith(userId);
    expect((await fetch(`${f.base}/api/tiktok/videos?${new URLSearchParams(selection)}`, { headers: f.headers })).status).toBe(200);
    expect(f.tiktok.videos).toHaveBeenCalledExactlyOnceWith(selection, userId);
  });

  it('will not begin connections while the bot is unavailable', async () => {
    const f = await fixture(); f.offline();
    expect((await fetch(`${f.base}/api/tiktok/connect`, { method: 'POST', headers: f.headers, body: JSON.stringify(selection) })).status).toBe(503);
    expect(f.tiktok.begin).not.toHaveBeenCalled();
  });

  it('requires the original Discord browser session on the callback and passes cancellation without a code', async () => {
    const f = await fixture();
    const anonymous = await fetch(`${f.base}/auth/tiktok/callback?state=opaque&code=code`, { redirect: 'manual' });
    expect(anonymous.status).toBe(302); expect(anonymous.headers.get('location')).toBe('/connections?tiktok=session-expired');
    expect(f.tiktok.callback).not.toHaveBeenCalled();
    const denied = await fetch(`${f.base}/auth/tiktok/callback?state=opaque&code=ignored&error=access_denied`, { headers: f.headers, redirect: 'manual' });
    expect(denied.status).toBe(302);
    expect(f.tiktok.callback).toHaveBeenCalledExactlyOnceWith('opaque', null, userId, f.sid, expect.any(Function));
  });

  it('shows cancellation only for a state-validated cancellation, while invalid-session callbacks remain failures', async () => {
    const f = await fixture();
    f.tiktok.callback.mockRejectedValueOnce(new TikTokCancellation());
    const cancelled = await fetch(`${f.base}/auth/tiktok/callback?state=valid-state&error=access_denied`, { headers: f.headers, redirect: 'manual' });
    expect(cancelled.status).toBe(302); expect(cancelled.headers.get('location')).toBe('/connections?tiktok=cancelled');
    f.tiktok.callback.mockRejectedValueOnce(new TikTokDashboardError(400, 'TikTok connection did not match this browser.'));
    const invalidSession = await fetch(`${f.base}/auth/tiktok/callback?state=foreign-session-state&error=access_denied`, { headers: f.headers, redirect: 'manual' });
    expect(invalidSession.status).toBe(302); expect(invalidSession.headers.get('location')).toBe('/connections?tiktok=connection-failed');
  });

  it('prevents provider commit after Discord logout during callback processing', async () => {
    const f = await fixture(); const committed = vi.fn();
    f.tiktok.callback.mockImplementation(async (_state, _code, _userId, _sid, assertActive) => {
      assertActive(); f.sessions.delete(f.sid); assertActive(); committed(); return '/connections?tiktok=connected';
    });
    const response = await fetch(`${f.base}/auth/tiktok/callback?state=opaque&code=code`, { headers: f.headers, redirect: 'manual' });
    expect(response.status).toBe(302); expect(response.headers.get('location')).toBe('/connections?tiktok=connection-failed');
    expect(committed).not.toHaveBeenCalled();
  });

  it('prevents provider commit after the request timeout ends the response', async () => {
    const f = await fixture({ requestTimeoutMs: 30 }); const committed = vi.fn(); let finish!: () => void;
    const providerFinished = new Promise<void>(resolve => { finish = resolve; });
    f.tiktok.callback.mockImplementation(async (_state, _code, _userId, _sid, assertActive) => {
      try { assertActive(); await new Promise(resolve => setTimeout(resolve, 70)); assertActive(); committed(); return '/connections?tiktok=connected'; }
      finally { finish(); }
    });
    const response = await fetch(`${f.base}/auth/tiktok/callback?state=opaque&code=code`, { headers: f.headers, redirect: 'manual' });
    expect(response.status).toBe(503); await providerFinished;
    expect(committed).not.toHaveBeenCalled();
  });

  it('does not expose provider error details or token material in API responses or callback URLs', async () => {
    const f = await fixture(); const sensitive = 'private-access-token';
    f.tiktok.begin.mockRejectedValue(new Error(`Provider rejected ${sensitive}`));
    const api = await fetch(`${f.base}/api/tiktok/connect`, { method: 'POST', headers: f.headers, body: JSON.stringify(selection) });
    expect(api.status).toBe(400); expect(await api.text()).not.toContain(sensitive);
    f.tiktok.callback.mockRejectedValue(new Error(`Provider rejected ${sensitive}`));
    const callback = await fetch(`${f.base}/auth/tiktok/callback?state=opaque&code=code`, { headers: f.headers, redirect: 'manual' });
    expect(callback.headers.get('location')).toBe('/connections?tiktok=connection-failed');
    expect(await callback.text()).not.toContain(sensitive);
  });

  it('serves policy, terms, and creator portal without sign-in while keeping private files unavailable', async () => {
    const f = await fixture();
    for (const pathname of ['/privacy', '/terms', '/connections']) {
      const response = await fetch(`${f.base}${pathname}`);
      expect(response.status).toBe(200); expect(response.headers.get('content-type')).toContain('text/html');
      const html = await response.text(); expect(html.toLowerCase()).toContain('<!doctype html>');
      for (const asset of html.matchAll(/(?:href|src)="(\/(?:[\w.-]+\.(?:css|js)))"/g)) expect((await fetch(`${f.base}${asset[1]}`)).status).toBe(200);
    }
    expect((await fetch(`${f.base}/privacy`, { method: 'HEAD' })).status).toBe(200);
    for (const pathname of ['/data/tiktok-connections.json', '/tiktok-connections.json', '/.env', '/src/tiktok/service.ts']) expect((await fetch(`${f.base}${pathname}`)).status).toBe(404);
  });
});

describe('Discord sign-in return destination', () => {
  it.each([
    ['/connections?guild=123456789012345678&record=creator-tiktok', '/connections?guild=123456789012345678&record=creator-tiktok'],
    [`${origin}/connections?guild=123456789012345678&record=creator-tiktok&next=https://evil.example`, '/connections?guild=123456789012345678&record=creator-tiktok'],
    ['/connections?guild=bad&record=../other#injected', '/connections'],
    ['https://evil.example/connections', '/'],
    ['//evil.example/connections', '/'],
    ['/auth/logout', '/'],
    ['/connections.evil', '/'],
  ])('redirects %s only to the allowlisted local destination', async (requested, expected) => {
    const f = await fixture();
    const begin = await fetch(`${f.base}/auth/login?${new URLSearchParams({ returnTo: requested })}`, { redirect: 'manual' });
    expect(begin.status).toBe(302);
    const state = new URL(begin.headers.get('location')!).searchParams.get('state')!;
    const callback = await fetch(`${f.base}/auth/callback?${new URLSearchParams({ code: 'discord-code', state })}`, { headers: { Cookie: `dashboard_oauth=${state}` }, redirect: 'manual' });
    expect(callback.status).toBe(302); expect(callback.headers.get('location')).toBe(expected);
    const cookies = callback.headers.getSetCookie().join(';'); expect(cookies).toContain('HttpOnly'); expect(cookies).toContain('SameSite=Lax'); expect(cookies).toContain('Secure');
    const replay = await fetch(`${f.base}/auth/callback?${new URLSearchParams({ code: 'discord-code', state })}`, { headers: { Cookie: `dashboard_oauth=${state}` }, redirect: 'manual' });
    expect(replay.status).toBe(400); expect(f.oauth.exchange).toHaveBeenCalledOnce();
  });
});
