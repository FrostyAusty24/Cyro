import { afterAll, expect, it } from 'vitest';
import { TTS_VOICES, synthesizeSpeech, ttsAvailable, shutdownSpeech } from '../src/voice/tts.js';
import { pcmSpeech } from '../src/voice/audio.js';
import { createAudioResource, StreamType } from '@discordjs/voice';
import OpusScript from 'opusscript';

afterAll(async () => { await shutdownSpeech(); });

it.skipIf(!ttsAvailable())('renders twelve distinct offline neural voices to WAV', async () => {
  const wavs: Buffer[] = [];
  for (const voice of TTS_VOICES) {
    const wav = await synthesizeSpeech('Welcome to Cyro.', voice.id);
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.subarray(8, 12).toString()).toBe('WAVE');
    wavs.push(wav);
  }
  expect(wavs).toHaveLength(12);
  expect(new Set(wavs.map(w => w.toString('base64'))).size).toBe(12);
}, 60_000);

it('rejects oversized text and unsupported voices before synthesis', async () => {
  await expect(synthesizeSpeech('x'.repeat(401))).rejects.toThrow(/1–400/);
  await expect(synthesizeSpeech('Hello', '../../evil')).rejects.toThrow(/available TTS voices/);
});

it.skipIf(!ttsAvailable())('produces audible speech for every voice through the actual Discord Opus encoder', async () => {
  for (const voice of TTS_VOICES) {
    const source = await pcmSpeech('Cyro voice check. Hello from the community.', voice.id);
    const resource = createAudioResource(source.stream, { inputType: StreamType.Raw, inlineVolume: true });
    resource.volume?.setVolume(0.5);
    const decoder = new OpusScript(48_000, 2, OpusScript.Application.AUDIO);
    let samples = 0, energy = 0, peak = 0, frames = 0;
    try {
      for await (const packet of resource.playStream) {
        const pcm = decoder.decode(packet); frames++;
        for (let i = 0; i + 1 < pcm.length; i += 2) {
          const value = pcm.readInt16LE(i);
          samples++; energy += value * value; peak = Math.max(peak, Math.abs(value));
        }
      }
      expect(frames, voice.id).toBeGreaterThan(50);
      expect(peak, voice.id).toBeGreaterThan(1_000);
      expect(Math.sqrt(energy / samples), voice.id).toBeGreaterThan(100);
    } finally { decoder.delete(); resource.playStream.destroy(); resource.volume?.destroy(); source.cleanup(); }
  }
}, 90_000);
