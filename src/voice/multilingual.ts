import type { SpeechLanguage } from './catalog.js';

export interface LocalPhonemizer { setVoice(language: string): unknown; textToIpa(text: string): string }
const espeakLanguages = { fr: 'fr', es: 'es', it: 'it', 'pt-BR': 'pt-BR', hi: 'hi' } as const;

/** Match Kokoro v1's non-English phoneme alphabet, preserving nasal marks and each language's R sounds. */
export function normalizeMultilingualPhonemes(phonemes: string): string {
  // ephone emits IPA without tie bars. The affricate/diphthong mappings follow Misaki's EspeakG2P v1.
  return phonemes.replace(/d͡?ʒ/g, 'ʤ').replace(/t͡?ʃ/g, 'ʧ').replace(/d͡?z/g, 'ʣ').replace(/t͡?s/g, 'ʦ')
    .replace(/aɪ/g, 'I').replace(/aʊ/g, 'W').replace(/eɪ/g, 'A').replace(/oʊ/g, 'O').replace(/əʊ/g, 'Q').replace(/ɔɪ/g, 'Y')
    .replace(/[\u0361^-]/g, '').replace(/[।॥]/g, '.').replace(/\s+/g, ' ').trim();
}

export function multilingualPhonemes(phonemizer: LocalPhonemizer, text: string, language: Exclude<SpeechLanguage, 'en'>): string {
  if (!Object.hasOwn(espeakLanguages, language)) throw new Error('Unsupported speech language.');
  const espeakLanguage = espeakLanguages[language];
  if (!espeakLanguage) throw new Error('Unsupported speech language.');
  phonemizer.setVoice(espeakLanguage);
  const result = normalizeMultilingualPhonemes(phonemizer.textToIpa(text.normalize('NFC')));
  if (!result || result.length > 2_000) throw new Error('Invalid phoneme length.');
  return result;
}
