# Cyro

A Discord community bot with a web dashboard, creator alerts, moderation, tickets, applications and community activities. One running application can serve multiple Discord servers; settings, permissions and activity records stay separate for each server.

**Version 2.15.0 · Node.js 22.12.0 or newer · TypeScript · discord.js**

[Official Cyro website](https://cyrobot.ca/?home=1) · [Add the hosted bot](https://cyrobot.ca/invite) · [Headache Development support](https://discord.gg/dAZheerkkD)

## Included

- **Creators:** group Twitch, Kick, YouTube and TikTok accounts under one creator; configure live announcements, supported video uploads, title filters and linked Discord roles. Streamer leaderboards cover measured time while a confirmed announcement is active.
- **Moderation:** warnings, timeouts, kicks, bans, message cleanup, blocked phrases, spam controls and moderation records.
- **Welcomes and roles:** custom welcome/goodbye text and image cards, automatic roles, self-role panels, reaction or image-challenge verification, and configurable custom-status rewards.
- **Support:** multiple ticket categories and application forms, button/dropdown panels, staff claims, saved transcripts and optional ticket-channel deletion after a successful export.
- **Community:** counting, message XP, invite challenges, optional staff invite history, polls, embed publishing, suggestions/voting and anonymous public confession posts.
- **Voice:** compatible direct audio/radio and supported public YouTube video links, plus 12 free Kokoro neural TTS voices for messages from members in the current call: six male and six female.
- **Management:** Discord sign-in, per-server settings, owner-controlled dashboard/command access, server-specific bot appearance and staff leaderboards.

All current features of the official hosted Cyro service are free. Paid options would only be considered if its hosting costs became too expensive to sustain. Self-hosting requires your own infrastructure and platform credentials.

## Quick start

1. Install Node.js **22.12.0 or newer** and npm. Node 24 is recommended. Use an always-on host with persistent local disk, outbound HTTPS/WebSocket access, and outbound UDP for Discord voice.
2. Create your own application in the [Discord Developer Portal](https://discord.com/developers/applications). Enable Guild Install and Public Bot if other servers should be able to install it. Enable **Server Members Intent** and **Message Content Intent**. **Presence Intent** is optional and required for custom-status roles.
3. Install the locked dependencies and copy the empty configuration example:

   ```sh
   npm ci
   cp .env.example .env
   ```

   In PowerShell, use `Copy-Item .env.example .env`. Windows users can also run `install.cmd`.

4. Set `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` privately in `.env`. Keep `DISCORD_COMMAND_SCOPE=global`; a public multi-server bot does not need a guild ID in its environment. For a local dashboard, register `http://localhost:3000/auth/callback` under the application's OAuth2 redirects.
5. Build, inspect configuration and start:

   ```sh
   npm run build
   npm run check-hosting
   npm start
   ```

6. Open `http://localhost:3000/invite`, complete Discord's installation flow, then sign in at `http://localhost:3000`. Select your server and configure the features you want. Move Cyro's role above ordinary roles it should assign. Do not grant Administrator just to avoid configuring permissions.

The hosting check does not contact Discord or verify your credentials, OAuth redirect registration or live permissions. An intentionally local HTTP dashboard is not a public HTTPS deployment. See [HOSTING.md](HOSTING.md) for hosting, backups and live acceptance checks.

## Preview without credentials

```sh
npm run preview
```

Open `http://localhost:3100/?demo=1` for a clearly labelled offline dashboard demo. The preview never reads `.env`, connects to Discord, or opens production data. The root page previews the public homepage; its server count will be unavailable offline.

## Platform configuration and limits

| Integration | Operator setup and limits |
| --- | --- |
| Twitch | Set `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`. Sampled live viewers and net follower growth depend on the API data available. |
| Kick | Set `KICK_CLIENT_ID` and `KICK_CLIENT_SECRET`. Follower growth is unavailable. |
| YouTube | Enable YouTube Data API v3 and set `YOUTUBE_API_KEY`. Discovery is quota-limited; increased channel counts can delay live announcements. |
| TikTok videos | Set `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET`, register your own `/auth/tiktok/callback`, and obtain Login Kit/Display API access for `user.info.basic` and `video.list`. Each creator must consent. Sandbox testing is limited to approved target accounts. |
| TikTok LIVE | Uses an unofficial best-effort connector and can be interrupted by platform changes. An optional `TIKTOK_EULER_API_KEY` enables an additional provider fallback. |
| Music | Direct audio/radio and single public, recorded YouTube videos within the configured duration limit. YouTube uses an optional pinned yt-dlp runtime and can be unavailable on a hosting IP. No playlists, livestreams, private/age-restricted videos, or Spotify full-track playback. |
| TTS | Twelve free local Kokoro voices: six male and six female, with British and American accents. Daniel is the default. Only new messages from members in the active call are spoken; no microphone listening. One voice channel/mode per server. |

Confessions hide authors from the public post, not from Discord. Invite attribution may be unknown and cannot identify the external website where an invitation was clicked. Stream statistics are polling estimates, not full-account analytics; simulcasts add time separately for each platform. Read [CREATOR_PROFILES.md](CREATOR_PROFILES.md) and [STREAMER_STATS.md](STREAMER_STATS.md).

The optional YouTube runtime installs from a pinned, checksum-verified official yt-dlp release during npm installation on Windows x64 and glibc Linux x64/arm64. Installation or source-access failures do not prevent the bot from starting. After building, run `npm run check-youtube` for a credential-free source test using a small fragment of Blender’s CC BY sample; it does not join Discord or verify audible playback. The YouTube Data API key is for creator alerts, not music playback.

The optional TTS installer downloads pinned Kokoro q8 model assets and an isolated runtime into `bin/tts`. Run `npm run install-voices` to install or retry it, then rebuild and restart. Downloads contain model/runtime files; chat text stays on the bot host. If installation or the startup speech check fails, TTS is unavailable while other bot features can start. CPU speed, free disk and measured peak memory determine capacity; a nominal 1 GB hosting plan is not a capacity guarantee. Existing voice preferences remain valid: `voice1`–`voice4` still select Daniel, Michael, Heart and Bella; eight more choices use `voice5`–`voice12`. See [FEATURE_SETUP.md](FEATURE_SETUP.md) for the complete voice list and setup, and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for model/runtime licenses.

## Commands and feature setup

Start with `/dashboard`. Useful member commands include `/counting`, `/rank`, `/leaderboard`, `/invites`, `/streamer-leaderboard`, `/suggestion`, `/confess`, `/ticket open` and `/apply`. Voice commands include `/playmusic`, `/musicqueue`, `/skipmusic`, `/stopmusic`, `/addtts`, `/ttsvoice` and `/stoptts`.

Platform commands such as `/twitch add`, `/twitch edit` and `/twitch test` manage alerts. `/streamalerts status` shows provider readiness. Staff use `/moderate`, `/ticket claim`, `/ticket close` and `/staff-leaderboard` according to current permissions. Most community features need channels, roles and an enabled setting before they can run. See [FEATURE_SETUP.md](FEATURE_SETUP.md).

`AUTO_DEPLOY_COMMANDS=true` registers commands on startup. To register manually after a command change, run `npm run deploy-commands`. Use `npm run deploy-commands -- --dry-run` to inspect registration scope without changing Discord.

## Data, deployment and upgrades

Keep `.env`, `DATA_DIR`, backups and logs private. Never commit bot tokens, platform credentials, OAuth tokens or real server records. `.gitignore` excludes these files, but review every commit before publishing.

Run exactly **one bot process against one persistent data directory**. Atomic JSON stores and a directory ownership lock protect the current deployment; they do not support multiple workers, replicas or shards. Stop the previous process before starting a replacement and allow at least 75 seconds for graceful shutdown. Back up the complete data directory while stopped or through a consistent filesystem snapshot.

For upgrades, retain the existing private `.env` and complete `data` directory, install dependencies with `npm ci`, rebuild and restart. Never replace live data with example or demo records. Automatic schema changes can make older versions unable to read the upgraded files.

The included public privacy/terms pages describe the official Cyro service. Before hosting a separate service, review and update its operator, contact, hosting providers, retention details, domain and branding to match your actual deployment. Your installation must not imply that it is the official hosted Cyro service.

## Development and validation

```sh
npm run typecheck
npm test -- --maxWorkers 2
npm run build
```

Tests use mocked Discord/provider interactions and temporary data. Passing tests and the offline demo do not prove real voice playback, OAuth, platform credentials, Discord permissions, Docker deployment or HTTPS. Verify those on your own test application and host before inviting a wider community.

Original Cyro source is available under the [MIT License](LICENSE), copyright 2026 Headache Development. Third-party components retain their own licenses, including GPL/AGPL dependencies; MIT does not relicense them. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before packaging a runtime for distribution.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) for development and private vulnerability reporting.
