# Stream metrics provider research

Checked 2026-10-12 against primary provider documentation and the installed `tiktok-live-connector` 2.4.2 package. No credentials were read and no authenticated platform or live Discord calls were made.

## Contract and recording boundary

`LiveSnapshot.viewerCount?: number` and `followerCount?: number` are observations, not tracked history. A value must be a nonnegative safe integer. A genuine zero is valid; missing, malformed, negative, unsupported, or failed values remain `undefined`. Never carry an old follower total into a new observation as though it were freshly fetched.

Providers still poll eligible streams to discover when they are live. The monitor owns the separate recording gate: history begins only after a real announcement is confirmed and subsequent samples require the announcement to remain present and owned by this bot. The total fetched before posting is deliberately excluded from the initial follower baseline, preventing pre-announcement growth from being credited. The first subsequent confirmed live poll establishes follower coverage. Viewer and follower observations are polled samples, not exact event counts or proof that an announcement caused growth.

## Twitch

The existing app-token client can use `GET /helix/streams` for live status and `viewer_count`. Batch requests now deduplicate broadcaster IDs and set `first=100`; the documented default is 20, which is insufficient for a batch of 100 requested users. [Twitch Get Streams reference](https://dev.twitch.tv/docs/api/reference/#get-streams)

`GET /helix/channels/followers?broadcaster_id=...&first=1` exposes the public `total` without retrieving follower identities. The reference distinguishes total-only access from the scoped broadcaster/moderator access needed for the follower list. Its authorization wording initially describes the latter; Twitch's developer discussion explicitly demonstrates app-token total-only access. This implementation keeps the existing client-credentials flow and does not request streamer authorization or additional scopes. [Twitch Get Channel Followers reference](https://dev.twitch.tv/docs/api/reference/#get-channel-followers), [Twitch developer discussion showing the app-token case](https://discuss.dev.twitch.com/t/follows-endpoints-and-eventsub-subscription-type-are-now-available-in-open-beta/43322), [Twitch developer guidance for an app-token follower counter](https://discuss.dev.twitch.com/t/embedded-follower-count-button/59328)

One follower-total call is made per live broadcaster per polling pass, shared across its guild records, including the first live observation. At most four such requests run concurrently. A timeout, HTTP error, unsupported authorization, or malformed total leaves that metric unavailable and retains the confirmed live result. A real authenticated smoke test is still required to verify the operator's app configuration and current service behavior.

## Kick

Kick's current official Swagger still lists `GET /public/v1/users/livestreams`, with repeated integer `user_id` query parameters and app-token authorization. Its `LivestreamV2` schema includes the nested broadcaster/channel fields already used by this provider and `viewer_count`. The existing endpoint and authentication flow are therefore retained. The inspected public schema contains no follower-total field or follower-count endpoint; `followerCount` remains unavailable. No private website endpoint or unofficial scraping is added. [Kick's official OpenAPI document](https://api.kick.com/swagger/doc.json), [official Swagger UI](https://api.kick.com/swagger/index.html)

## TikTok

The existing connector is explicitly an unofficial reverse-engineering project. Its `fetchIsLive()` and `fetchRoomInfo()` work without a WebSocket connection, and its documented HTTP options permit request timeouts. We retain this existing best-effort integration; no additional scraping route is introduced. The installed 2.4.2 source returns the whole room-response body, with room information under `data`; the adapter now understands that wrapper as well as its existing direct-object shape. It reads only room `user_count`/`userCount` for viewers. [Connector maintainer documentation](https://github.com/zerodytrash/TikTok-Live-Connector/blob/ts-rewrite/README.md)

The current connector documentation does not establish a dependable room-owner follower total. A follower count on a chat/follow event's user describes that event's sender and must not be mistaken for the broadcaster. TikTok's official `/v2/user/info/` does expose `follower_count`, but requires that user's authorization and `user.info.stats`. Adding a streamer OAuth/token lifecycle solely for this metric is outside this change; TikTok follower totals remain unavailable. [TikTok Get User Info and authorized scopes](https://developers.tiktok.com/docs/en/tiktok-api-v2-get-user-info)

## Reliability and local validation

- Twitch/Kick broadcaster IDs and TikTok usernames are deduplicated within each polling pass. Results are still returned under every original guild record ID.
- Twitch/Kick authentication and API fetches have 10-second abort deadlines. Existing one-time 401 token refresh behavior is retained.
- TikTok's Got client has a 10-second request deadline and automatic retries disabled; its separate Euler fallback Axios client also has a 10-second timeout. Composite fallback attempts are sequential, so a whole TikTok status check may take longer than one request deadline.
- A failed required live-status/session-metadata request remains a provider error, rather than inventing a session ID or reporting offline. Missing numeric metrics do not turn a valid live observation into an error.
- Mocked tests cover cross-guild deduplication, initial follower totals, unavailable totals, genuine zero, malformed metrics, four-request follower concurrency, full Twitch batch size, bounded HTTP options, and wrapped TikTok room data. These checks are separate from authenticated provider/Discord smoke tests.
