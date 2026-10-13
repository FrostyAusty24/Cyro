# Contributing to Cyro

Use a separate Discord test application and test servers. Never use somebody else's credentials or copy production server data into fixtures. The [Cyro support server](https://discord.gg/rcSsGQxbuh) is available for setup questions and feature discussion.

For a bug, describe the affected feature, expected behavior, actual result, bot version and a minimal reproduction. Redact tokens, session cookies, private messages, member details and private channel/server identifiers. For vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Local development

1. Use Node.js 22.12.0 or newer and run `npm ci`.
2. Copy `.env.example` to `.env` and supply only your own test application's credentials when live Discord tests are needed. Never commit `.env`.
3. Run `npm run dev` for the bot, or `npm run preview` for the offline dashboard demo.
4. Run `npm run typecheck`, `npm test -- --maxWorkers 2` and `npm run build` before submitting a pull request.

Keep changes focused. Explain what changes for members or server staff, how you checked it, and which live checks remain. Add meaningful tests for behavior changes; use synthetic IDs and invented names in fixtures. Do not include logs, screenshots of private dashboards, recordings, release archives, generated builds, dependency directories or live data in a pull request.

## Project contracts

- Keep all server-owned settings and records scoped to the correct guild. Server selections and client-supplied IDs never grant permission.
- Recheck current membership, role hierarchy and authorization before privileged actions. Automatic/self-assigned roles must not grant moderation or dashboard access.
- Preserve data through upgrades. Use bounded storage, atomic writes and the existing single-instance lifecycle.
- Persist recoverable operation state before external side effects. Never blindly repeat a message, channel creation or role change when its outcome is unknown.
- Treat provider failures as unknown, not proof that a stream ended. Only confirmed announcement intervals count toward stream statistics.
- Keep tokens server-side and private content out of public endpoints and logs. The public server count is aggregate only.
- Preserve the accessible dark/icy-blue dashboard style, mobile layouts and keyboard focus states.

Dependency changes should update `package-lock.json` and explain runtime and licensing implications. Keep third-party notices intact. The source repository excludes dependency binaries; do not add prebuilt FFmpeg, eSpeak/WASM, native modules or generated installers without reviewing their distribution requirements.
