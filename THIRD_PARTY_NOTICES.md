# Third-party notices

Cyro's project license does not replace the licenses of fonts, dependencies, media engines or their transitive components. This repository contains source, web assets and a dependency lockfile. It does not vendor `node_modules`, FFmpeg executables, eSpeak/WASM binaries or compiled installers.

## Included font and artwork

`public/fonts/Manrope.ttf` is distributed under the SIL Open Font License 1.1. Copyright 2018 The Manrope Project Authors. The complete required notice is retained at [public/fonts/OFL-Manrope.txt](public/fonts/OFL-Manrope.txt). [Upstream Manrope project](https://github.com/googlefonts/manrope).

`public/cyro-logo.png` is the Cyro project logo, created for Headache Development using an image-generation tool. `public/favicon.svg` is the project's accompanying icon. The official hosted service is operated by Headache Development; a separate deployment should clearly identify its own operator rather than imply official-service status.

## Direct runtime dependencies

These versions and declared package licenses are recorded from the dependency manifests used for this source export. `package-lock.json` records the complete resolved dependency tree. Installations fetch packages with their own notices and license texts; preserve those when distributing a packaged runtime.

| Package | Version | Declared package license | Source |
| --- | --- | --- | --- |
| @discordjs/voice | 0.19.2 | Apache-2.0 | [discord.js](https://github.com/discordjs/discord.js) |
| @napi-rs/canvas | 1.0.11 | MIT | [canvas](https://github.com/Brooooooklyn/canvas) |
| discord.js | 14.27.0 | Apache-2.0 | [discord.js](https://github.com/discordjs/discord.js) |
| dotenv | 16.6.1 | BSD-2-Clause | [dotenv](https://github.com/motdotla/dotenv) |
| ffmpeg-static | 5.3.0 | GPL-3.0-or-later | [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) |
| opusscript | 0.1.1 | MIT | [opusscript](https://github.com/abalabahaha/opusscript) |
| proper-lockfile | 4.1.2 | MIT | [node-proper-lockfile](https://github.com/moxystudio/node-proper-lockfile) |
| text2wav | 0.0.14 | MIT wrapper; embedded engine has separate licensing | [text2wav.node.js](https://github.com/abbr/text2wav.node.js) |
| tiktok-live-connector | 2.4.2 | AGPL-3.0-only | [TikTok-Live-Connector](https://github.com/zerodytrash/TikTok-Live-Connector) |

## Audio engines and redistribution

`ffmpeg-static` downloads a platform-specific FFmpeg build during installation. The binary's own license and enabled components matter independently of the JavaScript package label. Its installed distribution includes a license/readme alongside the binary. Consult [FFmpeg's licensing information](https://ffmpeg.org/legal.html) and the exact binary producer's notices/source instructions before distributing executables or container images.

`text2wav` includes compiled eSpeak NG code and voice data in its npm package. Its own MIT wrapper license does not erase the engine's license. The installed generated engine identifies eSpeak NG commit `e13b602ce0bd81bb5b84f03631819fb2820fe19f`; the [eSpeak NG source project](https://github.com/espeak-ng/espeak-ng) provides its source and license. The [text2wav build instructions](https://github.com/abbr/text2wav.node.js#under-the-hood) describe compilation and voice data.

`opusscript` includes compiled libopus code; Canvas and Discord voice also resolve platform or native/transitive dependencies. Review their installed notices as part of distributing a built application. The table is an attribution aid, not an exhaustive legal analysis or a statement that every component shares one license. In particular, the GPL and AGPL components must not be relabelled as MIT merely because a separate file in this project uses that license.

## Optional YouTube source runtime

The installer fetches the official yt-dlp 2026.08.19 binary and verifies its SHA-256 against a pinned value and the upstream release manifest. Binaries are not committed here. yt-dlp and its bundled components retain their upstream licenses; consult the exact [release files](https://github.com/yt-dlp/yt-dlp/releases/tag/2026.08.19) and [license information](https://github.com/yt-dlp/yt-dlp#license) before distributing a packaged runtime. The diagnostic uses a small fragment of Big Buck Bunny, copyright 2008 Blender Foundation, under [CC BY 3.0](https://peach.blender.org/about/), without saving the media.
