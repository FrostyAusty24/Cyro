import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { decodeAudio, type AudioSource } from './audio.js';
import { synthesizeSpeech, ttsAvailable, voiceAvailable } from './tts.js';
import { TTS_VOICES } from './catalog.js';

export interface VoiceRuntimeCheck { audio: boolean; tts: boolean; dave: boolean }
const require = createRequire(import.meta.url);

function silenceWav(): Buffer {
  const bytes = 48_000;
  const wav = Buffer.alloc(44 + bytes);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + bytes, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(48_000, 24); wav.writeUInt32LE(192_000, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(bytes, 40);
  return wav;
}

async function probeAudio(wav: Buffer, signal: AbortSignal, requireSpeech: boolean): Promise<boolean> {
  let source: AudioSource | undefined, encoded: Readable | undefined, volume: Readable | undefined;
  let decoder: import('opusscript') | undefined;
  try {
    source = await decodeAudio(Readable.from([wav]), 'Local voice runtime check', { signal, maxDurationSeconds: 5 });
    const { createAudioResource, StreamType } = await import('@discordjs/voice');
    signal.throwIfAborted();
    const resource = createAudioResource(source.stream, { inputType: StreamType.Raw, inlineVolume: true });
    encoded = resource.playStream; volume = resource.volume;
    const OpusScript = require('opusscript') as typeof import('opusscript');
    decoder = new OpusScript(48_000, 2, OpusScript.Application.AUDIO);
    let packets = 0, samples = 0, energy = 0, peak = 0;
    encoded.on('error', () => {});
    await new Promise<void>((resolve, reject) => {
      const stream = encoded!;
      const finish = (error?: Error): void => {
        stream.removeListener('data', packet); stream.removeListener('error', failed); stream.removeListener('end', ended);
        signal.removeEventListener('abort', aborted);
        if (error) reject(error); else resolve();
      };
      const packet = (data: unknown): void => {
        if (!Buffer.isBuffer(data) || !data.length) { finish(new Error('No Opus packet.')); return; }
        try {
          const pcm = decoder!.decode(data); packets++;
          for (let i = 0; i + 1 < pcm.length; i += 2) {
            const value = pcm.readInt16LE(i); samples++; energy += value * value; peak = Math.max(peak, Math.abs(value));
          }
        } catch { finish(new Error('Invalid Opus packet.')); }
      };
      const failed = (error: Error): void => finish(error);
      const ended = (): void => finish(packets > 0 ? undefined : new Error('No encoded audio.'));
      const aborted = (): void => finish(new Error('Voice runtime check timed out.'));
      stream.on('data', packet); stream.once('error', failed); stream.once('end', ended);
      signal.addEventListener('abort', aborted, { once: true });
      if (signal.aborted) aborted();
    });
    // Assess the full fixed phrase; its first packets can legitimately be quiet.
    return !requireSpeech || samples > 0 && peak > 512 && Math.sqrt(energy / samples) > 64;
  } finally { encoded?.destroy(); volume?.destroy(); source?.cleanup(); decoder?.delete(); }
}

/** Local fixed probes only. A missing/slow neural model cannot disable otherwise working music. */
export async function checkVoiceRuntime(): Promise<VoiceRuntimeCheck> {
  const result: VoiceRuntimeCheck = { audio: false, tts: false, dave: false };
  try {
    const dave = require('@snazzah/davey') as typeof import('@snazzah/davey');
    const session = new dave.DAVESession(dave.DAVE_PROTOCOL_VERSION, '1', '2');
    try { result.dave = dave.DAVE_PROTOCOL_VERSION >= 1 && session.getSerializedKeyPackage().length > 0; }
    finally { session.reset(); }
  } catch { /* Capability flags keep optional voice failures out of unrelated bot features. */ }
  try { result.audio = await probeAudio(silenceWav(), AbortSignal.timeout(12_000), false); } catch { /* No audio decoder. */ }
  if (result.audio && ttsAvailable()) {
    const signal = AbortSignal.timeout(25_000);
    const voice = TTS_VOICES.find(voice => voiceAvailable(voice.id));
    try { if (voice) result.tts = await probeAudio(await synthesizeSpeech(voice.language === 'de' ? 'Hallo, dies ist eine Sprachprüfung.' : 'Cyro voice check', voice.id, signal), signal, true); }
    catch { /* Preserve working music when the optional neural runtime is unavailable. */ }
  }
  return result;
}
