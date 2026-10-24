import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { handleRequest } from './worker.mjs';

const primary = 'https://cyrobot.ca';
const backup = 'https://backup.cyrobot.ca:1029';
const documentHeaders = { Accept: 'text/html,application/xhtml+xml', 'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Mode': 'navigate' };
const navigation = (path = '/', init = {}) => new Request(`${primary}${path}`, { ...init, headers: { ...documentHeaders, ...init.headers } });
const ready = () => Response.json({ ready: true });
const failed = () => new Response('gateway failure', { status: 530 });
function runtime(responses, overrides = {}) {
  const calls = [];
  let passThrough = 0;
  return {
    calls,
    context: { passThroughOnException() { passThrough++; } },
    get passThrough() { return passThrough; },
    options: {
      fetchImpl: async request => {
        calls.push(request);
        const response = responses.shift();
        if (typeof response === 'function') return response(request);
        if (response instanceof Error) throw response;
        assert.ok(response instanceof Response, 'Unexpected additional upstream request');
        return response;
      },
      primaryTimeoutMs: 100,
      backupTimeoutMs: 100,
      ...overrides,
    },
  };
}
const run = (request, fixture) => handleRequest(request, fixture.context, fixture.options);

test('healthy responses preserve exact object, cookies, body, and manual redirect handling', async () => {
  const response = new Response('unchanged', { headers: { 'Set-Cookie': 'dashboard_session=fake; HttpOnly; Secure', 'X-Original': 'yes' } });
  const fixture = runtime([response]);
  const result = await run(navigation(), fixture);
  assert.equal(result, response);
  assert.equal(await result.text(), 'unchanged');
  assert.equal(result.headers.get('Set-Cookie'), 'dashboard_session=fake; HttpOnly; Secure');
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0].redirect, 'manual');
  assert.equal(fixture.passThrough, 1);
});

test('primary OAuth redirects are returned without following or replacing them', async () => {
  const response = new Response(null, { status: 302, headers: { Location: 'https://discord.com/oauth2/authorize?state=fake-state' } });
  const fixture = runtime([response]);
  assert.equal(await run(navigation('/auth/login'), fixture), response);
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.passThrough, 0);
});

test('401, 403, 404 and rate limits pass through without failover', async () => {
  for (const status of [400, 401, 403, 404, 429]) {
    const response = new Response('original', { status });
    const fixture = runtime([response]);
    assert.equal(await run(navigation(), fixture), response);
    assert.equal(fixture.calls.length, 1);
  }
});

test('safe 5xx document requests redirect only after a fresh ready backup probe', async () => {
  for (const status of [500, 502, 503, 504, 520, 522, 530, 599]) {
    const fixture = runtime([new Response('failed', { status }), ready()]);
    const result = await run(navigation('/?guild=123456789012345678#temp-voice'), fixture);
    assert.equal(result.status, 302);
    assert.equal(result.headers.get('Location'), `${backup}/?guild=123456789012345678#`);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    assert.equal(result.headers.get('Referrer-Policy'), 'no-referrer');
    assert.equal(fixture.calls.length, 2);
    assert.equal(fixture.calls[1].url, `${backup}/readyz`);
  }
});

test('primary transport failure probes once then redirects', async () => {
  const fixture = runtime([new Error('network failed'), ready()]);
  assert.equal((await run(navigation(), fixture)).status, 302);
  assert.equal(fixture.calls.length, 2);
});

test('a stalled primary error body cannot delay failover', async () => {
  const response = new Response(new ReadableStream({ cancel() { return new Promise(() => {}); } }), { status: 502 });
  const fixture = runtime([response, ready()]);
  assert.equal((await run(navigation(), fixture)).status, 302);
  assert.equal(fixture.calls.length, 2);
});

test('primary timeout aborts the one attempt and checks the backup', async () => {
  let primarySignal;
  const fixture = runtime([request => { primarySignal = request.signal; return new Promise(() => {}); }, ready()], { primaryTimeoutMs: 5 });
  const result = await run(navigation(), fixture);
  assert.equal(result.status, 302);
  assert.equal(primarySignal.aborted, true);
  assert.equal(fixture.calls.length, 2);
});

test('probe is fresh and carries no visitor cookies, authorization, origin or referer', async () => {
  const fixture = runtime([failed(), ready()]);
  await run(navigation('/?secret=private', { headers: { Cookie: 'dashboard_session=private', Authorization: 'Bearer private', Origin: primary, Referer: `${primary}/private` } }), fixture);
  assert.equal(fixture.calls[0].headers.get('Cookie'), 'dashboard_session=private');
  const probe = fixture.calls[1];
  assert.equal(probe.method, 'GET');
  assert.equal(probe.url, `${backup}/readyz`);
  assert.equal(probe.redirect, 'error');
  assert.equal(probe.cache, 'no-store');
  assert.deepEqual([...probe.headers], [['accept', 'application/json'], ['cache-control', 'no-store']]);
});

test('unready or malformed backup returns a static 503 with fixed manual links', async () => {
  for (const response of [
    new Response('offline', { status: 503 }),
    new Response(null, { status: 302, headers: { Location: 'https://elsewhere.example' } }),
    new Response('{"ready":true}', { headers: { 'Content-Type': 'text/html' } }),
    Response.json({ ready: false }), Response.json({ ready: 'true' }),
    new Response('not json', { headers: { 'Content-Type': 'application/json' } }),
    new Response(' '.repeat(1_025), { headers: { 'Content-Type': 'application/json' } }),
    new Error('TLS failed'),
  ]) {
    const fixture = runtime([failed(), response]);
    const result = await run(navigation('/?secret=<script>alert(1)</script>'), fixture);
    assert.equal(result.status, 503);
    assert.equal(result.headers.get('Location'), null);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    const body = await result.text();
    assert.ok(body.includes(`href="${backup}/"`));
    assert.ok(!body.includes('alert(1)'));
    assert.ok(!body.includes('TLS failed'));
    assert.equal(fixture.calls.length, 2);
  }
});

test('backup timeout is bounded, aborts the probe and renders the outage page', async () => {
  let probeSignal;
  const fixture = runtime([failed(), request => { probeSignal = request.signal; return new Promise(() => {}); }], { backupTimeoutMs: 5 });
  assert.equal((await run(navigation(), fixture)).status, 503);
  assert.equal(probeSignal.aborted, true);
  assert.equal(fixture.calls.length, 2);
});

test('readiness body parsing is covered by the probe deadline', async () => {
  const stalled = new Response(new ReadableStream({ start() {} }), { headers: { 'Content-Type': 'application/json' } });
  const fixture = runtime([failed(), stalled], { backupTimeoutMs: 5 });
  assert.equal((await run(navigation(), fixture)).status, 503);
});

test('destination allows only root guild/home values and privacy/terms paths', async () => {
  for (const [path, expected] of [
    ['/?guild=123456789012345678&home=1&code=secret&state=secret&returnTo=https://evil.example', '/?guild=123456789012345678&home=1'],
    ['/?guild=invalid&home=2&url=https://evil.example', '/'],
    ['/?guild=123456789012345678&guild=123456789012345679&home=1&home=1', '/'],
    ['/privacy?state=secret&guild=123456789012345678', '/privacy'],
    ['/terms?next=https://evil.example', '/terms'],
    ['/connections?guild=123456789012345678&record=secret', '/'],
    ['/unknown?home=1&code=secret', '/'],
    ['/auth/callback?code=secret&state=secret', '/'],
    ['/auth/tiktok/callback?code=secret&state=secret', '/'],
    ['/auth?code=secret&state=secret', '/'],
  ]) {
    const fixture = runtime([failed(), ready()]);
    const result = await run(navigation(path), fixture);
    assert.equal(result.headers.get('Location'), `${backup}${expected}#`);
    if (path.startsWith('/auth?') || path.startsWith('/auth/')) assert.equal(fixture.passThrough, 0);
  }
});

test('all failover destinations explicitly clear an original browser fragment', async () => {
  for (const path of ['/#access_token=private', '/privacy#private', '/terms#private', '/auth/callback?code=private#private', '/unknown#private']) {
    const fixture = runtime([failed(), ready()]);
    const result = await run(navigation(path), fixture);
    const location = result.headers.get('Location');
    assert.ok(location.endsWith('#'));
    assert.ok(!location.includes('private'));
    assert.equal(location.indexOf('#'), location.length - 1);
  }
});

test('POST/PATCH/DELETE are sent once, unchanged, with no timeout or failover', async () => {
  for (const method of ['POST', 'PATCH', 'DELETE']) {
    const response = failed();
    const fixture = runtime([async request => {
      assert.equal(await request.text(), '{"example":true}');
      await new Promise(resolve => setTimeout(resolve, 10));
      return response;
    }], { primaryTimeoutMs: 1 });
    const result = await run(navigation('/api/guilds/123456789012345678/community', {
      method, body: '{"example":true}', headers: { 'Content-Type': 'application/json', Cookie: 'fake', 'X-CSRF-Token': 'fake-csrf' },
    }), fixture);
    assert.equal(result, response);
    assert.equal(fixture.calls.length, 1);
    assert.equal(fixture.calls[0].headers.get('X-CSRF-Token'), 'fake-csrf');
    assert.equal(fixture.passThrough, 0);
  }
});

test('uncertain mutation transport failure returns fixed 502 without retry or exception passthrough', async () => {
  const fixture = runtime([new Error('private upstream detail')]);
  const result = await run(navigation('/api/action', { method: 'POST', body: 'private' }), fixture);
  assert.equal(result.status, 502);
  assert.equal(result.headers.get('Location'), null);
  assert.ok(!(await result.text()).includes('private'));
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.passThrough, 0);
});

test('APIs, assets, health checks, HEAD and non-document GETs do not fail over', async () => {
  const requests = [
    ...['/api/me', '/api', '/assets/logo', '/static/file', '/public/file', '/app.js', '/i18n-errors.js', '/logo.png', '/readyz', '/healthz', '/auth/logout'].map(path => navigation(path)),
    navigation('/', { method: 'HEAD' }),
    new Request(`${primary}/`, { headers: { Accept: 'text/html' } }),
    navigation('/', { headers: { 'Sec-Fetch-Mode': 'cors' } }),
    navigation('/', { headers: { 'Sec-Fetch-Dest': 'iframe' } }),
  ];
  for (const request of requests) {
    const response = failed();
    const fixture = runtime([response]);
    assert.equal(await run(request, fixture), response);
    assert.equal(fixture.calls.length, 1);
    assert.equal(fixture.passThrough, 0);
  }
});

test('rejects non-primary origins before fetching, including workers.dev and wrong ports', async () => {
  for (const origin of ['https://evil.example', 'https://cyrobot.ca.evil.example', 'http://cyrobot.ca', 'https://cyrobot.ca:444', backup, 'https://cyro-failover.example.workers.dev']) {
    const fixture = runtime([]);
    const result = await run(new Request(`${origin}/`, { headers: documentHeaders }), fixture);
    assert.equal(result.status, 421);
    assert.equal(fixture.calls.length, 0);
    assert.equal(fixture.passThrough, 0);
  }
});

test('production default handler has no request-driven simulation or destination configuration', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async request => { calls.push(request); return calls.length === 1 ? failed() : ready(); };
  try {
    const result = await worker.fetch(navigation('/?simulate=healthy&backup=https://evil.example&code=secret'), { BACKUP_ORIGIN: 'https://evil.example', FORCE_FAILOVER: true }, {});
    assert.equal(result.status, 302);
    assert.equal(result.headers.get('Location'), `${backup}/#`);
    assert.equal(calls[1].url, `${backup}/readyz`);
  } finally { globalThis.fetch = original; }
});
