import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { TTS_VOICES } from '../src/voice/tts.js';
import { VoiceStore, defaultVoiceConfig, isVoiceId, parseVoiceConfig } from '../src/voice/store.js';

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});

it('offers six male and six female voices while preserving the original saved IDs', () => {
  expect(TTS_VOICES.map(voice => [voice.id, voice.engineVoice])).toEqual([
    ['voice1', 'bm_daniel'], ['voice2', 'am_michael'],
    ['voice3', 'af_heart'], ['voice4', 'af_bella'],
    ['voice5', 'am_fenrir'], ['voice6', 'am_puck'],
    ['voice7', 'bm_george'], ['voice8', 'bm_fable'],
    ['voice9', 'af_nicole'], ['voice10', 'bf_emma'],
    ['voice11', 'af_aoede'], ['voice12', 'af_sarah'],
  ]);
  expect(TTS_VOICES.filter(voice => voice.gender === 'male')).toHaveLength(6);
  expect(TTS_VOICES.filter(voice => voice.gender === 'female')).toHaveLength(6);
});

it('persists every catalog voice while preserving existing server defaults and rejecting invalid IDs', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'cyro-voice-catalog-'));
  directories.push(directory);
  const store = new VoiceStore(directory); await store.init();
  const existingGuild = '123456789012345678', newGuild = '223456789012345678';
  await store.mutate(existingGuild, guild => {
    guild.config.defaultVoice = 'voice4';
    guild.voices['323456789012345678'] = 'voice3';
  });
  for (const [index, voice] of TTS_VOICES.entries()) {
    expect(isVoiceId(voice.id)).toBe(true);
    await store.mutate(newGuild, guild => {
      guild.config = parseVoiceConfig({ ...guild.config, defaultVoice: voice.id });
      guild.voices[String(423456789012345678n + BigInt(index))] = voice.id;
    });
  }
  const restarted = new VoiceStore(directory); await restarted.init();
  expect(restarted.get(newGuild).config.defaultVoice).toBe('voice12');
  expect(Object.values(restarted.get(newGuild).voices)).toEqual(TTS_VOICES.map(voice => voice.id));
  expect(restarted.get(existingGuild).config.defaultVoice).toBe('voice4');
  expect(restarted.get(existingGuild).voices['323456789012345678']).toBe('voice3');
  expect(restarted.get('523456789012345678').config).toEqual(defaultVoiceConfig());
  for (const invalid of ['voice0', 'voice13', 'voice01', 'voice1junk', '__proto__', null, ['voice1']]) {
    expect(isVoiceId(invalid)).toBe(false);
    expect(() => parseVoiceConfig({ ...defaultVoiceConfig(), defaultVoice: invalid })).toThrow();
  }
});
