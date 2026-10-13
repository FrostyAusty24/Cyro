import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';

export const TTS_VOICES = [
  { id: 'voice1', name: 'Atlas · male', engineVoice: 'en-us+m1' },
  { id: 'voice2', name: 'Rowan · male', engineVoice: 'en-us+m3' },
  { id: 'voice3', name: 'Nova · female', engineVoice: 'en-us+f1' },
  { id: 'voice4', name: 'Skye · female', engineVoice: 'en-us+f3' },
] as const;
export type TtsVoiceId = typeof TTS_VOICES[number]['id'];
export const TTS_MAX_CHARACTERS = 400;
const require = createRequire(import.meta.url);
let activeSyntheses = 0;

// eSpeak runs away from the Gateway thread. No network service receives message content.
// Node 24's fetch cannot load this older package's local WASM URL; its built-in FS loader can.
// text2wav 0.0.14 forwards options directly into Emscripten's CLI argv. Numeric values must
// be strings: passing amplitude: 90 as a number becomes an empty argument and silences speech.
const workerProgram = `
  const { parentPort, workerData } = require('node:worker_threads');
  globalThis.fetch = undefined;
  const synthesize = require(workerData.modulePath);
  synthesize(' ' + workerData.text, { voice: workerData.voice, speed: '175', amplitude: '90', hasTags: false })
    .then(wav => parentPort.postMessage(wav));
`;

export function ttsAvailable(): boolean {
  try { require.resolve('text2wav'); return true; } catch { return false; }
}

/** Four local synthetic voices; bounded CPU, memory, duration and output, cancellable on leave/shutdown. */
export async function synthesizeSpeech(text: string, voiceId: string = 'voice1', signal?: AbortSignal): Promise<Buffer> {
  signal?.throwIfAborted();
  const clean = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  if (!clean || clean.length > TTS_MAX_CHARACTERS) throw new Error(`Speech must contain 1–${TTS_MAX_CHARACTERS} characters.`);
  const voice = TTS_VOICES.find(item => item.id === voiceId);
  if (!voice) throw new Error('Choose one of the four available TTS voices.');
  if (activeSyntheses >= 2) throw new Error('Cyro is speaking in several calls. Try again shortly.');
  const modulePath = require.resolve('text2wav');
  activeSyntheses++;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      const worker = new Worker(workerProgram, {
        eval: true, workerData: { modulePath, text: clean, voice: voice.engineVoice },
        resourceLimits: { maxOldGenerationSizeMb: 96, stackSizeMb: 4 },
      });
      let settled = false;
      const finish = (error?: Error, result?: Buffer): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
        void worker.terminate();
        if (error) reject(error); else resolve(result!);
      };
      const abort = (): void => finish(new Error('Speech was cancelled.'));
      const timeout = setTimeout(() => finish(new Error('Speech generation timed out. Try a shorter message.')), 15_000);
      timeout.unref();
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) { abort(); return; }
      worker.once('error', () => finish(new Error('The offline speech engine could not generate this message.')));
      worker.once('exit', () => { if (!settled) finish(new Error('The offline speech engine stopped unexpectedly.')); });
      worker.once('message', (result: unknown) => {
        if (!(result instanceof Uint8Array) || result.byteLength < 44 || result.byteLength > 4 * 1024 * 1024) {
          finish(new Error('The offline speech engine returned invalid audio.')); return;
        }
        const wav = Buffer.from(result);
        if (wav.subarray(0, 4).toString() !== 'RIFF' || wav.subarray(8, 12).toString() !== 'WAVE') {
          finish(new Error('The offline speech engine returned invalid audio.')); return;
        }
        finish(undefined, wav);
      });
    });
  } finally { activeSyntheses--; }
}
