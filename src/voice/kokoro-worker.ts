import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeSpeechPronunciation, splitSpeechText } from './neural-text.js';
import { TTS_VOICES } from './catalog.js';
import { prepareSpeechText, TTS_MAX_CHARACTERS } from './speech-text.js';
import { multilingualPhonemes, type LocalPhonemizer } from './multilingual.js';

interface SpeechAudio { audio: Float32Array; sampling_rate: number }
interface InputIds { dims: number[] }
interface SpeechTokenizer { (text: string, options: { truncation: boolean }): { input_ids: InputIds } }
interface SpeechEngine {
  generate(text: string, options: { voice: string; speed: number }): Promise<SpeechAudio>;
  generate_from_ids(ids: InputIds, options: { voice: string; speed: number }): Promise<SpeechAudio>;
}
interface SpeechModel { dispose(): Promise<void> }
const voices: ReadonlySet<string> = new Set(TTS_VOICES.map(voice => voice.engineVoice));
const sampleRate = 24_000;
const maxSamples = 90 * sampleRate;

function toWav(parts: Float32Array[]): Buffer {
  const silence = 1_440; // 60 ms between inference chunks.
  const samples = parts.reduce((total, part) => total + part.length, 0) + Math.max(0, parts.length - 1) * silence;
  if (!samples || samples > maxSamples) throw new Error('Invalid speech length.');
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
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

async function main(): Promise<void> {
  const directory = process.argv[2];
  if (!directory || !process.send) throw new Error('Speech runtime requires a local installation and IPC.');
  // No remote model loading or cloud speech calls are permitted in an inference process.
  globalThis.fetch = async () => { throw new Error('Network access is disabled for local speech.'); };
  process.env.HF_HUB_OFFLINE = '1';
  const resolveRuntime = createRequire(path.join(directory, 'package.json'));
  // Keep Kokoro and Transformers on their ESM entries so their Tensor instanceof checks agree.
  const kokoroPath = resolveRuntime.resolve('kokoro-js').replace(/\.cjs$/, '.js');
  const { KokoroTTS } = await import(pathToFileURL(kokoroPath).href) as { KokoroTTS: new (model: SpeechModel, tokenizer: unknown) => SpeechEngine };
  const resolveKokoro = createRequire(kokoroPath);
  const transformersPath = resolveKokoro.resolve('@huggingface/transformers').replace(/transformers\.node\.cjs$/, 'transformers.node.mjs');
  const transformers = await import(pathToFileURL(transformersPath).href) as {
    env: { allowRemoteModels: boolean; allowLocalModels: boolean; useFSCache: boolean };
    StyleTextToSpeech2Model: { from_pretrained(directory: string, options: Record<string, unknown>): Promise<SpeechModel> };
    AutoTokenizer: { from_pretrained(directory: string, options: Record<string, unknown>): Promise<SpeechTokenizer> };
  };
  transformers.env.allowRemoteModels = false; transformers.env.allowLocalModels = true; transformers.env.useFSCache = false;
  const modelPath = path.join(directory, 'model').replaceAll('\\', '/');
  // KokoroTTS.from_pretrained drops these options, so construct its model explicitly.
  const model = await transformers.StyleTextToSpeech2Model.from_pretrained(modelPath, {
    dtype: 'q8', device: 'cpu', local_files_only: true,
    session_options: { intraOpNumThreads: 1, interOpNumThreads: 1, enableCpuMemArena: false, enableMemPattern: false, executionMode: 'sequential', logSeverityLevel: 3 },
  });
  const tokenizer = await transformers.AutoTokenizer.from_pretrained(modelPath, { local_files_only: true });
  const engine = new KokoroTTS(model, tokenizer);
  const phonemizerPath = path.join(directory, 'node_modules', 'ephone', 'ephone.js');
  let multilingual: LocalPhonemizer | undefined;
  async function localPhonemizer(): Promise<LocalPhonemizer> {
    if (!multilingual) {
      // Loaded only for a non-English request. All dictionaries/WASM ship in the pinned local package.
      const ephone = await import(pathToFileURL(phonemizerPath).href) as {
        default(options: Record<string, unknown>): Promise<LocalPhonemizer>; all: unknown;
      };
      multilingual = await ephone.default({ languages: ephone.all, print: () => {}, printErr: () => {} });
    }
    return multilingual;
  }
  let busy = false;
  process.on('message', (message: unknown) => {
    if (!message || typeof message !== 'object') return;
    const request = message as { type?: unknown; id?: unknown; text?: unknown; voice?: unknown; speakerName?: unknown };
    if (request.type !== 'synthesize' || !Number.isSafeInteger(request.id) || typeof request.text !== 'string' || request.text.length > TTS_MAX_CHARACTERS || !request.text.trim() || typeof request.voice !== 'string' || !voices.has(request.voice) || busy) {
      process.send?.({ type: 'error', id: request.id }); return;
    }
    busy = true;
    void (async () => {
      const parts: Float32Array[] = [];
      let count = 0;
      // Apply only after validating the original message: pronunciation spellings can expand its length.
      const voice = TTS_VOICES.find(item => item.engineVoice === request.voice)!;
      const spoken = prepareSpeechText(request.text as string, request.speakerName as string | undefined, voice.language);
      for (const text of splitSpeechText(voice.language === 'en' ? normalizeSpeechPronunciation(spoken) : spoken)) {
        let audio: SpeechAudio;
        if (voice.language === 'en') audio = await engine.generate(text, { voice: voice.engineVoice, speed: 0.95 });
        else {
          const phonemes = multilingualPhonemes(await localPhonemizer(), text, voice.language);
          const { input_ids } = tokenizer(phonemes, { truncation: false });
          const tokens = input_ids.dims.at(-1);
          // Never silently truncate a message to the model's 512-token context.
          if (!tokens || tokens <= 2 || tokens > 512) throw new Error('Speech chunk exceeds model limits.');
          audio = await engine.generate_from_ids(input_ids, { voice: voice.engineVoice, speed: 0.95 });
        }
        if (audio.sampling_rate !== sampleRate || !(audio.audio instanceof Float32Array)) throw new Error('Invalid speech output.');
        count += audio.audio.length;
        if (count > maxSamples) throw new Error('Speech was too long.');
        parts.push(audio.audio);
      }
      const wav = toWav(parts);
      process.send?.({ type: 'result', id: request.id, wav });
    })().catch(() => { process.send?.({ type: 'error', id: request.id }); }).finally(() => { busy = false; });
  });
  process.send({ type: 'ready' });
}

// Parent loss or cancellation cannot leave a native inference process orphaned.
process.once('disconnect', () => process.exit(0));
void main().catch(() => {
  if (process.send) process.send({ type: 'fatal' }, undefined, undefined, () => process.exit(1));
  else process.exit(1);
});
