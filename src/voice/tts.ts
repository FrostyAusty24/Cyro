import { NeuralTtsQueue, neuralRuntimeInstalled } from './neural-runtime.js';
import { TTS_VOICES } from './catalog.js';
import { prepareSpeechText, speechSpeakerName } from './speech-text.js';
import { germanRuntimeInstalled } from './german-runtime.js';

export { TTS_VOICES, type TtsVoiceId } from './catalog.js';
export { TTS_MAX_CHARACTERS } from './speech-text.js';
const runtime = new NeuralTtsQueue();

export function ttsAvailable(): boolean { return neuralRuntimeInstalled() || germanRuntimeInstalled(); }
export function voiceAvailable(voiceId: string): boolean {
  const voice = TTS_VOICES.find(item => item.id === voiceId);
  return !!voice && (voice.language === 'de' ? germanRuntimeInstalled() : neuralRuntimeInstalled());
}
export function shutdownSpeech(): Promise<void> { return runtime.close(); }

/** Neural speech stays on the bot host, with one shared bounded model process across all servers. */
export async function synthesizeSpeech(text: string, voiceId: string = 'voice1', signal?: AbortSignal, speakerName?: string): Promise<Buffer> {
  signal?.throwIfAborted();
  const clean = prepareSpeechText(text);
  if (speakerName !== undefined) prepareSpeechText(clean, speakerName);
  const voice = TTS_VOICES.find(item => item.id === voiceId);
  if (!voice) throw new Error('Choose one of the available TTS voices.');
  if (voice.language === 'de' && !germanRuntimeInstalled()) throw new Error('German voices are not installed on this host yet. Choose another language or ask the bot operator to install them.');
  return speakerName === undefined ? runtime.synthesize(clean, voice.engineVoice, signal) : runtime.synthesize(clean, voice.engineVoice, signal, speechSpeakerName(speakerName));
}
