import { existsSync } from 'node:fs';
import path from 'node:path';

export const GERMAN_RUNTIME_DIR = path.resolve('bin', 'tts-german');
export const GERMAN_MODELS = {
  piper_de_thorsten: { directory: 'vits-piper-de_DE-thorsten-medium', file: 'de_DE-thorsten-medium.onnx', sampleRate: 22_050 },
  piper_de_kerstin: { directory: 'vits-piper-de_DE-kerstin-low', file: 'de_DE-kerstin-low.onnx', sampleRate: 16_000 },
} as const;
export type GermanEngineVoice = keyof typeof GERMAN_MODELS;
export function isGermanEngineVoice(voice: string): voice is GermanEngineVoice { return Object.hasOwn(GERMAN_MODELS, voice); }

/** Optional installation failures never advertise a voice which the host cannot synthesize. */
export function germanRuntimeInstalled(directory = GERMAN_RUNTIME_DIR): boolean {
  return ['installed.json', 'package.json', 'node_modules/sherpa-onnx-node/package.json',
    ...Object.values(GERMAN_MODELS).flatMap(model => [model.file, 'tokens.txt', 'MODEL_CARD', 'espeak-ng-data/phontab', 'espeak-ng-data/phondata', 'espeak-ng-data/de_dict']
      .map(file => path.join('models', model.directory, file))),
  ].every(file => existsSync(path.join(directory, file)));
}

/** Kokoro shares all its voice weights; each German Piper voice has its own model. */
export function speechWorkerKey(voice: string): string { return isGermanEngineVoice(voice) ? voice : 'kokoro'; }
