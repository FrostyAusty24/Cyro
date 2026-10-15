import { afterAll, expect, it } from 'vitest';
import { createAudioResource, StreamType } from '@discordjs/voice';
import OpusScript from 'opusscript';
import { germanRuntimeInstalled, isGermanEngineVoice, speechWorkerKey } from '../src/voice/german-runtime.js';
import { synthesizeSpeech, shutdownSpeech, voiceAvailable } from '../src/voice/tts.js';
import { pcmSpeech } from '../src/voice/audio.js';
import { prepareSpeechText } from '../src/voice/speech-text.js';

afterAll(shutdownSpeech);
it('keeps German on its own supported model and never routes it into Kokoro', () => {
  expect(isGermanEngineVoice('piper_de_thorsten')).toBe(true);
  expect(isGermanEngineVoice('__proto__')).toBe(false);
  expect(speechWorkerKey('bm_daniel')).toBe('kokoro');
  expect(speechWorkerKey('ff_siwis')).toBe('kokoro');
  expect(speechWorkerKey('piper_de_thorsten')).toBe('piper_de_thorsten');
  expect(voiceAvailable('de-thorsten')).toBe(germanRuntimeInstalled());
  expect(voiceAvailable('__proto__')).toBe(false);
  expect(germanRuntimeInstalled('directory-that-does-not-exist')).toBe(false);
  expect(prepareSpeechText('Guten Morgen', 'Frosty', 'de')).toBe('Frosty sagte: Guten Morgen');
  expect(prepareSpeechText('Guten Morgen', 'Someone', 'de')).toBe('Jemand sagte: Guten Morgen');
});

it.skipIf(!germanRuntimeInstalled())('renders both real German models through bounded IPC and Discord Opus', async () => {
  for (const [voice, sampleRate] of [['de-thorsten', 22050], ['de-kerstin', 16000]] as const) {
    const wav = await synthesizeSpeech('Hallo, willkommen in unserer Gemeinschaft.', voice, undefined, 'Frosty');
    expect(wav.readUInt32LE(24)).toBe(sampleRate);
    expect(wav.length).toBeGreaterThan(sampleRate);
    const source = await pcmSpeech('Schön, dass du heute hier bist.', voice);
    const resource = createAudioResource(source.stream, { inputType: StreamType.Raw, inlineVolume: true });
    resource.volume?.setVolume(0.5);
    const decoder = new OpusScript(48_000, 2, OpusScript.Application.AUDIO);
    let count = 0, peak = 0, energy = 0;
    try {
      for await (const packet of resource.playStream) {
        const pcm = decoder.decode(packet);
        for (let index = 0; index + 1 < pcm.length; index += 2) {
          const sample = pcm.readInt16LE(index); count++; peak = Math.max(peak, Math.abs(sample)); energy += sample * sample;
        }
      }
      expect(count, voice).toBeGreaterThan(48_000);
      expect(peak, voice).toBeGreaterThan(1_000);
      expect(Math.sqrt(energy / count), voice).toBeGreaterThan(100);
    } finally { decoder.delete(); resource.playStream.destroy(); resource.volume?.destroy(); source.cleanup(); }
  }
  if (voiceAvailable('voice1')) expect((await synthesizeSpeech('Back to English.', 'voice1')).subarray(0, 4).toString()).toBe('RIFF');
}, 90_000);
