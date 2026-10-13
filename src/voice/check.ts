import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { decodeAudio, type AudioSource } from './audio.js';
import { synthesizeSpeech } from './tts.js';

export interface VoiceRuntimeCheck { audio: boolean; tts: boolean; dave: boolean }
const require = createRequire(import.meta.url);

function silenceWav(): Buffer {
  const bytes = 48_000; // A quarter-second of stereo 48 kHz signed 16-bit silence.
  const wav = Buffer.alloc(44 + bytes);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + bytes, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(48_000, 24); wav.writeUInt32LE(192_000, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(bytes, 40);
  return wav;
}

/** Credential-free local smoke check. Never joins Discord, fetches media, or speaks user text. */
export async function checkVoiceRuntime(): Promise<VoiceRuntimeCheck> {
  const result: VoiceRuntimeCheck = { audio: false, tts: false, dave: false };
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 12_000);
  deadline.unref();
  let source: AudioSource | undefined;
  let encoded: Readable | undefined;
  let volume: Readable | undefined;
  try {
    // Instantiation and key-package generation load the platform native library, not just its metadata.
    try {
      const dave = require('@snazzah/davey') as typeof import('@snazzah/davey');
      const session = new dave.DAVESession(dave.DAVE_PROTOCOL_VERSION, '1', '2');
      try { result.dave = dave.DAVE_PROTOCOL_VERSION >= 1 && session.getSerializedKeyPackage().length > 0; }
      finally { session.reset(); }
    } catch { /* Expose a false capability rather than blocking the rest of the bot. */ }

    let wav: Buffer;
    let speechGenerated = false;
    try {
      wav = await synthesizeSpeech('Cyro voice check', 'voice1', controller.signal);
      speechGenerated = true;
    } catch { wav = silenceWav(); }
    controller.signal.throwIfAborted();
    source = await decodeAudio(Readable.from([wav]), 'Local voice runtime check', { signal: controller.signal, maxDurationSeconds: 5 });
    const { createAudioResource, StreamType } = await import('@discordjs/voice');
    controller.signal.throwIfAborted();
    const resource = createAudioResource(source.stream, { inputType: StreamType.Raw, inlineVolume: true });
    encoded = resource.playStream;
    volume = resource.volume;
    // Keep a handler throughout teardown; destroying a pipeline may report cancellation asynchronously.
    encoded.on('error', () => {});
    await new Promise<void>((resolve, reject) => {
      const stream = encoded!;
      const finish = (error?: Error): void => {
        stream.removeListener('data', packet);
        stream.removeListener('error', failed);
        stream.removeListener('end', ended);
        controller.signal.removeEventListener('abort', aborted);
        if (error) reject(error); else resolve();
      };
      const packet = (data: unknown): void => finish(Buffer.isBuffer(data) && data.length > 0 ? undefined : new Error('No Opus packet.'));
      const failed = (error: Error): void => finish(error);
      const ended = (): void => finish(new Error('The audio encoder did not produce a packet.'));
      const aborted = (): void => finish(new Error('Voice runtime check timed out.'));
      stream.once('data', packet); stream.once('error', failed); stream.once('end', ended);
      controller.signal.addEventListener('abort', aborted, { once: true });
      if (controller.signal.aborted) aborted();
    });
    result.audio = true;
    result.tts = speechGenerated;
  } catch { /* Startup reports individual capability flags without credentials or user content. */ }
  finally {
    clearTimeout(deadline);
    controller.abort();
    encoded?.destroy();
    volume?.destroy();
    source?.cleanup();
  }
  return result;
}
