import { expect, it } from 'vitest';
import { checkVoiceRuntime } from '../src/voice/check.js';

it('checks the installed offline TTS, FFmpeg, Opus and DAVE runtime without Discord credentials', async () => {
  expect(await checkVoiceRuntime()).toEqual({ audio: true, tts: true, dave: true });
}, 15_000);
