import { BotMessageError } from '../i18n/index.js';
import { spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parseYouTubeMediaUrl } from './urls.js';

const youtubeHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be']);
const videoId = /^[A-Za-z0-9_-]{11}$/;
const extractorLimit = 2;
let activeExtractions = 0;
const binaryHashes: Record<string, string> = {
  'win32-x64': '66674953fe251b89f4d08c5f0e35e0728679bd67ab3d7d05c0562af101dd3e7a',
  'linux-x64': '58162f9bfdc27458ea47bfcb311cf47028f17d8154a8bf7d689861d46399230a',
  'linux-arm64': 'b16e4dab368a816cd05d477d698a605a6ae87ccee1c8ffd38fa21d7254141fcc',
};
let verifiedBinary: { key: string; trusted: boolean } | undefined;

/** A user-safe source failure. Raw extractor output and signed URLs must never reach Discord or logs. */
export class YouTubeSourceError extends BotMessageError {}
export interface YouTubeSource { url: string; id: string; title: string; titleIsFallback?: boolean; durationSeconds: number; mediaUrl: string }
export interface YouTubeOptions { signal?: AbortSignal; maxDurationSeconds?: number }

/** Only a single explicit video may cross the extractor boundary. All other URL parameters are discarded. */
export function parseYouTubeUrl(value: string): URL | undefined {
  let url: URL;
  try { url = new URL(value); } catch { return undefined; }
  const host = url.hostname.toLowerCase();
  if (!(host === 'youtu.be' || host.endsWith('.youtu.be') || host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com'))) return undefined;
  if (value.length > 2048 || !youtubeHosts.has(host) || url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new YouTubeSourceError('Use an HTTPS link to a single public YouTube video.');
  }
  const segments = url.pathname.split('/').filter(Boolean);
  let id: string | undefined;
  if (host.endsWith('youtu.be') && segments.length === 1) id = segments[0];
  else if (url.pathname === '/watch' && url.searchParams.getAll('v').length === 1) id = url.searchParams.get('v') ?? undefined;
  else if (segments.length === 2 && ['shorts', 'live'].includes(segments[0]!)) id = segments[1];
  if (!id || !videoId.test(id)) throw new YouTubeSourceError('Use a single YouTube video link. Playlists and channel pages are not supported.');
  return new URL(`https://www.youtube.com/watch?v=${id}`);
}

export function youtubeExecutable(): string { return path.resolve('bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'); }
export function youtubeAvailable(): boolean {
  try {
    const executable = youtubeExecutable(), expected = binaryHashes[`${process.platform}-${process.arch}`];
    if (!expected) return false;
    const stat = statSync(executable);
    if (!stat.isFile() || stat.size < 1 || stat.size > 64 * 1024 * 1024) return false;
    const key = `${executable}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.ino}`;
    if (verifiedBinary?.key !== key) verifiedBinary = { key, trusted: createHash('sha256').update(readFileSync(executable)).digest('hex') === expected };
    return verifiedBinary.trusted;
  } catch { return false; }
}

/** Validate only the selected source, never an arbitrary URL supplied by a caller or a playlist entry. */
export function readYouTubeSource(value: unknown, canonical: URL, options: YouTubeOptions = {}): YouTubeSource {
  const info = value as Record<string, unknown> | null;
  if (!info || typeof info !== 'object' || Array.isArray(info) || info.id !== canonical.searchParams.get('v') ||
      info._type && info._type !== 'video' || info.extractor !== 'youtube' || info.entries || info.requested_formats) {
    throw new YouTubeSourceError('YouTube did not return a playable single video.');
  }
  if (info.is_live || ['is_live', 'is_upcoming', 'post_live'].includes(String(info.live_status)) || info.availability && !['public', 'unlisted'].includes(String(info.availability)) || Number(info.age_limit ?? 0) > 0) {
    throw new YouTubeSourceError('Only public, unrestricted recorded YouTube videos are supported. Live or restricted videos cannot play.');
  }
  const duration = Number(info.duration);
  const limit = Math.min(1800, Math.max(1, options.maxDurationSeconds ?? 900));
  if (!Number.isFinite(duration) || duration <= 0) throw new YouTubeSourceError('YouTube did not provide a supported recorded-video duration.');
  if (duration > limit) throw new YouTubeSourceError('That YouTube video exceeds this server’s {minutes}-minute music limit.',{minutes:Math.ceil(limit/60)});
  if (info.protocol !== 'https' || info.vcodec !== 'none' || typeof info.acodec !== 'string' || info.acodec === 'none' || typeof info.url !== 'string') {
    throw new YouTubeSourceError('YouTube did not provide a supported direct audio stream for this video.');
  }
  if (Number(info.filesize ?? info.filesize_approx ?? 0) > 64 * 1024 * 1024) throw new YouTubeSourceError('That YouTube audio exceeds the music size limit.');
  let mediaUrl: URL;
  try { mediaUrl = parseYouTubeMediaUrl(info.url); } catch { throw new YouTubeSourceError('YouTube returned an unsupported media source.'); }
  const title = typeof info.title === 'string' ? info.title.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150) : '';
  return { url: canonical.href, id: String(info.id), title: title || 'YouTube video', ...(!title ? { titleIsFallback: true } : {}), durationSeconds: duration, mediaUrl: mediaUrl.href };
}

/** Child receives neither bot secrets nor proxy, cookie, Python-path, or user configuration environment. */
function extractorEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { PATH: path.dirname(process.execPath), LANG: 'C.UTF-8', PYTHONIOENCODING: 'utf-8' };
  for (const key of ['SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR']) if (process.env[key]) env[key] = process.env[key];
  return env;
}

function extractionFailure(stderr: string): YouTubeSourceError {
  if (/sign in|confirm you.re not a bot|po.?token|HTTP Error (403|429)|too many requests/i.test(stderr)) {
    return new YouTubeSourceError('YouTube is refusing playback from Cyro’s host for this video. Try another source; account or bot-check restrictions are not bypassed.');
  }
  if (/private video|not available|unavailable|age.restricted|members.only|copyright|removed/i.test(stderr)) {
    return new YouTubeSourceError('This YouTube video is unavailable or restricted. Use a public, unrestricted recorded video.');
  }
  return new YouTubeSourceError('YouTube could not provide audio for this video. Try another public video or a direct audio link.');
}

/** Extract metadata only; media bytes are fetched separately through Cyro’s DNS-pinned HTTP boundary. */
export async function resolveYouTubeSource(value: string, options: YouTubeOptions = {}): Promise<YouTubeSource> {
  const canonical = parseYouTubeUrl(value);
  if (!canonical) throw new YouTubeSourceError('Use a single public YouTube video link.');
  options.signal?.throwIfAborted();
  if (!youtubeAvailable()) throw new YouTubeSourceError('YouTube playback is not installed on this host yet. The bot operator needs to run the YouTube source installer.');
  if (activeExtractions >= extractorLimit) throw new YouTubeSourceError('Cyro is loading other YouTube tracks. Try again in a moment.');
  activeExtractions++;
  let launched = false;
  try {
    const json = await new Promise<string>((resolveResult, reject) => {
      const executable = youtubeExecutable();
      const child = spawn(executable, [
        '--ignore-config', '--no-cache-dir', '--no-plugin-dirs', '--no-remote-components', '--no-playlist',
        '--no-js-runtimes', '--js-runtimes', `node:${process.execPath}`, '--proxy', '', '--xff', 'never',
        '--socket-timeout', '10', '--retries', '0', '--extractor-retries', '0', '--use-extractors', 'youtube',
        '--simulate', '--dump-single-json', '-f', 'bestaudio[protocol=https][vcodec=none]', '--', canonical.href,
      ], { cwd: path.dirname(executable), shell: false, windowsHide: true, detached: process.platform !== 'win32', env: extractorEnvironment(), stdio: ['ignore', 'pipe', 'pipe'] });
      launched = true;
      let output = '', stderr = '', bytes = 0, settled = false;
      const terminate = () => {
        if (child.exitCode !== null || !child.pid) return;
        if (process.platform !== 'win32') { try { process.kill(-child.pid, 'SIGKILL'); return; } catch { /* Child may have already exited. */ } }
        else if (process.env.SystemRoot) {
          // Kill the EJS runtime child as well; only this process's numeric PID enters the argument list.
          const killer = spawn(path.join(process.env.SystemRoot, 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore' });
          const fallback = setTimeout(() => { killer.kill(); child.kill('SIGKILL'); }, 2_000); fallback.unref();
          killer.on('error', () => { clearTimeout(fallback); child.kill('SIGKILL'); });
          killer.on('close', code => { clearTimeout(fallback); if (code !== 0) child.kill('SIGKILL'); });
          killer.unref(); return;
        }
        child.kill('SIGKILL');
      };
      const finish = (error?: Error) => {
        if (settled) return; settled = true;
        clearTimeout(timer); options.signal?.removeEventListener('abort', abort);
        if (error) { terminate(); reject(error); } else resolveResult(output);
      };
      const abort = () => finish(new YouTubeSourceError('YouTube loading was cancelled.'));
      const timer = setTimeout(() => finish(new YouTubeSourceError('YouTube took too long to load. Try another source.')), 30_000); timer.unref();
      child.stdout.on('data', (chunk: Buffer) => {
        if (settled) return;
        bytes += chunk.length;
        if (bytes > 4 * 1024 * 1024) finish(new YouTubeSourceError('YouTube returned too much source data. Try another video.'));
        else output += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk: Buffer) => { if (stderr.length < 32_768) stderr += chunk.toString('utf8').slice(0, 32_768 - stderr.length); });
      child.on('error', () => finish(new YouTubeSourceError('The YouTube source could not start. Ask the bot operator to check its installation.')));
      child.once('close', code => { activeExtractions--; finish(code === 0 ? undefined : extractionFailure(stderr)); });
      options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) abort();
    });
    let value: unknown;
    try { value = JSON.parse(json); } catch { throw new YouTubeSourceError('YouTube returned invalid source data. Try another video.'); }
    return readYouTubeSource(value, canonical, options);
  } finally { if (!launched) activeExtractions--; }
}
