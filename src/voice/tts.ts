import { NeuralTtsQueue, neuralRuntimeInstalled } from './neural-runtime.js';

export const TTS_VOICES = [
  { id: 'voice1', name: 'Daniel · British male', engineVoice: 'bm_daniel' },
  { id: 'voice2', name: 'Michael · American male', engineVoice: 'am_michael' },
  { id: 'voice3', name: 'Heart · American female', engineVoice: 'af_heart' },
  { id: 'voice4', name: 'Bella · American female', engineVoice: 'af_bella' },
] as const;
export type TtsVoiceId = typeof TTS_VOICES[number]['id'];
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
  if (!voice) throw new Error('Choose one of the four available TTS voices.');
  return runtime.synthesize(clean, voice.engineVoice, signal);
}
