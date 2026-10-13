import { expect, it } from 'vitest';
import { TTS_VOICES, synthesizeSpeech } from '../src/voice/tts.js';

it('renders four distinct offline synthetic voices to WAV', async () => {
  const wavs: Buffer[] = [];
  for (const voice of TTS_VOICES) {
    const wav = await synthesizeSpeech('Welcome to Cyro.', voice.id);
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.subarray(8, 12).toString()).toBe('WAVE');
    wavs.push(wav);
  }
  expect(TTS_VOICES.map(v => v.id)).toEqual(['voice1', 'voice2', 'voice3', 'voice4']);
  expect(new Set(wavs.map(w => w.toString('base64'))).size).toBe(4);
}, 15_000);

it('rejects oversized text and unsupported voices before synthesis, and cancels an active worker', async () => {
  await expect(synthesizeSpeech('x'.repeat(401))).rejects.toThrow(/1–400/);
  await expect(synthesizeSpeech('Hello', '../../evil')).rejects.toThrow(/four available/);
  const controller = new AbortController();
  const pending = synthesizeSpeech('This worker should stop when the call closes.', 'voice2', controller.signal);
  controller.abort();
  await expect(pending).rejects.toThrow(/cancelled/);
});
