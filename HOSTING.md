# Hosting Cyro 2.13

Cyro needs one continuously running Node.js process, persistent local disk and outbound HTTPS/WebSocket connectivity. Voice also needs outbound Discord UDP. A sleeping web tier or a request-only/serverless function is unsuitable. Bot directories and data should not live in a synchronized cloud folder or network share.

One Discord application can serve many servers. Guild IDs inside its data connect records to the right community; they do not limit installation to one server. Top.gg lists bots but does not run the bot or dashboard for you.

## Discord and environment

Create your own application in the [Discord Developer Portal](https://discord.com/developers/applications). Enable Guild Install and Public Bot for public installations. Use `bot` and `applications.commands` scopes. The dashboard's `/invite` route generates the feature permission request without Administrator.

Enable **Server Members Intent** and **Message Content Intent**. Enable **Presence Intent** for custom-status roles. Discord's privileged-intent approval requirements depend on the application's reach; follow the current portal guidance. Missing or unapproved required intents can prevent Gateway login.

Use `.env.example` for local development or `.env.production.example` for a new public deployment. Supply your own bot token, application ID and OAuth2 client secret. Credential fields in both examples are deliberately empty. Never share the completed file.

Keep `DISCORD_COMMAND_SCOPE=global` for a public multi-server installation. Development-only registration requires `DISCORD_COMMAND_SCOPE=development` and `DISCORD_DEV_GUILD_ID`; do not set that on the public host. Global command registration does not delete old guild command definitions. Inspect and remove only obsolete development definitions after verifying global commands.

## Dashboard and HTTPS

For a local dashboard, use `DASHBOARD_URL=http://localhost:3000` and register the exact `http://localhost:3000/auth/callback` OAuth2 redirect. Local development binds to `127.0.0.1` by default.

For a public dashboard, configure a real HTTPS origin such as `https://bot.example.com` and register its exact `/auth/callback` in Discord. Public HTTP origins are rejected. If enabling TikTok connections, register the separate `/auth/tiktok/callback` on your TikTok application and configure its own keys. See [FEATURE_SETUP.md](FEATURE_SETUP.md).

Put an HTTPS reverse proxy in front of the dashboard and prevent direct public access to its backend port. Preserve the browser's Origin header. For one trusted proxy that appends the actual client address to `X-Forwarded-For`, set `DASHBOARD_TRUST_PROXY=true`. Leave it false if public clients can reach the backend directly. Multiple proxy layers need a correctly configured trusted ingress; do not trust arbitrary forwarded headers.

`PORT`, when set by a host, takes precedence over `DASHBOARD_PORT`. Sessions are in memory and expire after 30 minutes of inactivity or eight hours total; restarting requires users to sign in again. OAuth state is single-use and browser-bound. Writes require same-origin requests and a CSRF token. Server membership and current dashboard permissions are checked again for server requests.

The server owner always retains dashboard access and can configure additional access roles or disable the default Manage Server/Administrator grant. Dashboard permissions and slash-command restrictions are separate. Grant staff access only to people who should view and change the server's settings and records.

## Native Node hosting

Use Node.js **22.12.0 or newer**; Node 24 is recommended. Keep npm optional platform dependencies and install scripts enabled so Canvas and FFmpeg can install for your actual host. Do not copy Windows `node_modules` onto Linux.

```sh
npm ci
npm run build
npm run check-hosting
npm start
```

Use a service manager that restarts the process after failure and allows at least **75 seconds** to stop. Set a persistent `DATA_DIR` writable by the service account. Do not run overlapping deployments or a second process with the same bot token.

The check-hosting command inspects configuration without contacting Discord or printing credentials. It does not verify token validity, DNS, TLS, OAuth redirects or actual Discord permissions. A local development configuration can report public-hosting items that are intentionally not configured.

## Docker

After creating the private `.env`, build and run the local Compose stack:

```sh
docker compose up -d --build
docker compose logs --tail=100 cyro
```

The local stack binds its dashboard port to host loopback at `127.0.0.1:3000`. Put your own host HTTPS proxy in front. The `./data` bind mount preserves records. On Linux it must be writable by UID 1000, the non-root container user.

For the standalone Caddy production stack:

1. Point your domain's DNS at the host and allow inbound ports 80 and 443.
2. Start from `.env.production.example`. Set `DASHBOARD_DOMAIN` to the bare domain, `DASHBOARD_URL` to its matching HTTPS origin, and your own credentials.
3. Register the matching Discord OAuth2 redirect and prepare the writable persistent data directory.
4. Run this file alone, not as an override of the local Compose file:

   ```sh
   docker compose -f compose.production.yml build
   docker compose -f compose.production.yml run --rm bot npm run check-hosting
   docker compose -f compose.production.yml up -d
   docker compose -f compose.production.yml logs --tail=100 bot
   ```

The production stack publishes only the proxy, keeps certificate data in named volumes, rotates container logs and permits 75 seconds for shutdown. Its health check observes readiness; Docker Compose does not automatically restart a running container merely because it becomes unhealthy. Test this image, its native/audio dependencies, host networking and certificate issuance on the actual Docker host. A passing TypeScript build is not evidence of a working container.

## Permissions and first setup

Cyro needs View Channel, Send Messages and Embed Links where it posts. Give it Read Message History for announcement verification and transcripts, Attach Files for image cards/transcripts, and Manage Roles only for configured role features. Role targets must be ordinary assignable roles below Cyro's highest role; unsafe roles are rejected.

Ticket creation needs Manage Channels and Manage Roles. Optional automatic channel deletion needs additional permissions to verify there are no threads or webhooks whose content would be lost. Configure a private transcript channel and test a complete closure before enabling deletion in a busy server. Voice needs Connect and Speak; TTS also posts a disclosure in the call's chat. See [FEATURE_SETUP.md](FEATURE_SETUP.md) for each feature's setup and limits.

## Storage, backups and upgrades

Run **one process against one data directory**. The current version uses bounded, serialized JSON stores with atomic writes and a directory lock. It does not implement distributed transactions, shared workers or sharding. Adding replicas requires redesigning storage and work ownership, not bypassing the lock.

Back up the entire data directory while stopped or with a consistent filesystem snapshot. Keep OAuth tokens, transcripts, moderation records and backups private. Do not commit them. A stopped or crashed process's ownership lock can take up to 60 seconds to expire; do not manually delete a live lock.

On upgrade: stop the old process, save a private backup, preserve `.env` and the complete data directory, install locked dependencies, build and start one replacement process. Schema migrations happen on startup and may prevent an older release from reopening the new data. Check recovery warnings before retrying interrupted operations.

Ticket/application operations persist recovery state before external effects. `/support-recovery list` helps managers inspect uncertain operations; `/support-recovery release` requires a specific operation ID and a reason after checking Discord. It does not undo Discord actions or replay them automatically.

Confirmed removed-server records are eligible for cleanup after 30 days while Cyro is online; rejoining cancels removal. Discord messages and operator backups are separate copies. Review [public/privacy.html](public/privacy.html) and [public/terms.html](public/terms.html) before running your own service, and replace official-service operator/provider/contact statements with accurate details for that deployment.

## Verify the real deployment

- `/healthz` confirms the web process is running. `/readyz` returns 200 only when startup recovery is complete and Discord is ready; disconnects and shutdown return 503. `/api/public/stats` exposes only the current process's aggregate server count and reports unavailable when not ready.
- Test HTTPS sign-in and the invite link. Install into two test servers and verify independent settings and authorization, including removal of a staff role or dashboard grant.
- Check ordinary role assignment, member verification, moderation hierarchy, ticket privacy/transcripts, applications and creator alerts using your own test accounts.
- Join a real voice call to test audible music/TTS. Mock tests and an available decoder do not prove Discord UDP connectivity or actual playback.
- Restart and confirm persistence; test restoring a private backup. Inspect incomplete support operations before retrying.
- Check provider credentials, quotas, supported metrics and TikTok app approval. No self-hosted credentials are supplied by this repository.

The offline demo and automated tests are useful checks, but do not replace these live tests. [Community support](https://discord.gg/rcSsGQxbuh) can help with setup questions. Keep secrets and private logs out of public discussions.
