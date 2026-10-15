# Third-party notices

Cyro's project license does not replace the licenses of fonts, dependencies, media engines or their transitive components. This repository contains source, web assets and a dependency lockfile. It does not vendor `node_modules`, FFmpeg executables, neural model weights, eSpeak/WASM binaries or compiled installers.

## Included font and artwork

`public/fonts/Manrope.ttf` is distributed under the SIL Open Font License 1.1. Copyright 2018 The Manrope Project Authors. The complete required notice is retained at [public/fonts/OFL-Manrope.txt](public/fonts/OFL-Manrope.txt). [Upstream Manrope project](https://github.com/googlefonts/manrope).

`public/cyro-logo.png` is the Cyro project logo, created for Headache Development using an image-generation tool. `public/favicon.svg` is the project's accompanying icon. The official hosted service is operated by Headache Development; a separate deployment should clearly identify its own operator rather than imply official-service status.

## Direct runtime dependencies

These versions and declared package licenses are recorded from the dependency manifests used for this source export. `package-lock.json` records the primary application dependencies; `scripts/kokoro-runtime/package-lock.json` records the separately installed speech runtime. Installations fetch packages with their own notices and license texts; preserve those when distributing a packaged runtime.

| Package | Version | Declared package license | Source |
| --- | --- | --- | --- |
| @discordjs/voice | 0.19.2 | Apache-2.0 | [discord.js](https://github.com/discordjs/discord.js) |
| @napi-rs/canvas | 1.0.11 | MIT | [canvas](https://github.com/Brooooooklyn/canvas) |
| discord.js | 14.27.0 | Apache-2.0 | [discord.js](https://github.com/discordjs/discord.js) |
| dotenv | 16.6.1 | BSD-2-Clause | [dotenv](https://github.com/motdotla/dotenv) |
| ffmpeg-static | 5.3.0 | GPL-3.0-or-later | [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) |
| opusscript | 0.1.1 | MIT | [opusscript](https://github.com/abalabahaha/opusscript) |
| proper-lockfile | 4.1.2 | MIT | [node-proper-lockfile](https://github.com/moxystudio/node-proper-lockfile) |
| tiktok-live-connector | 2.4.2 | AGPL-3.0-only | [TikTok-Live-Connector](https://github.com/zerodytrash/TikTok-Live-Connector) |

## Audio engines and redistribution

`ffmpeg-static` downloads a platform-specific FFmpeg build during installation. The binary's own license and enabled components matter independently of the JavaScript package label. Its installed distribution includes a license/readme alongside the binary. Consult [FFmpeg's licensing information](https://ffmpeg.org/legal.html) and the exact binary producer's notices/source instructions before distributing executables or container images.

`opusscript` includes compiled libopus code; Canvas and Discord voice also resolve platform or native/transitive dependencies. Review their installed notices as part of distributing a built application. The table is an attribution aid, not an exhaustive legal analysis or a statement that every component shares one license. In particular, the GPL and AGPL components must not be relabelled as MIT merely because a separate file in this project uses that license.

## Optional Kokoro speech runtime

The separate `bin/tts` installation uses these pinned components. Their own notices remain applicable; Cyro’s MIT license does not replace them. The installer and its manifest define the exact model revision and file checksums. Model weights and dependency binaries are downloaded for the host and are not committed to this source repository.

| Component | Version | Declared license | Source |
| --- | --- | --- | --- |
| kokoro-js | 1.2.1 | Apache-2.0 | [Kokoro source and license](https://github.com/hexgrad/kokoro) |
| @huggingface/transformers | 3.8.1 | Apache-2.0 | [Transformers.js 3.8.1 license](https://github.com/huggingface/transformers.js/blob/3.8.1/LICENSE) |
| phonemizer | 1.2.1 | Apache-2.0 wrapper; embedded engine has separate licensing | [phonemizer.js](https://github.com/xenova/phonemizer.js) |
| ephone | 1.0.2 | GPL-3.0-or-later | [ephone source and build instructions](https://github.com/sjmik/ephone-js) |
| ONNX Runtime | 1.21.0 | MIT | [ONNX Runtime 1.21.0 license](https://github.com/microsoft/onnxruntime/blob/v1.21.0/LICENSE) |
| Kokoro-82M-v1.0 ONNX model and supplied voices | `1939ad2a8e416c0acfeecc08a694d14ef25f2231`; q8 | Apache-2.0 | [ONNX model card](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) |

The selected voice assets are listed in [src/voice/catalog.ts](src/voice/catalog.ts): twelve English voices and thirteen voices for French, Spanish, Italian, Brazilian Portuguese and Hindi. The phonemizer includes eSpeak NG code: preserve its own [GPL license and source notices](https://github.com/espeak-ng/espeak-ng/blob/master/COPYING) when distributing a built runtime. The wrapper’s Apache label does not relicense that embedded engine.

Non-English speech uses the unmodified, integrity-pinned `ephone` package, authored by sjmik and derived from eSpeak NG. Its full [GPL-3.0-or-later license](scripts/kokoro-runtime/EPHONE-LICENSE.txt) and [runtime source/attribution notice](scripts/kokoro-runtime/THIRD-PARTY-NOTICES.txt) are included here and copied into `bin/tts` by the installer. Its source and complete change history are available at [sjmik/ephone-js](https://github.com/sjmik/ephone-js), with [build instructions](https://github.com/sjmik/ephone-js/tree/master/emscripten). Cyro's MIT license does not relicense this dependency.

Preserve model, runtime, transitive dependency and native-library notices alongside packaged installations, including container images. The runtime uses locally installed assets for speech; downloading those assets does not send chat text to their publishers.

## Optional YouTube source runtime

The installer fetches the official yt-dlp 2026.08.19 binary and verifies its SHA-256 against a pinned value and the upstream release manifest. Binaries are not committed here. yt-dlp and its bundled components retain their upstream licenses; consult the exact [release files](https://github.com/yt-dlp/yt-dlp/releases/tag/2026.08.19) and [license information](https://github.com/yt-dlp/yt-dlp#license) before distributing a packaged runtime. The diagnostic uses a small fragment of Big Buck Bunny, copyright 2008 Blender Foundation, under [CC BY 3.0](https://peach.blender.org/about/), without saving the media.

## Lucide icons

The dashboard and public pages bundle selected icons from `lucide-static` 1.57.0 in `public/icons.svg`. Source: https://github.com/lucide-icons/lucide and https://lucide.dev.

The icons are redistributed under the following upstream license, also preserved in the SVG sprite:

```text
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
