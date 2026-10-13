import { afterEach, expect, it, vi } from 'vitest';
import { createOAuthApi } from '../src/dashboard/discord-api.js';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('honors fractional Retry-After for a safe Discord GET before retrying', async () => {
  let now = 0;
  const transport = vi.fn().mockResolvedValueOnce(new Response('{"retry_after":0.25}', { status: 429, headers: { 'Retry-After': '0.5' } })).mockResolvedValueOnce(Response.json({ id: '1', username: 'tester', avatar: null }));
  vi.stubGlobal('fetch', transport);
  const sleep = vi.fn(async (ms: number) => { now += ms; });
  const api = createOAuthApi('id', 'secret', 'https://example.test/auth/callback', { fetch: transport, now: () => now, sleep });
  await expect(api.user('fake-token')).resolves.toMatchObject({ username: 'tester' });
  expect(sleep).toHaveBeenCalledWith(500, expect.any(AbortSignal));
  expect(transport).toHaveBeenCalledTimes(2);
});

it('shares one deadline across every page and retry in a guild listing', async () => {
  let now = 0;
  const fullPage = Array.from({ length: 200 }, (_, index) => ({ id: String(index + 1) }));
  const transport = vi.fn(async () => { now += 8000; return Response.json(fullPage); });
  vi.stubGlobal('fetch', transport);
  const api = createOAuthApi('id', 'secret', 'https://example.test/auth/callback', { fetch: transport, now: () => now });
  await expect(api.guilds('fake-token')).rejects.toThrow('deadline');
  expect(transport).toHaveBeenCalledTimes(2);
});

it('uses body retry_after and stops after three safe GET attempts', async () => {
  let now=0;
  const transport=vi.fn(async()=>Response.json({retry_after:0.25},{status:429}));
  const sleep=vi.fn(async(ms:number)=>{now+=ms;});
  const api=createOAuthApi('id','secret','https://example.test/auth/callback',{fetch:transport,now:()=>now,sleep});
  await expect(api.user('fake')).rejects.toThrow('429');
  expect(transport).toHaveBeenCalledTimes(3);expect(sleep).toHaveBeenCalledTimes(2);expect(now).toBe(500);
});

it('never replays a one-use OAuth exchange or revocation after a 429', async () => {
  const transport=vi.fn(async()=>Response.json({retry_after:0.001},{status:429}));const sleep=vi.fn();
  const api=createOAuthApi('id','secret','https://example.test/auth/callback',{fetch:transport,sleep});
  await expect(api.exchange('fake-code')).rejects.toThrow('429');expect(transport).toHaveBeenCalledTimes(1);
  await expect(api.revoke('fake-token')).rejects.toThrow('429');expect(transport).toHaveBeenCalledTimes(2);expect(sleep).not.toHaveBeenCalled();
});

it('does not retry early when Discord asks for a wait beyond the total deadline', async () => {
  const transport=vi.fn(async()=>Response.json({retry_after:20},{status:429}));const sleep=vi.fn();
  const api=createOAuthApi('id','secret','https://example.test/auth/callback',{fetch:transport,sleep});
  await expect(api.user('fake')).rejects.toThrow('429');expect(transport).toHaveBeenCalledOnce();expect(sleep).not.toHaveBeenCalled();
});
