import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { openAudioStream, openYouTubeAudioStream } from './urls.js';
import { synthesizeSpeech, TTS_VOICES } from './tts.js';
import { parseYouTubeUrl, resolveYouTubeSource, YouTubeSourceError } from './youtube.js';

export interface AudioSource { stream: Readable; title: string; cleanup: () => void }
export interface MusicSourceOptions { signal?: AbortSignal; maxDurationSeconds?: number }
const require = createRequire(import.meta.url);
let activeDecoders = 0;
function ffmpegPath(): string {
  const path: unknown = require('ffmpeg-static');
  if (typeof path !== 'string' || !existsSync(path)) throw new Error('The music decoder is not installed on this host. Ask an administrator to finish the FFmpeg setup.');
  return path;
}
export function audioAvailable(): boolean {
  try { ffmpegPath(); return true; } catch { return false; }
}

/** Decodes a byte stream to 48 kHz stereo signed 16-bit PCM. FFmpeg has no network/file input access. */
export async function decodeAudio(input: Readable, title: string, options: MusicSourceOptions = {}, cleanupInput: () => void = () => input.destroy()): Promise<AudioSource> {
  options.signal?.throwIfAborted();
  const executable = ffmpegPath();
  if (activeDecoders >= 8) { cleanupInput(); throw new Error('Cyro is already playing in several calls. Try again shortly.'); }
  const duration = Math.min(1_800, Math.max(1, options.maxDurationSeconds ?? 900));
  const child = spawn(executable, [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-threads', '1', '-filter_threads', '1',
    '-max_alloc', '33554432', '-probesize', '1048576', '-analyzeduration', '3000000',
    '-protocol_whitelist', 'pipe', '-format_whitelist', 'mp3,wav,ogg,flac,aac,mov,matroska,webm',
    '-i', 'pipe:0', '-vn', '-sn', '-dn', '-t', String(duration), '-ac', '2', '-ar', '48000', '-f', 's16le', 'pipe:1',
  ], { stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true, shell: false });
  activeDecoders++;
  const stream = child.stdout;
  let cleaned = false;
  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    clearTimeout(lifetime);
    options.signal?.removeEventListener('abort', abort);
    input.unpipe(child.stdin);
    cleanupInput();
    child.stdin.destroy();
    stream.destroy();
    if (child.exitCode === null) child.kill('SIGKILL');
  };
  const fail = (message: string): void => { stream.destroy(new Error(message)); };
  const abort = (): void => fail('Audio playback was cancelled.');
  const lifetime = setTimeout(() => fail('Audio reached the maximum playback time.'), duration * 1_000 + 20_000);
  lifetime.unref();
  options.signal?.addEventListener('abort', abort, { once: true });
  // No child or stream error may escape unhandled while the Discord audio resource is being created.
  stream.on('error', cleanup);
  stream.once('close', cleanup);
  input.on('error', () => fail('The music stream ended unexpectedly.'));
  child.stdin.on('error', () => { if (!cleaned && child.exitCode === null) fail('The audio decoder stopped accepting data.'); });
  child.once('error', () => fail('The audio decoder could not start.'));
  child.once('close', code => {
    activeDecoders--;
    if (!cleaned && code !== 0) fail('This audio format could not be played. Use a direct MP3, WAV, OGG, FLAC or AAC stream.');
  });
  input.pipe(child.stdin);
  try {
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error): void => {
        clearTimeout(startTimeout);
        stream.removeListener('readable', ready);
        stream.removeListener('error', failed);
        stream.removeListener('close', closed);
        if (error) reject(error); else resolve();
      };
      const ready = (): void => { if (stream.readableLength > 0) finish(); };
      const failed = (error: Error): void => finish(error);
      const closed = (): void => finish(new Error('This link did not contain playable audio.'));
      const startTimeout = setTimeout(() => finish(new Error('The audio decoder took too long to start.')), 12_000);
      startTimeout.unref();
      stream.on('readable', ready);
      stream.once('error', failed);
      stream.once('close', closed);
      if (options.signal?.aborted) abort();
      ready();
    });
    return { stream, title, cleanup };
  } catch (error) { cleanup(); throw error; }
}

export async function loadMusicSource(url: string, options: MusicSourceOptions = {}): Promise<AudioSource> {
  if (parseYouTubeUrl(url)) {
    // A queue contains only the canonical page URL. Signed media URLs are resolved when playback starts.
    const youtube = await resolveYouTubeSource(url, options);
    let download;
    try { download = await openYouTubeAudioStream(youtube.mediaUrl, { signal: options.signal }); }
    catch { throw new YouTubeSourceError('YouTube refused or could not deliver this audio from Cyro’s host. Try another video or a direct audio link.'); }
    try { return await decodeAudio(download.stream, youtube.title, options, download.cleanup); }
    catch (error) { download.cleanup(); throw error; }
  }
  const download = await openAudioStream(url, { signal: options.signal });
  const title = `Music from ${download.url.hostname}`;
  try { return await decodeAudio(download.stream, title, options, download.cleanup); }
  catch (error) { download.cleanup(); throw error; }
}

export async function pcmSpeech(text: string, voiceId: string = 'voice1', signal?: AbortSignal): Promise<AudioSource> {
  const wav = await synthesizeSpeech(text, voiceId, signal);
  const voice = TTS_VOICES.find(item => item.id === voiceId)!;
  return decodeAudio(Readable.from([wav]), `${voice.name} TTS`, { signal, maxDurationSeconds: 90 });
}
