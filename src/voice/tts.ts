import { NeuralTtsQueue, neuralRuntimeInstalled } from './neural-runtime.js';
import { TTS_VOICES } from './catalog.js';

export { TTS_VOICES, type TtsVoiceId } from './catalog.js';
export const TTS_MAX_CHARACTERS = 400;
const runtime = new NeuralTtsQueue();

export function ttsAvailable(): boolean { return neuralRuntimeInstalled(); }
export function shutdownSpeech(): Promise<void> { return runtime.close(); }

/** Neural speech stays on the bot host, with one shared bounded model process across all servers. */
export async function synthesizeSpeech(text: string, voiceId: string = 'voice1', signal?: AbortSignal): Promise<Buffer> {
  signal?.throwIfAborted();
  const clean = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  if (!clean || clean.length > TTS_MAX_CHARACTERS) throw new Error(`Speech must contain 1–${TTS_MAX_CHARACTERS} characters.`);
  const voice = TTS_VOICES.find(item => item.id === voiceId);
  if (!voice) throw new Error('Choose one of the available TTS voices.');
  return runtime.synthesize(clean, voice.engineVoice, signal);
}
