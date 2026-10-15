# Cyro feature setup (2.25.0)

Sign in to the dashboard with **Manage Server** permission and select the correct Discord server. Settings belong to that server. This guide describes setup; it does not confirm deployment or a live Discord test.

Server, channel, category and role pickers support search. Open a picker and type part of its name to narrow the list. Multiple-role pickers keep existing selections while you search for another role. Use the arrow keys and Enter to choose an option, or Escape to close without choosing another value.

YouTube notifications require a valid `YOUTUBE_API_KEY` in the running hosted environment. TikTok public-video alerts require configured Login Kit credentials and each creator's consent; sandbox target users can test before production approval. TikTok LIVE is a separate, best-effort feature.

## Languages and voices

The dashboard's **Language** picker switches your own interface between **English**, **Français**, **Español**, **Deutsch** and **Português (Brasil)**. This preference is saved in your browser; it does not change another member's dashboard or the server's bot messages.

To change bot messages, select the server and open **Getting started → Server language**. Authorized dashboard members can choose **English** (the default), **Français**, **Español**, **Deutsch**, **Português (Brasil)**, or **Follow Discord** and save. Follow Discord uses the member's Discord language for supported command responses and the server's preferred language for shared notices and panels. Unsupported languages fall back to English. Each server keeps its own preference.

This first translation pass covers the main dashboard navigation and selected setup controls, `/help`, `/dashboard`, `/ping`, voice commands, temporary-room controls, suggestions, confessions, and common access errors. Slash-command descriptions also support French, Spanish, German and Brazilian Portuguese; command names stay unchanged. Some detailed settings, moderation, ticket, community and stream-management messages still appear in English. Member-written messages, creator names, custom panels and staff responses are kept exactly as entered; Cyro does not automatically translate them.

**Speech language is a separate choice.** Cyro has **27 local voices** across English, French, Spanish, German, Brazilian Portuguese, Italian and Hindi. Use **`/ttsvoice`**, type a voice name or language (for example `Deutsch` or `Português`), and select a voice whose language matches the messages you want read aloud. Server staff can also set the default voice under **Music & TTS**. Existing **`/ttsvoice1` through `/ttsvoice12`** shortcuts retain their original English voices and saved preferences. Join a voice channel, use **`/addtts`**, then type normally in that call's chat; **`/stoptts`** ends the session. Changing the dashboard or bot language does not change your voice, and selecting a voice does not translate your text. Voice availability and quality vary by language; the French catalog currently has one female voice. German offers Thorsten (male) and Kerstin (female) using a separate local runtime; Portuguese voices use Brazilian pronunciation. Uninstalled voices are marked unavailable in the dashboard and omitted from command search. The optional speaker prefix follows the voice language, for example “Frosty sagt” in German and “Frosty disse” in Portuguese.

**Support tickets and application forms**

1. Prepare the Discord categories, destination channels, and staff roles first. Give Cyro **View Channel**, **Send Messages**, and **Embed Links** in panel channels. Tickets also need **Manage Channels** and **Manage Roles** in their category; transcript handling needs **Read Message History** and **Attach Files**. Set transcript and application review channel permissions in Discord for the audience you want. Anyone who can read these channels can read the records posted there.
2. Open **Support tickets**, enable support tickets, and choose **Add category** for each topic, such as General Support or Reports. Each has its own Discord category, ticket visibility, support staff roles, transcript channel, open-ticket limit and closing action. **Use Discord category permissions** copies the category's access rules when each ticket opens and adds access for the opener and Cyro. The ticket does not stay synced to its category; later category permission changes do not automatically update existing tickets. This is the default for new categories, including when other settings are copied from an existing setup. Support staff roles authorize ticket actions; give them channel access through Discord when using category permissions. Choose **Private ticket** to give access to the opener and support staff while restricting other members; Discord administrators retain access. Existing configurations without a visibility setting stay private until you change them. Under **After saving the transcript**, choose **Delete the ticket channel** or **Keep a read-only channel**. Existing configurations keep archive behavior until changed; new named categories start with deletion selected. Deletion also needs **Manage Threads** and **Manage Webhooks** so Cyro can check for history or message sources outside its transcript. Server administrators may need to update Cyro's permissions after this upgrade.
3. Open **Applications**, enable applications, and choose **Add form** for each application type. Set its review channel, reviewer roles, optional role on acceptance, and one to five questions (100 characters each). Channel permissions decide who can read submitted answers; reviewer roles decide who can accept or deny applications. An acceptance role must be a regular role below Cyro without moderation or management permissions. Cyro needs **Manage Roles** to grant it.
4. Under **Member panels**, choose **Add panel**. Set an internal name, public title and message, then choose **Buttons** or **Dropdown menu**. Select the categories or forms to include and edit their member-facing labels. You can create separate panels for different channels. Review copied defaults when adding categories or forms, especially staff access.
5. Click **Save changes**. After saving, reopen the panel if needed, choose **Publish in channel**, and click **Publish to Discord**. Follow **Open in Discord** to check the result. At least one included option must accept new requests.

You can configure up to 25 ticket categories, 25 application forms, and 25 saved panels total per server. Ticket panels and application panels are separate. Every publish creates a new message; saved edits do not redraw old messages. Remove obsolete messages in Discord. Deleting a saved panel also leaves its posted messages behind, with unusable controls.

Existing requests retain their saved staff access and settings; category/form changes apply to new requests. Changing ticket visibility here does not rewrite existing ticket channels or move existing application submissions. Manage existing channel permissions in Discord. Older requests without saved settings may need to be closed or reviewed before changing their staff roles or review channel. If publishing times out, check Discord before retrying to avoid duplicate messages.

Closing automatically saves an HTML transcript under `DATA_DIR/ticket-transcripts/<guild-id>/` and sends a copy to the configured transcript channel before any channel deletion. Large transcripts may be gzip-compressed. The export follows message history to its end within bounded limits; it never silently deletes a channel after exporting only the last 1,000 messages. Failed or incomplete exports retain the channel for staff review. Separate threads and webhooks prevent automatic deletion. Transcripts preserve available message text, embed text and attachment links, not original attachment files; Discord links can expire, so download important original files before closing. Keep the private host transcript directory in backups. The Recent tickets table links to saved transcript messages when available.

Stickers, polls, forwarded messages and rich component messages also prevent automatic deletion because their full content is not represented in the HTML export. Staff can use `/ticket close keep_channel:true` to save an explicitly marked transcript and keep the original channel as a read-only archive. Avoid editing messages as an administrator while an export is running; Discord does not provide an atomic channel snapshot.

**Welcome and goodbye image cards**

Open **Welcome & roles** to choose the join and leave display formats separately: text, an image card, or both. Departure announcements can also be disabled. Card settings include a heading, accent color and background preset; the card includes the member's display name/avatar and server information. Preview changes, then save. Existing servers retain text announcements until a card format is selected.

Cyro needs **Attach Files** in the welcome channel for image cards. Images are generated on the bot host using a bundled font; only Discord avatar images are fetched. If image rendering fails, Cyro falls back to the configured text so the event can still be announced.

**Member verification**

1. Create a regular **Verified** access role below Cyro, without management or moderation permissions. Do not give it automatically on join or through self-role buttons.
2. Configure Discord permissions: on normal member categories/channels, deny **View Channel** to `@everyone` and allow it for the verified role. Keep the verification channel visible to new members. Check unsynced channels and other role/member overrides that might already allow access. Cyro awards the role; it does not rewrite permissions or guarantee that your channels are gated.
3. Give Cyro **Manage Roles**, plus **View Channel**, **Send Messages**, **Read Message History**, **Embed Links**, **Attach Files**, and **Add Reactions** in the verification channel.
4. Open **Verification**, enable it, select the channel and role, and choose the method. **React with a check mark** grants access after a ✅ reaction; it is an opt-in without a CAPTCHA. **Image challenge + button** asks the member to read a private six-character image and enter its code. It expires after five minutes and allows three attempts. Letters are case-insensitive; members who cannot read it should contact staff.
5. Save, then click **Publish verification panel**. Members must complete any Discord membership screening first. For reaction mode, they may need to remove and re-add their reaction afterward.

Only the latest published verification panel is active. Republish after changing its channel, role, or method and remove old messages. Test with an ordinary unverified member: they should see verification, gain the role after completing it, and then see member channels. The image challenge adds a hurdle for automated joins; it is not a guarantee against abuse.

**Creator-linked YouTube notifications**

1. When ready, enable YouTube Data API v3 in Google Cloud and create an API key restricted to that API. The bot owner must add `YOUTUBE_API_KEY` privately to the existing hosted environment and restart Cyro. Preserve existing credentials and stored data. See [Google's setup guide](https://developers.google.com/youtube/v3/getting-started).
2. In **Creators & alerts**, create or edit a creator profile and optionally enter their Discord member ID. Use **Add platform** to connect YouTube with an `@handle`, channel ID, or supported YouTube channel URL. Each account belongs to a creator profile; linked accounts share that creator's identity and Discord member.
3. Configure **Announce when live** and its channel, title filter, message, and optional ping/live roles. A role while live requires a linked Discord member.
4. Under **Uploaded videos**, enable **Announce new uploaded videos** and select its channel, optional role to notify, **Video title filter**, and message. The upload filter matches text anywhere in the title, ignoring case. Save or connect the account.

Live and upload alerts have independent switches, destinations, filters, messages, and ping roles. Turning live alerts off leaves upload settings unchanged. Public videos and Shorts can produce upload alerts; upcoming streams, active streams, and archived live broadcasts are excluded.

The first successful upload check establishes a baseline without posting old videos. Enabling uploads again or moving the upload destination establishes a new baseline. Changing the title filter does not backfill previously filtered videos. Checks are periodic, so announcements are not immediate. If the dashboard reports an unconfirmed send, inspect Discord; Cyro will not automatically resend it.

Upload message placeholders are `{creator}`, `{member}`, `{username}`, `{platform}`, `{title}`, `{url}`, `{publishedAt}`, and `{role}`. `{member}` displays the linked member mention without automatically pinging them. Use `{role}` with the configured upload notification role for role notifications.

**TikTok availability**

Add TikTok to a creator profile to configure LIVE alerts. LIVE detection uses an unofficial connector and may fail because of TikTok changes, restrictions, or hosting-network blocks. It is best effort, even when the dashboard accepts the account.

**Official TikTok public-video connections**

1. In TikTok for Developers, enable **Login Kit**, Web, and exactly `user.info.basic` and `video.list`. Register `https://YOUR_DOMAIN/auth/tiktok/callback`. Use your own public `/privacy` and `/terms` pages, with accurate operator details, for the policy URLs. The Discord callback remains separate.
2. Add the matching application's `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` privately to the bot host's existing `.env`, then restart the bot. Preserve its other settings. For sandbox testing use that sandbox's credentials and add a TikTok account you own as a target user. Production credentials need TikTok approval before general public use.
3. A manager adds TikTok to a creator profile and links the creator's **Discord member ID**. The creator visits **Creator connections** at `https://YOUR_DOMAIN/connections`, signs in with that Discord account, and chooses **Continue with TikTok**. Managers cannot grant access to another creator's TikTok account. Share the creator link from the account editor if helpful.
4. The creator approves basic profile and public-video access on TikTok, returns to Cyro, and checks the connected display name and **Show recent public videos**. The manually entered LIVE handle is separate: these scopes do not verify it. No posting permission, private videos, follower statistics, or TikTok LIVE analytics are requested by this connection.
5. The manager enables **Announce new uploaded videos**, chooses a channel, optional title filter/role/message, and saves. Only future videos after the baseline are announced. The API checks up to the latest 20 public videos about every five minutes per authorized account; a long outage or very high posting volume can miss uploads beyond that window.
6. Creators can disconnect each server from Creator connections, including an old connection after leaving a server or profile removal. Other approved server connections stay active. The last disconnect deletes stored credentials and attempts provider revocation; if TikTok is unavailable, remove Cyro in TikTok's connected-app settings. Existing Discord posts remain.

Private credentials are stored in `DATA_DIR/tiktok-connections.json`, with restrictive host file permissions and atomic writes. Include this file in private backups; never serve, publish, or attach it to an issue. Keep one active bot process for this data directory. Removed-guild retention includes these bindings.

Application review still requires a real sandbox demonstration of login, profile identity, public videos and disconnect. Do not use offline UI fixtures as review evidence. See [TikTok's Display API requirements](https://developers.tiktok.com/docs/en/display-api-get-started) and [review guidelines](https://developers.tiktok.com/docs/en/app-review-guidelines).


## Cyro 2.7: server customization, publishing and access

**Welcome & roles → Make it yours:** edit or hide every card line using `{user}`, `{server}` and `{count}`. Set separate join/leave headings and footers, a name line, subtitle and branding. Choose a custom solid background or preset; set heading/avatar, main text, secondary text and bar colours. Put the accent bar on the left or top, or hide it. Toggle the avatar, divider and background decoration independently. Save to apply only to this server. Images are generated locally; arbitrary remote card backgrounds are not fetched.

**Channel messages:** choose a text/announcement channel and compose text, one rich embed, or both. Embeds support title/link, author, description, fields with optional inline layout, footer, image/thumbnail HTTPS URLs, and an optional colour bar. Review the preview and selected channel before publishing. No mentions notify members. Preview uses literal text and URL labels; Discord renders markdown and linked images. Recent posts link to Discord.

**Polls:** choose a regular text channel, a question, 2–10 distinct answers, 1–768 hours and single/multiple choice. Cyro needs Send Polls, View Channel and Send Messages. Results are in the Discord poll; questions/answers cannot be edited after posting. End a Cyro-created poll early from publishing history (Read Message History is needed to fetch it). `/poll` and `/embed` open the corresponding dashboard builders and require dashboard access to use the forms.

Publishing saves a private durable receipt before sending, suppresses pings, and uses a Discord nonce for retry protection. A repeated request returns its original receipt; uncertain sends are not automatically repeated, including after restart. Check the channel if a send has an unknown outcome. `DATA_DIR/control.json` retains access rules and up to 300 sent receipts plus up to 100 pending receipts per guild; include it in backups. Receipts store channel/message/actor identifiers, timestamps, a short title and a content hash, not a full draft or voter list. Discord retains the actual message and poll results. Guild retention covers this store.

**Access & commands:** only the current Discord server owner can save access rules. By default Manage Server/Administrator retains dashboard access. The owner can disable that default and grant additional named roles. Dashboard roles can view server records, change settings and publish; they cannot edit access policy. The owner always retains access. Grants stay local to each server and membership/roles are refreshed on requests.

Set roles for each slash command; an empty selection preserves its default rules, and a selected list restricts it to those roles plus the owner. Platform management and role-panel commands support delegated role grants without Manage Server. Moderation, support recovery and staff ticket actions still require their existing Discord/staff permissions. These lists affect slash commands; panel buttons retain their saved staff/member access rules. Discord Server Settings → Integrations may additionally restrict command visibility. Dashboard access and command access are separate.

Access roles cannot be used for automatic welcome roles, self roles, verification, application rewards, live-stream roles or status rewards. Existing automatic role sources must be removed before an owner grants that role access, and every automatic role-delivery path rechecks this restriction.

Discord references: https://docs.discord.com/developers/resources/poll and https://docs.discord.com/developers/resources/message (checked 2026-10-12).

## Cyro 2.8: readable ticket names and staff invite history

New ticket channels use the ticket category's visible name and the member's server display name, such as `general-support-member`. Duplicate names receive a short sequence suffix (`-2`, `-3`). Internal recovery IDs remain in the channel topic and private records. On startup, Cyro safely renames up to 100 tracked open legacy channels per server when their original generated name and ticket topic still match; it leaves custom-renamed, closed, unknown and interrupted channels alone. Owner name changes or missing members can prevent a legacy match.

Open **Invites & levels → Staff invite logger**, enable **Log joins and departures**, and save. **Run an invite challenge** can stay off. Logging by itself never awards challenge points. Optionally select a regular text channel for copies and choose its audience with Discord channel permissions; leaving **Dashboard only** retains records solely in the private dashboard. Cyro needs Manage Server to read invite-use counts, plus View Channel, Send Messages and Embed Links in the optional log channel. The owner can grant staff dashboard access under **Access & commands**.

The searchable history shows joins/departures, member names and IDs, inviter, invite code, destination channel and time when known. It retains the most recent 1,000 events per server and displays the newest 250; refresh to load new events and filter by member/inviter/code or event type. A departure refers to the last recorded join source, not a new invite. It does not backfill earlier activity. Turning logging off retains prior history and stops new log entries.

Discord does not provide a join's invite code directly. Cyro compares invite-use counts; simultaneous joins, missing baselines, disappeared links, vanity links or unavailable counts can produce an explicit unknown source. An invite cannot reveal the external website where it was clicked. Invite logs are saved before optional Discord delivery; failed or uncertain channel sends are not automatically replayed. Discord log messages suppress pings. Keep `community.json` in private backups; removed-server retention covers the log. Channel visibility is controlled by Discord permissions and must be configured by the server staff.

## Cyro 2.9: a different bot appearance in each server

Open **Bot appearance** under **Server management**. Give Cyro a nickname of up to 32 characters and upload a PNG, JPEG or WebP picture up to 2 MB and 4096 × 4096 pixels. A square image works best in Discord's circular avatar. Review the preview, then choose **Save to Discord**. The default-name and default-picture buttons only change the draft until you save.

The settings apply to Cyro's member profile in the selected Discord server. Other servers, direct messages, the application name and Cyro dashboard branding keep their own identity. Discord stores the profile across bot restarts; Cyro does not save a separate uploaded picture in its data files. Reload from Discord to see the current profile or verify an update whose result could not be confirmed.

The server owner and people with dashboard access can edit this profile. Membership and dashboard permissions are checked again before saving. Cyro needs **Change Nickname** for name changes; new install links request that permission. On existing installations, staff can enable it on Cyro's Discord role. Picture changes remain available when that permission is missing. No Administrator or Manage Nicknames permission is requested for this feature.

Discord reference: https://docs.discord.com/developers/resources/guild#modify-current-member (checked 2026-10-12).

## Cyro 2.10: suggestions and voting

Open **Suggestions** in the dashboard, choose a suggestions channel, enable the board, and save. Cyro needs **View Channel**, **Send Messages**, **Embed Links**, and **Read Message History** there. Settings, suggestion numbers, history and votes are separate for every server. Existing servers start with suggestions disabled.

Members use **`/suggestion`** and write their idea in the form (up to 2,000 characters). Cyro posts a numbered embed with **Upvote**, **Downvote**, and **Remove vote** buttons. There is one vote per member; choosing a different button replaces their previous vote. Votes are not anonymous to the bot operator, but public posts and dashboard responses show only totals. Creating an idea requires channel access and Send Messages; voting requires channel access. Membership screening must be complete. The server owner can restrict the slash command to selected roles under **Access & commands**; those restrictions do not change voting permissions.

The default cooldown is five minutes between suggestions from the same member. Set it from 0 to 1,440 minutes. Turning suggestions off pauses submissions and voting while keeping the saved history. Staff with dashboard access can **accept**, **decline**, or **close** a confirmed suggestion and add an optional public note up to 1,000 characters. A final response ends voting and cannot be changed. Use the history's page controls to reach older suggestions; the status filter applies to the current page.

Votes and staff responses are saved before updating the Discord message. If the message update fails, Cyro keeps the saved totals and retries safe message edits. If a new post's delivery cannot be confirmed, it remains visible as unconfirmed in the dashboard and is never automatically posted again. Check Discord before making another suggestion. Deleted or inaccessible Discord messages cannot be updated until access is restored, where applicable.

`DATA_DIR/suggestions.json` stores settings, author information, suggestion text, voting records, delivery receipts, and staff responses. Include it in private backups. Storage is bounded to 1,000 suggestions per server and 10,000 voter records per suggestion. Older completed, fully synchronized suggestions can be removed from bot storage when more room is needed; open ideas and uncertain operations are not silently discarded. The dashboard pages contain 100 suggestions each and exclude voter identities. Removed-server retention includes this store; Discord messages are retained separately by Discord.

Discord interaction response and message nonce behavior were checked against the official [interaction documentation](https://github.com/discord/discord-api-docs/blob/main/developers/interactions/receiving-and-responding.mdx) and [message documentation](https://github.com/discord/discord-api-docs/blob/main/developers/resources/message.mdx) on October 12, 2026.


## Cyro 2.11: custom status rewards

Open **Status roles** in the dashboard. Choose the custom status text (up to 128 characters), a dedicated reward role, **Contains this text** or **Exactly this text**, and whether capitalization must match. Enable and save the rule separately for each server. The sample preview checks the text without changing Discord. Cyro grants the role when an online member's custom status matches and removes its own assignment when the status no longer matches. Games, music, streaming activities and About Me text do not qualify.

Create a cosmetic role below Cyro's highest role and give Cyro **Manage Roles**. Managed roles, dangerous moderation/administration roles and roles granting dashboard or command access cannot be rewards. Members must finish Discord membership screening. Use a dedicated role: a role the member already had is not adopted or later removed by this feature. Disabling or changing the role cleans up tracked assignments in the background. If a managed reward becomes unsafe or uneditable, cleanup waits and the dashboard shows a warning; correct its permissions or position first.

**Bot operator setup:** enable **Presence Intent** in Discord Developer Portal → Cyro → Bot → Privileged Gateway Intents, save, then restart Cyro. Cyro checks its own application's permission flags before requesting this intent. If permission is absent or cannot be checked, the existing bot starts without status tracking and the dashboard prevents enabling this feature. No new environment secret is needed. Discord may require privileged-intent review depending on the application's reach; follow its current portal instructions.

**Offline and privacy behavior:** the default keeps existing assignments when a member is offline, invisible, or no presence is available. Choose **Remove the role while offline or invisible** to remove tracked roles when Discord explicitly reports that state. Missing or unknown presence is always left unchanged. Online members with no visible custom status are treated as non-matches. Discord profile privacy can hide custom statuses from bots, so Cyro cannot distinguish that from clearing the status. Rewards apply only to statuses Discord actually provides.

Changes and recovery use individual-role operations, durable receipts and current permission checks. Only this feature's assignments are managed; other member roles are not replaced. Most status changes are event-driven; bounded background passes retry missed or interrupted changes. A restart or a large server can take longer to reconcile. A status change made while the bot is disconnected cannot be observed until Discord provides a current presence.

`DATA_DIR/status-roles.json` stores per-server rules and assignment receipts, without raw member status histories. Include it in private backups; removed-server retention covers it. The dashboard shows aggregate assigned/pending counts, not member status text. Test using an ordinary member: set matching text, verify the role, replace or clear the status, and verify removal; also check the selected offline behavior.

References checked October 12, 2026: [Discord presence updates and profile privacy](https://github.com/discord/discord-api-docs/blob/main/developers/events/gateway-events.mdx), [application flags](https://docs.discord.com/developers/resources/application), and [privileged intent setup](https://support-dev.discord.com/hc/en-us/articles/6205754771351-How-do-I-get-Privileged-Intents-for-my-bot).

## Cyro 2.11.1: embedded member panels

Verification panels now publish an icy-blue embed with the configured title and message. Cyro does not append a second paragraph of public instructions: include your desired reaction/button instructions in **Panel message**. The verification dashboard previews the title and message and links to the current published panel. Reactions and the Verify button remain outside the embed as Discord controls; verification and role checks are unchanged. Cyro needs **Embed Links** in the destination channel.

The public `/roles-panel` and legacy `/ticket panel` also use embedded cards. Modern ticket/application dashboard panels already use embeds. Existing posts are not automatically replaced on restart. Welcome text/image preferences, private responses and quick counting feedback retain their configured behavior.
## Cyro 2.12 — Music, TTS and anonymous confessions

Music & TTS is available in the dashboard. Join a regular server voice channel and use `/playmusic link:<YouTube or direct audio URL>` to queue MP3, WAV, OGG, FLAC, AAC and compatible direct media/radio streams. Use `/musicqueue`, `/skipmusic` and `/stopmusic`. Cyro joins your current call even if the command is used in a different text channel. Single public recorded YouTube videos are also supported when the optional pinned source runtime is installed and YouTube permits access from the host. Cyro validates metadata before joining, enforces the server duration limit, and resolves fresh audio when each queued track starts. Playlists, livestreams and restricted videos are not supported. Spotify does not provide full-track audio for this player; it returns a clear explanation. Late playback failures receive a private command follow-up where Discord permits it. Queues hold up to 25 waiting tracks and are discarded on restart. Server admins control music/TTS availability, volume and maximum track length. The decoder also has a hard 30-minute/64 MiB source limit.

Turn on **Say the speaker’s name** to hear a short prefix such as “Frosty said:” before each message. This option starts off and is saved per server. It uses the member’s server display name (with a username fallback) and the same personal voice as their message. Name announcements do not reduce the existing 400-character message allowance. Save the setting; it also applies to the current TTS session.

`/addtts` starts a separate TTS session in your current call. An embed announces that new messages in that call's chat from people in the call will be spoken. No microphone audio is received. `/ttsvoice voice:<choice>` selects one of 25 voices across six languages for that server. `/ttsvoice1` through `/ttsvoice12` retain the six male and six female English voices with British and American accents. These are free Kokoro neural voices generated locally on Cyro’s host. The numbered shortcuts keep their existing IDs; `/ttsvoice1` and the default `voice1` select Daniel (`bm_daniel`). `/stoptts` disconnects. Text is limited to 400 characters, one queued message per member every two seconds, and ten waiting messages; links, mentions and spoilers are not expanded. Messages are not saved as a speech history. One voice channel/mode is supported per server at a time; sessions leave when empty or idle (one minute music, five minutes TTS). Voice role restrictions are under Access & commands; all numbered voice aliases follow the `/ttsvoice` rule.

Confessions start disabled. In Anonymous confessions, select the destination text channel, enable the feature and save. Members use `/confess confession:<text>` (up to 1,500 characters). Cyro sends an anonymous numbered embed and replies privately to the author. The default cooldown is 60 seconds (configurable 10–3,600). Staff remove inappropriate posts directly in Discord. Cyro stores delivery receipts and counts, not authors or confession text; the feature is anonymous to members, not Discord. Cooldowns are in memory and reset on restart. Confessions are not copied into a staff identity log.

Host requirements: Node >=22.12, outbound Discord voice UDP, `@discordjs/voice` with DAVE support, `opusscript`, `ffmpeg-static`, and the optional local Kokoro q8 TTS runtime. Keep npm optional platform dependencies and FFmpeg's install script enabled. Existing servers may need to give Cyro Connect and Speak; TTS also needs View Channel, Send Messages and Embed Links in the call chat. New invite links request Connect/Speak. Voice state events use the standard GuildVoiceStates intent; no additional privileged intent is needed. Include `voice.json` and `confessions.json` in private backups. Audio queues and speech messages are intentionally not restored on startup.


## Cyro 2.13: public homepage

The logged-out homepage now describes the current features, the free-service policy, getting started, platform limitations and support. `/?home=1` opens this public overview even in a signed-in browser; **About Cyro** in the dashboard links to it. The dashboard and creator connections retain their existing access checks.

`GET /api/public/stats` returns only `{serverCount}`. It reads the current Gateway guild cache when the bot is ready and startup reconciliation is complete; otherwise it returns `null`. The page requests the count on load, shows an unavailable state for an unavailable or failed response, and never substitutes demo data or a stale count. Existing rate limits and no-store headers apply. No guild names, IDs, member totals, or private server records are exposed. This is the count for the current single Gateway process; a future multi-process or sharded deployment must aggregate its counts before using this endpoint.

Pricing copy reflects the operator's current intent: all current features are free, with paid options considered only if hosting costs become too expensive to sustain. This does not promise free service forever or change any existing permissions or server configuration.

### Kokoro speech setup

Run `npm run install-voices` to install the pinned runtime and verified model files under `bin/tts`. Run it when upgrading an existing installation too: the new languages require an additional phonemizer package. Verified model weights are reused. Installation needs internet access for packages and model assets. Speech generation itself uses local files and does not send message text to a remote speech service. Keep the runtime/model directory out of Git and code release archives.

Cyro uses one CPU speech worker with a 400-character message limit and bounded model input. Saved server defaults and member preferences keep their stable IDs. The original `voice1`–`voice12` choices retain their meanings. There is no voice-account key or paid TTS subscription to configure. Choose a language in the dashboard, then select from its available male and female voices. The [language and voice list](README.md#languages-and-voices) includes all 25 voices. These numbered shortcuts remain available for English:

| Shortcut | Voice | Accent and type |
| --- | --- | --- |
| `/ttsvoice1` | Daniel (default) | British male |
| `/ttsvoice2` | Michael | American male |
| `/ttsvoice3` | Heart | American female |
| `/ttsvoice4` | Bella | American female |
| `/ttsvoice5` | Fenrir | American male |
| `/ttsvoice6` | Puck | American male |
| `/ttsvoice7` | George | British male |
| `/ttsvoice8` | Fable | British male |
| `/ttsvoice9` | Nicole | American female |
| `/ttsvoice10` | Emma | British female |
| `/ttsvoice11` | Aoede | American female |
| `/ttsvoice12` | Sarah | American female |

The startup check verifies English speech through the local audio pipeline. Missing assets or a failed speech check make TTS unavailable; other bot features can start. The model needs more CPU and memory than the former synthetic engine. Check free disk, cold-start time and peak memory on the actual host, including concurrent bot/music activity, before enabling it broadly. A 1 GB allocation alone does not establish usable capacity. Test `/addtts` and the voices your server uses in a real Discord call, including each enabled speech language; a local check does not prove audible Discord playback.

### YouTube music host check

`npm install` attempts an optional checksum-verified yt-dlp installation in `bin/`. The bot still starts if it is unavailable. Use `npm run install-youtube` to retry installation, then `npm run build` and `npm run check-youtube` for a credential-free source test. Keep `bin/` out of the source repository. The installation probe records only diagnostic flags for a public Blender CC BY sample; no user music, cookies or platform credentials are used. Source access does not prove a Discord call can receive sound.


## Community tools and getting started (2.19)

Use `/help` for a member command guide or `/dashboard` for server settings. The Getting started page explains setup and links to each feature. `/ping` reports Discord connection latency.

### Temporary voice rooms

In **Temporary voice**, select a normal voice lobby and destination category, choose a room name (supports `{name}`), capacity and maximum active rooms, then enable and save. Cyro needs View Channel, Connect, Manage Channels, Manage Permissions and Move Members in the destination category; View Channel, Connect and Move Members in the lobby. New rooms inherit the category's visibility. Later category edits do not automatically sync to existing rooms.

Joining the lobby makes one room per member and moves them into it. Joining again returns them to their room. Open the voice room's text chat for its **Lock**, **Unlock**, **Rename** and **Member limit** buttons. Rename opens a short form; member limits accept 1–99 people or 0 for no limit. Cyro needs Send Messages, Embed Links and Read Message History there to maintain the panel. Members need View Channel and Read Message History to find it. A missing panel does not prevent voice-room creation or the existing commands from working.

**Allow member** and **Remove member** open private, searchable member pickers. Allow member grants one current server member access while the room is locked, provided they already have access to the category. Remove member disconnects one participant from this room; it does not kick them from the server, ban them or prevent rejoining if they still have access. Use `/room revoke` to block future joins. Regular room owners cannot disconnect server owners, administrators or staff with Manage Channels. Cyro needs Move Members in the room. Pickers expire after a short time; reopen the button if needed. Existing panels update in place after a bot update.

Owners must stay connected to the room to use its panel. The same checks apply to buttons, submitted forms and `/room info`, `/room name`, `/room limit`, `/room lock`, `/room unlock`, `/room permit` and `/room revoke`. Staff with Manage Channels can control a room they have joined. Locks prevent new joins, do not disconnect current participants and cannot block Discord administrators. Owner controls are optional; no server-wide management permission is granted. Empty rooms are removed after a short grace period, together with their chat and panel. Disabling creation still lets tracked empty rooms be cleaned up.

### Bug reports

In **Bug reports**, create categories such as Bot issues or Server issues and select a destination text channel for each. Enable reports and save. `/bugreport` opens a form; its optional category supports autocomplete. Reports include the member's Discord identity and are visible to that channel's audience and authorized dashboard staff. Choose public or private channels to suit your server. Reports are not anonymous.

Staff can use report buttons or the dashboard to set Open, In progress, Resolved or Dismissed. There are up to 10 categories and 1,000 retained reports per server; completed reports are evicted first. If all slots contain active or unconfirmed work, new submissions pause until staff resolve reports. Unconfirmed delivery is never blindly posted again; check the destination channel before resubmitting.

### Sticky messages

In **Sticky messages**, add an embed and select a channel, message threshold and minimum delay (at least 30 seconds). Saving does not post; the sticky refreshes after new human messages meet both thresholds. Cyro removes only its own previous tracked sticky. Disabling or removing a sticky cleans up its tracked post. Up to 10 are supported per server. Delivery references allow recovery after restart without reposting an uncertain send.

### Staff activity, suggestions and polls

Staff activity includes manual warnings, timeouts, kicks, bans and purges, application reviews, ticket claims and closures. Automatic filters do not count. Current assigned tickets are shown separately from the selected 7-day, 30-day or retained-history window. Average claim and closure times start at ticket creation; counts reflect activity, not quality. Search by staff name or ID and sort by the metric you need.

Suggestions use the existing `/suggestion` form and voting buttons; admins select its channel and record decisions. Polls use Discord's native voting through the dashboard builder (`/poll`).

New tools default to off. Settings, reports and temporary-room receipts remain guild-scoped and follow the existing 30-day removal retention process. Deploying this release does not change existing channel permissions.
