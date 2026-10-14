import { NeuralTtsQueue, neuralRuntimeInstalled } from './neural-runtime.js';
import { TTS_VOICES } from './catalog.js';
import { prepareSpeechText, speechSpeakerName } from './speech-text.js';

export { TTS_VOICES, type TtsVoiceId } from './catalog.js';
export { TTS_MAX_CHARACTERS } from './speech-text.js';
const runtime = new NeuralTtsQueue();

export function ttsAvailable(): boolean { return neuralRuntimeInstalled(); }
export function shutdownSpeech(): Promise<void> { return runtime.close(); }

/** Neural speech stays on the bot host, with one shared bounded model process across all servers. */
export async function synthesizeSpeech(text: string, voiceId: string = 'voice1', signal?: AbortSignal, speakerName?: string): Promise<Buffer> {
  signal?.throwIfAborted();
  const clean = prepareSpeechText(text);
  if (speakerName !== undefined) prepareSpeechText(clean, speakerName);
  const voice = TTS_VOICES.find(item => item.id === voiceId);
  if (!voice) throw new Error('Choose one of the available TTS voices.');
  return speakerName === undefined ? runtime.synthesize(clean, voice.engineVoice, signal) : runtime.synthesize(clean, voice.engineVoice, signal, speechSpeakerName(speakerName));
}
