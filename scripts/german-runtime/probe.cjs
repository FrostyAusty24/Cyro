// Public diagnostic sentence only: never reads bot credentials or member content.
const path = require('node:path');
const { createRequire } = require('node:module');
const runtime = process.argv[2], voice = process.argv[3];
const choices = { 'thorsten-medium': 22050, 'kerstin-low': 16000 };
if (!runtime || !Object.hasOwn(choices, voice)) process.exit(1);
globalThis.fetch = async () => { throw new Error('Speech probe is local only.'); };
const sherpa = createRequire(path.join(runtime, 'package.json'))('sherpa-onnx-node');
const directory = path.join(runtime, 'models', `vits-piper-de_DE-${voice}`);
const tts = new sherpa.OfflineTts({ model: { vits: {
  model: path.join(directory, `de_DE-${voice}.onnx`), tokens: path.join(directory, 'tokens.txt'), dataDir: path.join(directory, 'espeak-ng-data'),
}, numThreads: 1, debug: false, provider: 'cpu' }, maxNumSentences: 1 });
const audio = tts.generate({ text: 'Hallo, willkommen in unserer Gemeinschaft.', sid: 0, speed: 1 });
if (!(audio.samples instanceof Float32Array) || audio.sampleRate !== choices[voice] || audio.samples.length < audio.sampleRate / 2 || audio.samples.length > audio.sampleRate * 15) process.exit(1);
let energy = 0, peak = 0;
for (const sample of audio.samples) {
  if (!Number.isFinite(sample)) process.exit(1);
  energy += sample * sample; peak = Math.max(peak, Math.abs(sample));
}
if (peak < 0.03 || Math.sqrt(energy / audio.samples.length) < 0.003) process.exit(1);
console.log(JSON.stringify({ voice, sampleRate: audio.sampleRate, samples: audio.samples.length, audible: true }));
