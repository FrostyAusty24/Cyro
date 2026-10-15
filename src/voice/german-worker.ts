import { createRequire } from 'node:module';
import path from 'node:path';
import { GERMAN_MODELS, isGermanEngineVoice } from './german-runtime.js';
import { prepareSpeechText, TTS_MAX_CHARACTERS } from './speech-text.js';
import { splitSpeechText } from './neural-text.js';

interface Audio { samples: Float32Array; sampleRate: number }
interface GermanEngine { generate(request: { text: string; sid: number; speed: number }): Audio }

function wavPcm(parts: Float32Array[], sampleRate: number): Buffer {
  const silence = Math.round(sampleRate * 0.06);
  const samples = parts.reduce((sum, part) => sum + part.length, 0) + Math.max(0, parts.length - 1) * silence;
  if (!samples || samples > sampleRate * 90) throw new Error('Invalid speech length.');
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  let at = 44;
  for (const [index, part] of parts.entries()) {
    if (index) at += silence * 2;
    for (const sample of part) {
      if (!Number.isFinite(sample)) throw new Error('Invalid speech sample.');
      wav.writeInt16LE(Math.round(Math.min(1, Math.max(-1, sample)) * 32_767), at); at += 2;
    }
  }
  return wav;
}

function main(): void {
  const directory = process.argv[2], voice = process.argv[3];
  if (!directory || !voice || !isGermanEngineVoice(voice) || !process.send) throw new Error('German speech requires a local installation and IPC.');
  // Model assets and dictionaries are installed beforehand; speech never leaves the host.
  globalThis.fetch = async () => { throw new Error('Network access is disabled for local speech.'); };
  const resolveRuntime = createRequire(path.join(directory, 'package.json'));
  const sherpa = resolveRuntime('sherpa-onnx-node') as { OfflineTts: new (options: unknown) => GermanEngine };
  const model = GERMAN_MODELS[voice], modelDirectory = path.join(directory, 'models', model.directory);
  const engine = new sherpa.OfflineTts({ model: { vits: {
    model: path.join(modelDirectory, model.file), tokens: path.join(modelDirectory, 'tokens.txt'), dataDir: path.join(modelDirectory, 'espeak-ng-data'),
  }, provider: 'cpu', debug: false, numThreads: 1 }, maxNumSentences: 1 });
  process.on('message', (message: unknown) => {
    if (!message || typeof message !== 'object') return;
    const request = message as { type?: unknown; id?: unknown; text?: unknown; voice?: unknown; speakerName?: unknown };
    if (request.type !== 'synthesize' || !Number.isSafeInteger(request.id) || typeof request.text !== 'string'
      || request.text.length > TTS_MAX_CHARACTERS || !request.text.trim() || request.voice !== voice) {
      process.send?.({ type: 'error', id: request.id }); return;
    }
    try {
      const spoken = prepareSpeechText(request.text, request.speakerName as string | undefined, 'de');
      const parts: Float32Array[] = []; let count = 0;
      // Synchronous native inference is isolated in this bounded child, never in Discord's event loop.
      for (const text of splitSpeechText(spoken)) {
        const audio = engine.generate({ text, sid: 0, speed: 1 });
        if (!(audio.samples instanceof Float32Array) || audio.sampleRate !== model.sampleRate) throw new Error('Invalid speech output.');
        count += audio.samples.length;
        if (count > model.sampleRate * 90) throw new Error('Speech was too long.');
        parts.push(audio.samples);
      }
      process.send?.({ type: 'result', id: request.id, wav: wavPcm(parts, model.sampleRate) });
    } catch { process.send?.({ type: 'error', id: request.id }); }
  });
  process.send({ type: 'ready' });
}
process.once('disconnect', () => process.exit(0));
try { main(); } catch {
  if (process.send) process.send({ type: 'fatal' }, undefined, undefined, () => process.exit(1));
  else process.exit(1);
}
