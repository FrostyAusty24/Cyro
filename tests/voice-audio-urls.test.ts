import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { isPublicAudioAddress, parseAudioUrl, resolveAudioAddress, openAudioStream } from '../src/voice/urls.js';

describe('audio network boundary', () => {
  it('only accepts publicly routable addresses including IPv6', () => {
    for (const address of ['127.0.0.1', '10.0.0.5', '169.254.169.254', '172.20.0.1', '192.168.1.2', '100.64.0.1', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', '2001:db8::1', '2001:2::1', '2002:7f00:1::', '3fff::1']) {
      expect(isPublicAudioAddress(address), address).toBe(false);
    }
    expect(isPublicAudioAddress('93.184.216.34')).toBe(true);
    expect(isPublicAudioAddress('2606:4700:4700::1111')).toBe(true);
  });
  it('accepts public audio URLs but rejects credentials, local schemes and unsupported platform pages', () => {
    expect(parseAudioUrl('https://radio.example.org:8000/live').hostname).toBe('radio.example.org');
    for (const url of ['file:///etc/passwd', 'http://user:password@example.org/song.mp3', 'http://127.1/a', 'http://2130706433/a', 'http://[::1]/a', 'https://example.org:22/a']) {
      expect(() => parseAudioUrl(url), url).toThrow();
    }
    expect(() => parseAudioUrl('https://youtu.be/video')).toThrow(/YouTube.*direct audio/i);
    expect(() => parseAudioUrl('https://open.spotify.com/track/id')).toThrow(/Spotify.*direct audio/i);
  });
  it('pins a vetted DNS result and rejects mixed public/private answers', async () => {
    const url = parseAudioUrl('https://radio.example.org/live');
    await expect(resolveAudioAddress(url, async () => [{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.2', family: 4 }])).rejects.toThrow(/public internet/i);
    await expect(resolveAudioAddress(url, async () => [{ address: '93.184.216.34', family: 4 }])).resolves.toEqual({ address: '93.184.216.34', family: 4 });
  });
  it('validates every redirect target before making another request', async () => {
    let requests = 0;
    await expect(openAudioStream('https://radio.example.org/live', {}, {
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      request: async (_url, pinned) => {
        expect(pinned.address).toBe('93.184.216.34'); requests++;
        return { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' }, stream: Readable.from([]) };
      },
    })).rejects.toThrow(/public internet/i);
    expect(requests).toBe(1);
  });
  it('rejects a page, playlists and oversized audio before decoding', async () => {
    for (const headers of [{ 'content-type': 'text/html' }, { 'content-type': 'audio/x-mpegurl' }, { 'content-type': 'audio/mpeg', 'content-length': '1000' }]) {
      const body = Readable.from(['response']);
      await expect(openAudioStream('https://radio.example.org/live', { maxBytes: 20 }, {
        lookup: async () => [{ address: '93.184.216.34', family: 4 }],
        request: async () => ({ status: 200, headers, stream: body }),
      })).rejects.toThrow();
      expect(body.destroyed).toBe(true);
    }
  });
  it('caps bytes while streaming even if the server lies about its content length', async () => {
    const body = Readable.from([Buffer.alloc(10), Buffer.alloc(20)]);
    const audio = await openAudioStream('https://radio.example.org/live', { maxBytes: 20 }, {
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      request: async () => ({ status: 200, headers: { 'content-type': 'audio/mpeg' }, stream: body }),
    });
    await expect((async () => { for await (const _chunk of audio.stream) { /* consume */ } })()).rejects.toThrow(/download limit/);
    expect(body.destroyed).toBe(true);
  });
});
