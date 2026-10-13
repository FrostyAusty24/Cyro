import { expect, it, vi } from 'vitest';
import { normalizeSpeechPronunciation, splitSpeechText } from '../src/voice/neural-text.js';
import { synthesizeSpeech } from '../src/voice/tts.js';

const { queuedSynthesis } = vi.hoisted(() => ({ queuedSynthesis: vi.fn(async () => Buffer.from('test audio')) }));
vi.mock('../src/voice/neural-runtime.js', () => ({
  NeuralTtsQueue: class {
    synthesize = queuedSynthesis;
    close = async () => undefined;
  },
  neuralRuntimeInstalled: () => true,
}));

it('pronounces only the standalone Cyro brand as Cairo, retaining punctuation and other words', () => {
  const examples = [
    ['Cyro', 'Cairo'],
    ['CYRO, cyro! (cYrO).', 'Cairo, Cairo! (Cairo).'],
    ["Cyro's voice and Cyro’s call.", "Cairo's voice and Cairo’s call."],
    ['Welcome to Cyro — Cyro-powered chat.', 'Welcome to Cairo — Cairo-powered chat.'],
    ['Scyro Cyrobot myCyro Cyro2 2Cyro Cyro_name _Cyro', 'Scyro Cyrobot myCyro Cyro2 2Cyro Cyro_name _Cyro'],
    ['éCyro Cyroé Cyro\u0301 Cairo', 'éCyro Cyroé Cyro\u0301 Cairo'],
  ];
  for (const [input, expected] of examples) expect(normalizeSpeechPronunciation(input!)).toBe(expected);
});

it('validates the original 400-character limit before speech expansion without rewriting queued text', async () => {
  const original = 'Cyro '.repeat(79) + 'Cyro.';
  expect(original).toHaveLength(400);
  await synthesizeSpeech(original, 'voice3');
  expect(queuedSynthesis).toHaveBeenCalledExactlyOnceWith(original, 'af_heart', undefined);
  const spoken = normalizeSpeechPronunciation(original);
  expect(spoken).toHaveLength(480);
  expect(splitSpeechText(spoken).every(chunk => chunk.length <= 100)).toBe(true);
  await expect(synthesizeSpeech(original + '!', 'voice3')).rejects.toThrow(/1–400/);
  expect(queuedSynthesis).toHaveBeenCalledTimes(1);
});
