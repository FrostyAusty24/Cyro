import { afterAll, expect, it } from 'vitest';
import { PassThrough, Readable } from 'node:stream';
import { decodeAudio, pcmSpeech } from '../src/voice/audio.js';
import { ttsAvailable, shutdownSpeech } from '../src/voice/tts.js';

afterAll(async () => { await shutdownSpeech(); });

it.skipIf(!ttsAvailable())('renders offline speech as raw 48k stereo PCM with deterministic cleanup', async () => {
  const source = await pcmSpeech('Hello Cyro.', 'voice3');
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of source.stream) chunks.push(Buffer.from(chunk));
    const pcm = Buffer.concat(chunks);
    expect(pcm.byteLength).toBeGreaterThan(48_000);
    expect(pcm.byteLength % 4).toBe(0);
    expect(pcm.subarray(0, 4).toString()).not.toBe('RIFF');
  } finally { source.cleanup(); source.cleanup(); }
}, 15_000);

it('cancels a waiting decoder and closes its input when a call leaves', async () => {
  const input = new PassThrough();
  const controller = new AbortController();
  const pending = decodeAudio(input, 'Waiting stream', { signal: controller.signal });
  controller.abort();
  await expect(pending).rejects.toThrow(/cancelled/);
  expect(input.destroyed).toBe(true);
});

it('refuses a nested playlist and destroys its input without fetching the referenced URL', async () => {
  const malicious = Readable.from(['#EXTM3U\nhttp://169.254.169.254/private.mp3\n']);
  await expect(decodeAudio(malicious, 'Bad playlist')).rejects.toThrow();
  expect(malicious.destroyed).toBe(true);
}, 15_000);
