// Reads a small fragment of Blender's CC BY sample only. Does not read .env, save media, or join Discord.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { isIP } from 'node:net';

export async function checkYouTube() {
  const result = { checkedAt: new Date().toISOString(), success: false, metadata: false, audio: false, bytes: 0,
    sample: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', attribution: '(c) copyright 2008, Blender Foundation / www.bigbuckbunny.org', license: 'https://peach.blender.org/about/' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  let download;
  let SourceError;
  let classifyAudioFailure;
  try {
    const sourceModule = await import('../dist/src/voice/youtube.js');
    const { resolveYouTubeSource } = sourceModule;
    SourceError = sourceModule.YouTubeSourceError;
    const networkModule = await import('../dist/src/voice/urls.js');
    const { openYouTubeAudioStream } = networkModule;
    classifyAudioFailure = networkModule.audioFailureDetails;
    const source = await resolveYouTubeSource(result.sample, { signal: controller.signal, maxDurationSeconds: 900 });
    result.metadata = true;
    // Only the family is diagnostic; never expose the signed URL or the host's public address.
    result.sourceIpFamily = isIP(new URL(source.mediaUrl).searchParams.get('ip') ?? '') || null;
    download = await openYouTubeAudioStream(source.mediaUrl, { signal: controller.signal });
    for await (const chunk of download.stream) { result.bytes += chunk.length; if (result.bytes >= 65_536) break; }
    result.audio = result.bytes > 0;
    result.success = result.metadata && result.audio;
  } catch (error) {
    // Only application-authored, user-safe messages may enter the saved probe result.
    if (SourceError && error instanceof SourceError) result.reason = error.message;
    else { result.delivery = classifyAudioFailure?.(error) ?? { code: 'source-fetch-failed' }; result.reason = result.delivery.code; }
  }
  finally { clearTimeout(timer); controller.abort(); download?.cleanup(); }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await checkYouTube(), null, 2));
}
