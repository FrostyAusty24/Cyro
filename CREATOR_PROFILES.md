# Creator profiles

Version 2.3 groups platform accounts under one server-owned creator name and optional Discord member. Twitch, Kick, TikTok and YouTube accounts can belong to the same profile. Each account retains its own alert channel, ping/live roles, title filter, cooldown, message, enabled state and cleanup behavior.

## Use the dashboard

1. Open **Stream alerts** and create a creator profile with the name your community knows.
2. Add a platform account to that creator. Repeat for the creator's other platforms.
3. To combine existing entries, edit each account and select the same creator profile. Existing account IDs, live announcements and measured history are preserved.
4. Edit the creator profile to rename it or change its linked Discord member across every account. Moving an account uses the destination creator's Discord member; configure that member before moving an account that uses a live role.
5. Pause, edit or remove an individual account from its creator card. Removing an account stops future tracking and keeps its retained statistics. A profile with no configured accounts can be deleted; its past statistics remain as individual account entries until they age out. Moving accounts out also makes their previous profile empty.

Names are scoped to each Discord server. Similar names are never automatically merged. A platform account cannot be tracked twice in one server, but the same account can be tracked independently in other servers. The default announcement's `{streamer}` uses the creator name; `{username}` continues to identify the platform account.

The optional `creator` selector on `/twitch add`, `/kick add`, `/tiktok add`, `/youtube add` and their `edit` subcommands links an account to an existing profile. Create or rename profiles in the dashboard. Existing commands without a creator selection still work and create an individual profile for new accounts. Change a shared Discord member through the profile editor so all account role assignments are validated and reconciled together.

## Leaderboard meaning

The dashboard defaults to creators and also offers individual platform accounts. The Discord leaderboard groups by creator.

- **Platform time** adds measured time from every linked account. One hour live on both Twitch and YouTube contributes two platform-hours. This is not unique wall-clock streaming time.
- **Average viewers** weights each account's sampled average by its measured viewer coverage. It is not the simultaneous audience summed across sites.
- **Peak viewers** is the highest single-platform polled count, not a combined simultaneous peak.
- **Net followers** adds supported account measurements. Currently only Twitch provides this metric; unavailable platforms are not silently converted to zero. Coverage reflects the time that actually had measurements.
- Sessions count platform broadcasts. Two simultaneous broadcasts on different platforms count separately.

Account-level details remain visible. Moving an account transfers its retained history to the new profile; renaming a profile updates its historical label. The existing announcement-gated rules and 90-day windows still apply; see [STREAMER_STATS.md](STREAMER_STATS.md).

## YouTube setup

Enable **YouTube Data API v3** in a Google Cloud project and put its API key in `YOUTUBE_API_KEY` privately on the bot host. Restrict the key to this API and to the host's public IP when that is stable. Do not put it in the dashboard or commit it. Accepted identifiers are `@handle`, a `UC...` channel ID, or the corresponding `youtube.com/@handle` / `youtube.com/channel/ID` URL. Video/watch links and legacy custom URL aliases are not channel identifiers.

Discovery uses the [official live search endpoint](https://developers.google.com/youtube/v3/docs/search/list). Google's current [quota documentation](https://developers.google.com/youtube/v3/determine_quota_cost) gives search its own default allowance of 100 calls per day. This implementation spaces repeat discovery by approximately 15 minutes multiplied by the number of distinct recently tracked channels. Once a broadcast is known, the bot checks its [video details](https://developers.google.com/youtube/v3/docs/videos) at the normal polling interval. New-live discovery can therefore be delayed; it does not backfill time before the bot's announcement. A manual check respects throttling. Restarts, new subscriptions or other apps sharing the API project can consume additional quota; this schedule does not guarantee quota availability. Review your actual Google Cloud allocation before a large public rollout.

Only a broadcast confirmed as actually live can announce; scheduled or ended videos cannot. Concurrent viewers are sampled when YouTube exposes them. Hidden/unavailable viewer counts remain unavailable. Subscriber totals are not follower growth and are not collected for this metric. API/quota failures preserve state and break analytics continuity.

## Upgrade and validation

On the next normal bot start, version-1 `streamers.json` migrates atomically to version 2, adding one independent creator per existing account. Existing IDs, channel settings and live session/message IDs stay intact. The analytics file is unchanged. Back up the full data folder before starting; an older bot version cannot read the migrated version-2 stream store.

Copying an upgrade does not start the bot or migrate production data by itself. Rebuild, register the updated command definitions, and start normally when ready. The local demo uses sample data only.

Before public launch, link a real creator's accounts in two test guilds, verify each announcement and independent settings, move an account, rename its profile, change the linked member and check live roles, then restart and verify history. YouTube credentials, live API behavior and quota remain host-specific acceptance checks.
