import { expect, it, vi } from 'vitest';
import { checkVoiceRuntime } from '../src/voice/check.js';
import * as speech from '../src/voice/tts.js';

it('checks the installed offline TTS, FFmpeg, Opus and DAVE runtime without Discord credentials', async () => {
  expect(await checkVoiceRuntime()).toEqual({ audio: true, tts: true, dave: true });
}, 15_000);

it('reports TTS unavailable if valid WAV and Opus output contain only silence', async () => {
  const wav = Buffer.alloc(44 + 48_000);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(48_000, 24); wav.writeUInt32LE(192_000, 28);
  wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(48_000, 40);
  const synthesizer = vi.spyOn(speech, 'synthesizeSpeech').mockResolvedValue(wav);
  try { expect(await checkVoiceRuntime()).toEqual({ audio: true, tts: false, dave: true }); }
  finally { synthesizer.mockRestore(); }
}, 15_000);
