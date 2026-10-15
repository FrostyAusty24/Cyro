import { afterAll, expect, it, vi } from 'vitest';
import { TTS_VOICES, type SpeechLanguage } from '../src/voice/catalog.js';
import { multilingualPhonemes, normalizeMultilingualPhonemes } from '../src/voice/multilingual.js';
import { prepareSpeechText } from '../src/voice/speech-text.js';
import { synthesizeSpeech, shutdownSpeech, ttsAvailable } from '../src/voice/tts.js';
import { pcmSpeech } from '../src/voice/audio.js';
import { createAudioResource, StreamType } from '@discordjs/voice';
import OpusScript from 'opusscript';

afterAll(async () => { await shutdownSpeech(); });
const samples: Record<SpeechLanguage, string> = {
  en: 'Welcome to our community.', fr: 'Bonjour, bienvenue dans notre communauté.',
  es: 'Hola, bienvenidos a nuestra comunidad.', it: 'Ciao, benvenuti nella nostra comunità.',
  'pt-BR': 'Olá, sejam bem-vindos à nossa comunidade.', hi: 'नमस्ते, हमारे समुदाय में आपका स्वागत है।',
};

it('uses each voice language for the optional speaker label without translating member messages', () => {
  const expected = { en: 'Frosty said: Hello', fr: 'Frosty a dit: Hello', es: 'Frosty dijo: Hello',
    it: 'Frosty ha detto: Hello', 'pt-BR': 'Frosty disse: Hello', hi: 'Frosty ने कहा: Hello' };
  for (const [language, result] of Object.entries(expected)) {
    expect(prepareSpeechText('Hello', 'Frosty', language as SpeechLanguage)).toBe(result);
    expect(prepareSpeechText(samples[language as SpeechLanguage], undefined, language as SpeechLanguage)).toBe(samples[language as SpeechLanguage]);
  }
  expect(() => prepareSpeechText('x'.repeat(401), 'Frosty', 'fr')).toThrow(/1–400/);
});

it('preserves French nasal vowels and non-English R while mapping Kokoro v1 affricates', () => {
  expect(normalizeMultilingualPhonemes('bɔ̃ʒˈuʁ! tʃ dʒ t͡s d͡z aɪ')).toBe('bɔ̃ʒˈuʁ! ʧ ʤ ʦ ʣ I');
  const phonemizer = { setVoice: vi.fn(), textToIpa: vi.fn(() => 'bɔ̃ʒˈuʁ.') };
  expect(multilingualPhonemes(phonemizer, 'Bonjour.', 'fr')).toBe('bɔ̃ʒˈuʁ.');
  expect(phonemizer.setVoice).toHaveBeenCalledWith('fr');
  expect(() => multilingualPhonemes(phonemizer, 'Hello.', '../../evil' as 'fr')).toThrow(/Unsupported/);
  phonemizer.textToIpa.mockReturnValue('x'.repeat(2001));
  expect(() => multilingualPhonemes(phonemizer, 'Hello.', 'es')).toThrow(/length/);
});

it.skipIf(!ttsAvailable())('renders every added voice through the offline IPC worker with audible finite PCM', async () => {
  const distinct = new Set<string>();
  for (const voice of TTS_VOICES.filter(voice => voice.language !== 'en')) {
    const wav = await synthesizeSpeech(samples[voice.language], voice.id, undefined, 'Frosty');
    expect(wav.subarray(0, 4).toString(), voice.id).toBe('RIFF');
    expect(wav.readUInt32LE(24), voice.id).toBe(24_000);
    expect(wav.length, voice.id).toBeGreaterThan(24_000);
    let energy = 0, peak = 0;
    for (let index = 44; index + 1 < wav.length; index += 2) {
      const sample = wav.readInt16LE(index); energy += sample * sample; peak = Math.max(peak, Math.abs(sample));
    }
    expect(peak, voice.id).toBeGreaterThan(1_000);
    expect(Math.sqrt(energy / ((wav.length - 44) / 2)), voice.id).toBeGreaterThan(100);
    distinct.add(wav.toString('base64'));
  }
  expect(distinct.size).toBe(13);
  // Switching back keeps the established English synthesis path working in the same worker.
  expect((await synthesizeSpeech(samples.en, 'voice1')).subarray(0, 4).toString()).toBe('RIFF');
}, 120_000);

it.skipIf(!ttsAvailable())('keeps each added language audible through the actual Discord Opus encoder', async () => {
  for (const language of ['fr', 'es', 'it', 'pt-BR', 'hi'] as const) {
    const voice = TTS_VOICES.find(item => item.language === language)!;
    const source = await pcmSpeech(samples[language], voice.id);
    const resource = createAudioResource(source.stream, { inputType: StreamType.Raw, inlineVolume: true });
    resource.volume?.setVolume(0.5);
    const decoder = new OpusScript(48_000, 2, OpusScript.Application.AUDIO);
    let count = 0, energy = 0, peak = 0;
    try {
      for await (const packet of resource.playStream) {
        const pcm = decoder.decode(packet);
        for (let i = 0; i + 1 < pcm.length; i += 2) {
          const sample = pcm.readInt16LE(i); count++; energy += sample * sample; peak = Math.max(peak, Math.abs(sample));
        }
      }
      expect(count, language).toBeGreaterThan(48_000);
      expect(peak, language).toBeGreaterThan(1_000);
      expect(Math.sqrt(energy / count), language).toBeGreaterThan(100);
    } finally { decoder.delete(); resource.playStream.destroy(); resource.volume?.destroy(); source.cleanup(); }
  }
}, 90_000);
