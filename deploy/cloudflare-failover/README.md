# Cyro automatic dashboard failover

`worker.mjs` is a standalone, dependency-free Cloudflare Worker for the **route `https://cyrobot.ca/*`**. Deploy it as a route in front of the existing proxied tunnel record. **Do not use a Workers Custom Domain or replace the existing tunnel DNS record.** A route Worker can fetch the same incoming URL to reach the configured origin without recursively invoking itself.

The production module contains no credentials, environment bindings, or URL-driven test mode. Its only supported public origin is `https://cyrobot.ca`; ordinary requests through `workers.dev` receive 421. The exported `handleRequest` dependency-injection argument exists for tests and is not populated from visitor input or Worker environment variables.

## Behavior

- Healthy requests pass to the existing tunnel once. The original response, cookies, body and redirect remain intact.
- A top-level HTML GET navigation has an eight-second primary deadline. On primary 5xx, connection failure or timeout, the Worker performs a separate credential-free, uncached HTTPS GET to `https://backup.cyrobot.ca:1029/readyz` with a three-second deadline. It requires HTTP 200, JSON content type and boolean `ready: true` in a bounded response body.
- If the backup is ready, a temporary no-store redirect moves the visitor to it. Only a valid root `guild` ID or `home=1` survives; `/privacy` and `/terms` retain their paths. Unknown paths and authentication callbacks restart at the backup root. Authentication codes, state, return URLs and arbitrary parameters are never copied to the backup. Every redirect ends with an explicit empty fragment (`#`) so the browser cannot inherit the original page's fragment; users choose their dashboard section again on the backup.
- If the backup cannot confirm readiness, a fixed 503 page offers the main, backup and support links. It contains no visitor URL, credentials or upstream error details.
- API calls, assets, health checks, non-document requests and mutations are forwarded once without an imposed Worker timeout or failover. Origin HTTP failures are returned unchanged. A transport exception returns a fixed 502. No operation is automatically retried.
- `passThroughOnException()` is enabled only for safe document GETs outside `/auth` and `/auth/`. It is never enabled for a mutation or OAuth callback, because an uncertain operation must not be replayed. Configure route failure behavior as **fail open** so reaching free-tier Worker limits does not deliberately disable an otherwise healthy primary origin.

## Deployment and verification

1. Preserve the current proxied `cyrobot.ca` tunnel DNS record and existing route configuration. Confirm both primary and backup dashboards work, and that backup TLS and Discord OAuth are valid.
2. Create a Worker and paste the complete contents of `worker.mjs`. Use a current compatibility date (the code uses standard Fetch APIs and `Request.cache: 'no-store'`). No secrets or bindings are needed.
3. **Disable Worker invocation logs before routing live traffic.** Cloudflare may enable invocation logging by default, and request URLs can include OAuth codes or state. Disable observability/invocation logs for this Worker (including any request-URL collection); do not enable live tail or HTTP log export while testing real sign-ins. The module itself contains no logging. Verify the saved setting before adding the live route.
4. Verify Workers can fetch the backup HTTPS endpoint on **port 1029** with certificate validation. Local tests do not establish Cloudflare egress support or live host readiness.
5. Add only the zone route `https://cyrobot.ca/*` to the Worker. Do not attach the backup hostname, `*.cyrobot.ca/*`, or a new Custom Domain. Choose fail-open route behavior where Cloudflare exposes it.
6. Verify the main landing page, Discord sign-in, authenticated server reads and public assets still work. Confirm normal primary responses are not cached or redirected by the Worker.
7. Verify the redirect, readiness probe and unavailable-page paths in a controlled smoke test without stopping the live Discord bot or replaying writes. If a temporary test wrapper is used, replace it with this exact production module before attaching the live route. Never retain a request-controlled outage simulation switch.
8. Confirm the redirected backup allows its own Discord sign-in and authorized server access. Record live observations separately from local tests.

To roll back, remove the Worker route. This immediately restores the existing tunnel route; neither the bot nor its settings, backup listener or DNS record needs to change. Keep the deployed script in version control for review.

Run the focused tests with Node 22.12 or newer:

```sh
node --test deploy/cloudflare-failover/worker.test.mjs
```

## Limits

The original bookmark remains `https://cyrobot.ca`. During a tunnel failure a fresh navigation moves to the backup hostname automatically. A dashboard tab already open during an outage needs a refresh; this edge-only change does not discard unsaved drafts, migrate a running page, or replay failed saves. Primary and backup sessions are independent, so Discord may request another sign-in. TikTok account linking continues to require the primary dashboard.

Both dashboard listeners and the Discord bot still run on Prism. This handles a tunnel/origin-route failure while the direct HTTPS listener is healthy. It does not cover a Prism/container outage, a Cloudflare-wide/authoritative-DNS failure, Worker quota exhaustion that invokes fail-open, a client network that blocks port 1029, or a broken/expired backup certificate. The backup hostname remains useful as a manual recovery link for cases in which the Worker itself cannot run.

This directory supplies deployment code and local tests. It does not itself establish that an account plan, route, or live Worker has been configured.
