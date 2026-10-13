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
| ONNX Runtime | 1.21.0 | MIT | [ONNX Runtime 1.21.0 license](https://github.com/microsoft/onnxruntime/blob/v1.21.0/LICENSE) |
| Kokoro-82M-v1.0 ONNX model and supplied voices | `1939ad2a8e416c0acfeecc08a694d14ef25f2231`; q8 | Apache-2.0 | [ONNX model card](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) |

The selected voice assets are `bm_daniel`, `am_michael`, `af_heart` and `af_bella`. The phonemizer includes eSpeak NG code: preserve its own [GPL license and source notices](https://github.com/espeak-ng/espeak-ng/blob/master/COPYING) when distributing a built runtime. The wrapper’s Apache label does not relicense that embedded engine. Preserve model, runtime, transitive dependency and native-library notices alongside packaged installations, including container images. The runtime uses locally installed assets for speech; downloading those assets does not send chat text to their publishers.

## Optional YouTube source runtime

The installer fetches the official yt-dlp 2026.08.19 binary and verifies its SHA-256 against a pinned value and the upstream release manifest. Binaries are not committed here. yt-dlp and its bundled components retain their upstream licenses; consult the exact [release files](https://github.com/yt-dlp/yt-dlp/releases/tag/2026.08.19) and [license information](https://github.com/yt-dlp/yt-dlp#license) before distributing a packaged runtime. The diagnostic uses a small fragment of Big Buck Bunny, copyright 2008 Blender Foundation, under [CC BY 3.0](https://peach.blender.org/about/), without saving the media.
