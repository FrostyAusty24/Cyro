# Streamer statistics

Version 2.3 measures streams announced by this bot, separately for each Discord server, and groups linked accounts by creator. There is no extra per-server switch: an enabled account with a successfully posted real announcement becomes eligible automatically.

Open **Streamer leaderboard** in the dashboard, or use:

```text
/streamer-leaderboard period:7d sort:time
/streamer-leaderboard period:30d sort:viewers
/streamer-leaderboard period:all sort:followers
```

Server members can view the Discord leaderboard. Dashboard access follows the server owner’s access policy; Manage Server is allowed by default. Creator rankings combine linked accounts, and the dashboard also offers account details. Combined time adds platform time (simulcasts count on each platform), averages are weighted by measured coverage, peaks are the highest single-platform sample, and sessions count platform broadcasts. See [CREATOR_PROFILES.md](CREATOR_PROFILES.md) for the full interpretation and migration guide.

## What counts

- The first successful real announcement establishes a time baseline. The stream's original start time is never backfilled.
- Later polls must confirm that the same stream is live and freshly fetch the same bot-authored announcement from the correct server/channel. Cached messages cannot keep a deleted announcement earning time.
- Time is credited only between successive eligible observations. Statistics first appear after a positive measured interval.
- Going offline, pausing/removing the streamer, deleting the announcement, a failed check or a known Discord interruption breaks continuity. Kept announcements do not keep earning time after the stream is offline.
- Test messages, blocked title filters, cooldown-suppressed announcements and failed announcement sends do not create measured time.
- Restarting preserves totals and clears the active baseline. Long gaps beyond three configured polling intervals are excluded. The next valid observation starts a fresh baseline.
- Deleting a live announcement stops tracking that broadcast until another real announcement is established. The bot does not automatically repost a deleted message for the same broadcast.

These are conservative polling estimates, not an exact platform analytics export. An ending stream or deleted announcement may be detected at the next poll; the unconfirmed final interval is not credited. No statistics are fabricated for time while the bot was stopped. Keeping the service online improves coverage.

## Metrics and platform support

| Metric | Twitch | Kick | TikTok | YouTube |
| --- | --- | --- | --- | --- |
| Confirmed announcement time | Yes | Yes | Best effort | After quota-limited discovery |
| Sampled average/peak concurrent viewers | Yes | Yes | When the connector provides a valid room count | When the API exposes concurrent viewers |
| Net follower growth | Public total, using configured Twitch app credentials | Unavailable | Unavailable | Unavailable; subscribers are not treated as followers |

**Average viewers** is a time-weighted estimate using the two endpoints of each measured interval. It describes concurrent viewers, not total views or unique visitors. **Peak viewers** is the largest usable polled count within the selected UTC days, so a peak between polls can be missed. At a reporting boundary, the average uses the interpolated portion of a crossing interval while the peak uses only actual samples inside the period; the two can differ for a short, sparsely sampled period.

**Net followers** means follower-total increases minus decreases during intervals with two valid totals. It can be zero or negative. It cannot identify gross new follows, individual followers or whether an announcement caused a follow. The initial total is collected before posting and is deliberately excluded from the growth baseline; follower coverage begins with subsequent confirmed polls. An unavailable total breaks follower coverage, without discarding usable time/viewer measurements. No follower identities are stored.

The dashboard shows metric coverage: the fraction of tracked time for which that metric was measured. A real zero appears as `0`; missing support or failed metric requests appear as `Unavailable`. Coverage matters when comparing creators. Provider details and primary sources are in [STREAM_METRICS_RESEARCH.md](STREAM_METRICS_RESEARCH.md).

## History and storage

Statistics are stored in `DATA_DIR/stream-analytics.json`, using the same exclusive data-folder ownership as the rest of the bot. Back up this file with the complete data directory. Old installations need no replacement of `streamers.json` and no reset of existing server records.

The 7-day and 30-day windows include the current UTC calendar day plus the previous 6 or 29 days. Retained history covers 90 UTC calendar days, not lifetime totals. Old daily buckets are pruned. Samples crossing midnight split their duration and viewer coverage by day; follower changes are assigned to their detection interval's final bucket. Session totals count distinct provider broadcasts with measured time in the selected window, so a restart does not create another broadcast.

Removing a configured streamer stops future measurement and leaves its recent history until it ages out. If the bot leaves a guild, the existing 30-day removed-guild cleanup also purges its analytics. Rejoining cancels that pending removal. Operator backups are separate copies.

## Hosting and live acceptance

Use the hosting setup in [HOSTING.md](HOSTING.md), one active bot process and persistent local disk. Statistics need Read Message History and View Channel on the announcement channel so each observation can verify the message. Register the new command through `AUTO_DEPLOY_COMMANDS=true` on restart or `npm run deploy-commands` after building.

Before relying on the leaderboard publicly, test a real announced stream in two guilds: compare independent timers, pause one guild, delete its announcement, restart the bot, and confirm the other guild's history is unaffected. Verify Twitch follower-total access with your actual app credentials. These live checks are separate from automated/mock validation; Docker, OAuth and public HTTPS still require the chosen host and configuration.
