import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough, Readable } from 'node:stream';
import { spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { parseYouTubeUrl, readYouTubeSource, resolveYouTubeSource, youtubeAvailable } from '../src/voice/youtube.js';
import { openYouTubeAudioStream, parseYouTubeMediaUrl } from '../src/voice/urls.js';

vi.mock('node:fs', () => ({ statSync: vi.fn(() => ({ isFile: () => true, size: 10, mtimeMs: 1, ctimeMs: 1, ino: 1 })), readFileSync: vi.fn(() => Buffer.from('trusted-fixture')) }));
vi.mock('node:crypto', () => ({ createHash: () => ({ update: (value: Buffer) => ({ digest: () => value.toString() === 'trusted-fixture' ? ({ 'win32-x64': '66674953fe251b89f4d08c5f0e35e0728679bd67ab3d7d05c0562af101dd3e7a', 'linux-x64': '58162f9bfdc27458ea47bfcb311cf47028f17d8154a8bf7d689861d46399230a', 'linux-arm64': 'b16e4dab368a816cd05d477d698a605a6ae87ccee1c8ffd38fa21d7254141fcc' }[`${process.platform}-${process.arch}`]) : 'untrusted' }) }) }));
vi.mock('node:child_process', () => ({ spawn: vi.fn() }));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
const canonical = new URL('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
const metadata = () => ({ id: 'aqz-KE-bpKQ', extractor: 'youtube', _type: 'video', title: 'A public video', duration: 120,
  availability: 'public', live_status: 'not_live', protocol: 'https', acodec: 'opus', vcodec: 'none', url: 'https://r1.googlevideo.com/videoplayback?secret=never-show-this' });
function mockExtractor(run: (child: ReturnType<typeof childProcess>) => void) {
  let current: ReturnType<typeof childProcess>;
  vi.mocked(spawn).mockImplementation(((file: string) => {
    const child = childProcess();
    if (file.endsWith('taskkill.exe')) queueMicrotask(() => { current.exitCode = 1; current.emit('close', 1); child.emit('close', 0); });
    else { current = child; queueMicrotask(() => run(child)); }
    return child;
  }) as never);
}
function childProcess() {
  const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough(), exitCode: null as number | null, pid: 43210, kill: vi.fn(), unref: vi.fn() });
  child.kill.mockImplementation(() => { child.exitCode = 1; queueMicrotask(() => child.emit('close', 1)); return true; });
  return child;
}

describe('YouTube music links', () => {
  it('canonicalizes one video without preserving playlist, tracking, or timestamp parameters', () => {
    for (const value of ['https://youtu.be/aqz-KE-bpKQ?t=12', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ&list=PLabc', 'https://m.youtube.com/shorts/aqz-KE-bpKQ', 'https://youtube.com/live/aqz-KE-bpKQ']) {
      expect(parseYouTubeUrl(value)?.href).toBe('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
    }
    expect(parseYouTubeUrl('https://radio.example.org/music.mp3')).toBeUndefined();
    for (const value of ['https://youtube.com/playlist?list=PLabc', 'https://youtube.com/watch?v=bad', 'https://user:password@youtube.com/watch?v=aqz-KE-bpKQ', 'http://youtube.com/watch?v=aqz-KE-bpKQ', 'https://evil.youtube.com/watch?v=aqz-KE-bpKQ', 'https://youtube.com:8080/watch?v=aqz-KE-bpKQ']) {
      expect(() => parseYouTubeUrl(value), value).toThrow();
    }
  });
  it('rejects forged extractor results, restrictions, live videos and tracks beyond the server limit', () => {
    expect(readYouTubeSource(metadata(), canonical)).toMatchObject({ id: 'aqz-KE-bpKQ', title: 'A public video', durationSeconds: 120 });
    for (const patch of [{ id: 'differentId' }, { _type: 'playlist' }, { entries: [] }, { extractor: 'generic' }, { vcodec: 'h264' }, { protocol: 'm3u8_native' }, { url: 'https://169.254.169.254/videoplayback' }, { url: 'https://googlevideo.com.evil.org/videoplayback' }, { availability: 'private' }, { age_limit: 18 }, { is_live: true }, { duration: 901 }, { filesize: 100 * 1024 * 1024 }]) {
      expect(() => readYouTubeSource({ ...metadata(), ...patch }, canonical), JSON.stringify(patch)).toThrow();
    }
  });
  it('allows only HTTPS Google media and revalidates redirects and DNS before every socket', async () => {
    for (const value of ['http://r1.googlevideo.com/videoplayback', 'https://user:pass@r1.googlevideo.com/videoplayback', 'https://r1.googlevideo.com:8443/videoplayback', 'https://r1.googlevideo.com/other', 'https://r1.googlevideo.com.evil.org/videoplayback']) expect(() => parseYouTubeMediaUrl(value)).toThrow();
    const request = vi.fn(async () => ({ status: 302, headers: { location: 'https://example.org/music.mp3' }, stream: Readable.from([]) }));
    const lookup = vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]);
    await expect(openYouTubeAudioStream(metadata().url, {}, { request, lookup })).rejects.toThrow();
    expect(request).toHaveBeenCalledOnce();
    request.mockClear();
    await expect(openYouTubeAudioStream(metadata().url, {}, { request, lookup: async () => [{ address: '127.0.0.1', family: 4 }] })).rejects.toThrow(/public internet/);
    expect(request).not.toHaveBeenCalled();
  });
  it('uses fixed arguments, minimal environment and canonical URLs without shell execution', async () => {
    mockExtractor(child => { child.stdout.write(JSON.stringify(metadata())); child.exitCode = 0; child.emit('close', 0); });
    const source = await resolveYouTubeSource('https://youtu.be/aqz-KE-bpKQ?list=PLuntrusted');
    expect(source.title).toBe('A public video');
    const [, args, options] = vi.mocked(spawn).mock.calls[0]!;
    expect(args).toEqual(expect.arrayContaining(['--ignore-config', '--no-plugin-dirs', '--no-remote-components', '--simulate', '--no-playlist', '--', canonical.href]));
    expect(options).toMatchObject({ shell: false, windowsHide: true });
    expect(Object.keys(options!.env!)).not.toEqual(expect.arrayContaining(['DISCORD_TOKEN', 'NODE_OPTIONS', 'HTTP_PROXY', 'PYTHONPATH']));
  });
  it('bounds extractor output, kills its process tree and keeps provider details out of errors', async () => {
    mockExtractor(child => { child.stdout.write(Buffer.alloc(4 * 1024 * 1024 + 1)); });
    await expect(resolveYouTubeSource(canonical.href)).rejects.toThrow(/too much source data/);
    await new Promise(resolve => setImmediate(resolve));
    if (process.platform === 'win32') expect(vi.mocked(spawn).mock.calls.some(([, args]) => args?.includes('/T'))).toBe(true);
    mockExtractor(child => { child.stderr.write('ERROR: sign in to confirm you are not a bot https://secret.example/?token=private'); child.exitCode = 1; child.emit('close', 1); });
    await expect(resolveYouTubeSource(canonical.href)).rejects.toThrow(/refusing playback/);
    try { await resolveYouTubeSource(canonical.href); } catch (error) { expect(String(error)).not.toContain('private'); expect(String(error)).not.toContain('secret.example'); }
  });
  it('cancels extraction and times out without leaving a concurrency slot occupied', async () => {
    mockExtractor(() => {});
    const controller = new AbortController();
    const cancelled = resolveYouTubeSource(canonical.href, { signal: controller.signal });
    controller.abort(); await expect(cancelled).rejects.toThrow(/cancelled/);
    await new Promise(resolve => setImmediate(resolve));
    vi.useFakeTimers();
    const timedOut = resolveYouTubeSource(canonical.href); const assertion = expect(timedOut).rejects.toThrow(/too long/);
    await vi.advanceTimersByTimeAsync(30_001); await assertion;
    vi.useRealTimers(); await new Promise(resolve => setImmediate(resolve));
    mockExtractor(child => { child.stdout.write(JSON.stringify(metadata())); child.exitCode = 0; child.emit('close', 0); });
    await expect(resolveYouTubeSource(canonical.href)).resolves.toHaveProperty('id', 'aqz-KE-bpKQ');
  });
  it('refuses to execute an existing binary that no longer matches the pinned checksum', async () => {
    vi.mocked(statSync).mockReturnValueOnce({ isFile: () => true, size: 10, mtimeMs: 2, ctimeMs: 2, ino: 1 } as never);
    vi.mocked(readFileSync).mockReturnValueOnce(Buffer.from('altered-binary'));
    expect(youtubeAvailable()).toBe(false);
    vi.mocked(statSync).mockReturnValueOnce({ isFile: () => true, size: 10, mtimeMs: 2, ctimeMs: 2, ino: 1 } as never);
    await expect(resolveYouTubeSource(canonical.href)).rejects.toThrow(/not installed/);
    expect(spawn).not.toHaveBeenCalled();
  });
});
