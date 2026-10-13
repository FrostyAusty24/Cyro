import { BlockList, isIP, type LookupFunction } from 'node:net';
import { lookup } from 'node:dns/promises';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable, Transform } from 'node:stream';

const deniedV4 = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 3],
] as const) deniedV4.addSubnet(address, prefix, 'ipv4');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
const deniedV6 = new BlockList();
for (const [address, prefix] of [
  ['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20],
] as const) deniedV6.addSubnet(address, prefix, 'ipv6');

/** Reject private, loopback, metadata, multicast and transition addresses before opening a socket. */
export function isPublicAudioAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !deniedV4.check(address, 'ipv4');
  return family === 6 && globalV6.check(address, 'ipv6') && !deniedV6.check(address, 'ipv6');
}

const audioPorts = new Set(['', '80', '443', '8000', '8001', '8080', '8443', '8888']);
const onDomain = (host: string, domain: string): boolean => host === domain || host.endsWith(`.${domain}`);

export function parseAudioUrl(value: string): URL {
  if (value.length > 2_048) throw new Error('The music URL is too long.');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Use a full http:// or https:// link to playable audio.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !audioPorts.has(url.port)) {
    throw new Error('Use an HTTP(S) audio link without a login, on a standard web or radio port.');
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'googlevideo.com'].some(domain => onDomain(host, domain))) {
    throw new Error('Use a supported single YouTube video link with /playmusic, or a direct audio or radio-stream URL. This YouTube URL type cannot be played.');
  }
  if (['spotify.com', 'spotify.link', 'scdn.co'].some(domain => onDomain(host, domain))) {
    throw new Error('Spotify links do not provide playable audio to Cyro. Use a direct audio file or radio-stream URL instead.');
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || !host.includes('.') && !isIP(host) || isIP(host) && !isPublicAudioAddress(host)) {
    throw new Error('Music links must point to a public internet address.');
  }
  url.hash = '';
  return url;
}

/** Only extractor-selected YouTube media may use this path; ordinary user audio links cannot. */
export function parseYouTubeMediaUrl(value: string): URL {
  if (value.length > 16_384) throw new Error('The YouTube media URL is too long.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !onDomain(url.hostname, 'googlevideo.com') || url.pathname !== '/videoplayback') {
    throw new Error('YouTube media must use its public HTTPS audio delivery service.');
  }
  url.hash = '';
  return url;
}

export interface AudioAddress { address: string; family: number }
export type AudioLookup = (hostname: string) => Promise<AudioAddress[]>;
const systemLookup: AudioLookup = hostname => lookup(hostname, { all: true, verbatim: true });

export async function resolveAudioAddress(url: URL, resolver: AudioLookup = systemLookup): Promise<AudioAddress> {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const records = isIP(host) ? [{ address: host, family: isIP(host) }] : await resolver(host);
  if (!records.length || records.some(record => !isPublicAudioAddress(record.address))) {
    throw new Error('Music links must resolve only to public internet addresses.');
  }
  // The request uses this exact address; a second DNS resolution cannot rebind to a private host.
  return records[0]!;
}

interface AudioResponse { status: number; headers: IncomingHttpHeaders; stream: Readable }
export interface AudioNetwork {
  lookup: AudioLookup;
  request: (url: URL, address: AudioAddress, signal: AbortSignal) => Promise<AudioResponse>;
}
export interface AudioDownload { stream: Readable; url: URL; cleanup: () => void }
export interface AudioDownloadOptions { signal?: AbortSignal; maxBytes?: number }

export interface AudioFailureDetails { code: string; family?: 4 | 6; status?: number }
const networkCodes: Record<string, string> = {
  ENETUNREACH: 'network-unreachable', EHOSTUNREACH: 'network-unreachable', EADDRNOTAVAIL: 'address-unavailable',
  ECONNREFUSED: 'connection-refused', ECONNRESET: 'connection-reset', ETIMEDOUT: 'network-timeout',
  ENOTFOUND: 'dns-unavailable', EAI_AGAIN: 'dns-unavailable', ABORT_ERR: 'cancelled',
  CERT_HAS_EXPIRED: 'tls-failed', ERR_TLS_CERT_ALTNAME_INVALID: 'tls-failed', UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'tls-failed',
};
class AudioRequestError extends Error {
  constructor(readonly details: AudioFailureDetails, message: string) { super(message); }
}
/** Fixed classifications only: never return a native error message, URL, hostname, address or response body. */
export function audioFailureDetails(error: unknown): AudioFailureDetails {
  if (error instanceof AudioRequestError) return { ...error.details };
  const nativeCode = (error as NodeJS.ErrnoException | null)?.code;
  if (typeof nativeCode === 'string' && networkCodes[nativeCode]) return { code: networkCodes[nativeCode]! };
  const knownMessages: Record<string, string> = {
    'The audio server took too long to respond.': 'headers-timeout',
    'The audio stream stopped responding.': 'stream-timeout',
    'Audio loading was cancelled or timed out.': 'cancelled-or-timeout',
    'Music links must resolve only to public internet addresses.': 'non-public-address',
    'The audio link redirects too many times.': 'redirect-limit',
    'That link is not a direct supported audio stream. Use an MP3, WAV, OGG, FLAC, AAC, M4A or radio-stream URL.': 'unsupported-content-type',
    'Compressed web responses cannot be used as music streams.': 'unsupported-content-encoding',
    'That audio file exceeds the music download limit.': 'source-too-large',
    'The music stream reached its download limit.': 'source-too-large',
  };
  const message = error instanceof Error ? error.message : '';
  return { code: knownMessages[message] ?? 'source-fetch-failed' };
}

const requestAudio: AudioNetwork['request'] = (url, address, signal) => new Promise((resolve, reject) => {
  const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
    method: 'GET', agent: false, signal, family: address.family,
    lookup: ((_host, _options, callback) => callback(null, address.address, address.family)) as LookupFunction,
    headers: { 'User-Agent': 'Cyro/1.0 (community audio player)', Accept: 'audio/*, application/ogg;q=0.9, application/octet-stream;q=0.5', 'Accept-Encoding': 'identity', 'Icy-MetaData': '0' },
  });
  const headersTimeout = setTimeout(() => request.destroy(new Error('The audio server took too long to respond.')), 10_000);
  headersTimeout.unref();
  request.setTimeout(15_000, () => request.destroy(new Error('The audio stream stopped responding.')));
  request.once('error', error => { clearTimeout(headersTimeout); reject(new AudioRequestError({ ...audioFailureDetails(error), family: address.family === 6 ? 6 : 4 }, 'The audio server could not be reached.')); });
  request.once('response', response => {
    clearTimeout(headersTimeout);
    resolve({ status: response.statusCode ?? 0, headers: response.headers, stream: response });
  });
  request.end();
});
const defaultNetwork: AudioNetwork = { lookup: systemLookup, request: requestAudio };
const playableTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave', 'audio/ogg', 'audio/opus', 'audio/flac', 'audio/x-flac', 'audio/aac', 'audio/aacp', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'application/ogg', 'application/octet-stream']);

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const abort = (): void => reject(new Error('Audio loading was cancelled or timed out.'));
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

/** Stream bytes through Node only; never pass an untrusted URL or filename to a media decoder. */
async function downloadAudio(value: string, parse: (value: string) => URL, options: AudioDownloadOptions, network: AudioNetwork): Promise<AudioDownload> {
  options.signal?.throwIfAborted();
  const controller = new AbortController();
  const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
  const maxBytes = Math.min(Math.max(options.maxBytes ?? 64 * 1024 * 1024, 1), 128 * 1024 * 1024);
  let current: Readable | undefined;
  const cleanup = (): void => { controller.abort(); current?.destroy(); };
  try {
    let url = parse(value);
    for (let redirects = 0; redirects <= 4; redirects++) {
      const dnsSignal = AbortSignal.any([signal, AbortSignal.timeout(5_000)]);
      const address = await abortable(resolveAudioAddress(url, network.lookup), dnsSignal);
      const response = await network.request(url, address, signal);
      current = response.stream;
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        response.stream.destroy();
        if (redirects === 4 || !response.headers.location) throw new Error('The audio link redirects too many times.');
        url = parse(new URL(response.headers.location, url).href);
        continue;
      }
      if (![200, 206].includes(response.status)) throw new AudioRequestError({ code: 'http-status', status: response.status, family: address.family === 6 ? 6 : 4 }, 'The audio server could not play this link.');
      const contentType = String(response.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase();
      if (!playableTypes.has(contentType)) throw new Error('That link is not a direct supported audio stream. Use an MP3, WAV, OGG, FLAC, AAC, M4A or radio-stream URL.');
      if (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') throw new Error('Compressed web responses cannot be used as music streams.');
      const length = Number(response.headers['content-length']);
      if (Number.isFinite(length) && length > maxBytes) throw new Error('That audio file exceeds the music download limit.');
      let total = 0;
      const limited = new Transform({ transform(chunk: Buffer, _encoding, callback) {
        total += chunk.length;
        callback(total > maxBytes ? new Error('The music stream reached its download limit.') : null, total > maxBytes ? undefined : chunk);
      } });
      // Attach before piping so rejection during caller setup cannot become an unhandled stream error.
      limited.on('error', cleanup);
      response.stream.on('error', error => limited.destroy(new AudioRequestError({ ...audioFailureDetails(error), family: address.family === 6 ? 6 : 4 }, 'The audio stream ended unexpectedly.')));
      limited.once('close', cleanup);
      response.stream.pipe(limited);
      return { stream: limited, url, cleanup: () => { limited.destroy(); cleanup(); } };
    }
    throw new Error('The audio link redirects too many times.');
  } catch (error) { cleanup(); throw error; }
}

export function openAudioStream(value: string, options: AudioDownloadOptions = {}, network: AudioNetwork = defaultNetwork): Promise<AudioDownload> {
  return downloadAudio(value, parseAudioUrl, options, network);
}

export function openYouTubeAudioStream(value: string, options: AudioDownloadOptions = {}, network: AudioNetwork = defaultNetwork): Promise<AudioDownload> {
  return downloadAudio(value, parseYouTubeMediaUrl, options, network);
}
