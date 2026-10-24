/** Cloudflare route Worker for Cyro. No secrets, bindings, or runtime test switches. */
const PRIMARY_ORIGIN = 'https://cyrobot.ca';
const BACKUP_ORIGIN = 'https://backup.cyrobot.ca:1029';
const PRIMARY_TIMEOUT_MS = 8_000;
const BACKUP_TIMEOUT_MS = 3_000;

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function isDocumentNavigation(request, url) {
  if (request.method !== 'GET'
    || request.headers.get('Sec-Fetch-Dest') !== 'document'
    || request.headers.get('Sec-Fetch-Mode') !== 'navigate'
    || !request.headers.get('Accept')?.toLowerCase().includes('text/html')) return false;
  // Fetches and downloadable resources must never receive a cross-origin login redirect.
  return !/^\/api(?:\/|$)/.test(url.pathname)
    && !['/healthz', '/readyz', '/auth/logout'].includes(url.pathname)
    && !/^\/(?:assets|public|static)(?:\/|$)/.test(url.pathname)
    && !/\/[^/]*\.[^/]+$/.test(url.pathname);
}

function destinationFor(url) {
  const destination = new URL(BACKUP_ORIGIN);
  if (url.pathname === '/privacy' || url.pathname === '/terms') {
    destination.pathname = url.pathname;
    return `${destination.href}#`;
  }
  // Every auth/callback and unknown route starts a fresh backup session at the root.
  // Never forward a code, state, returnTo, token, record, or arbitrary URL parameter.
  if (url.pathname === '/') {
    const guilds = url.searchParams.getAll('guild');
    if (guilds.length === 1 && /^\d{17,20}$/.test(guilds[0])) destination.searchParams.set('guild', guilds[0]);
    const home = url.searchParams.getAll('home');
    if (home.length === 1 && home[0] === '1') destination.searchParams.set('home', '1');
  }
  // An explicit empty fragment prevents the browser inheriting the original URL's fragment.
  return `${destination.href}#`;
}

/** The deadline covers response headers and any body work performed by operation. */
async function bounded(operation, milliseconds) {
  const controller = new AbortController();
  let timeout;
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error('Upstream deadline exceeded.'));
    }, milliseconds);
  });
  try { return await Promise.race([operation(controller.signal), deadline]); }
  finally { clearTimeout(timeout); }
}

async function backupReady(fetchImpl, timeoutMs) {
  try {
    return await bounded(async signal => {
      // A new request deliberately excludes the visitor's cookies, authorization, and URL.
      const probe = new Request(`${BACKUP_ORIGIN}/readyz`, {
        method: 'GET', redirect: 'error', cache: 'no-store', signal,
        headers: { Accept: 'application/json', 'Cache-Control': 'no-store' },
      });
      const response = await fetchImpl(probe);
      if (response.status !== 200 || response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        await response.body?.cancel();
        return false;
      }
      const reader = response.body?.getReader();
      if (!reader) return false;
      const chunks = [];
      let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.byteLength;
          if (length > 1_024) { await reader.cancel(); return false; }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(length);
      let position = 0;
      for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.byteLength; }
      const data = JSON.parse(new TextDecoder().decode(bytes));
      return data !== null && typeof data === 'object' && data.ready === true;
    }, timeoutMs);
  } catch { return false; }
}

function unavailablePage() {
  return new Response(`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cyro is temporarily unavailable</title>
<style>html{color-scheme:dark;background:#0c1117;color:#e8edf4;font-family:Bahnschrift,system-ui,sans-serif}body{max-width:42rem;margin:14vh auto;padding:2rem;line-height:1.65}h1{font-size:2rem;line-height:1.2}p{color:#bdc9d7}a{color:#82d9f6}nav{display:flex;flex-wrap:wrap;gap:1.5rem;margin-top:2rem}</style>
<main><p>CYRO · HEADACHE DEVELOPMENT</p><h1>We couldn’t reach your dashboard.</h1>
<p>The main connection is unavailable, and the backup could not confirm it is ready. Please try again shortly.</p>
<p>If a save or action was in progress, check its result after reconnecting before trying it again.</p>
<nav><a href="https://cyrobot.ca/">Try the main dashboard</a><a href="https://backup.cyrobot.ca:1029/">Open the backup</a><a href="https://discord.gg/dAZheerkkD" rel="noopener noreferrer">Community support</a></nav></main></html>`, {
    status: 503,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
      'Retry-After': '30',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    },
  });
}

/** Dependency injection is only a source-level test seam, never controlled by a URL or env. */
export async function handleRequest(request, context = {}, {
  fetchImpl = fetch,
  primaryTimeoutMs = PRIMARY_TIMEOUT_MS,
  backupTimeoutMs = BACKUP_TIMEOUT_MS,
} = {}) {
  const url = new URL(request.url);
  if (url.origin !== PRIMARY_ORIGIN) return new Response('This route serves the Cyro dashboard only.', {
    status: 421, headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
  });

  const documentNavigation = isDocumentNavigation(request, url);
  if (!documentNavigation) {
    try {
      // One origin attempt, with the original body and credentials. Never retry uncertain writes.
      return await fetchImpl(new Request(request, { redirect: 'manual' }));
    } catch {
      return new Response('The dashboard connection failed. Check the result before repeating an action.', {
        status: 502, headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  }

  // OAuth callbacks consume one-time codes; platform exception handling must not replay them.
  if (url.pathname !== '/auth' && !url.pathname.startsWith('/auth/') && typeof context.passThroughOnException === 'function') {
    context.passThroughOnException();
  }
  try {
    const response = await bounded(signal => fetchImpl(new Request(request, { redirect: 'manual', signal })), primaryTimeoutMs);
    if (response.status < 500 || response.status > 599) return response;
    // Do not let a stalled error-body cancellation delay the independent readiness check.
    void response.body?.cancel().catch(() => {});
  } catch {
    // No primary retry, even if its response was lost. Only a fresh backup navigation follows.
  }
  if (!await backupReady(fetchImpl, backupTimeoutMs)) return unavailablePage();
  return new Response(null, { status: 302, headers: { ...SECURITY_HEADERS, Location: destinationFor(url) } });
}

export default {
  fetch(request, _env, context) { return handleRequest(request, context); },
};
