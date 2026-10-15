// Optional local German neural speech. Downloads use public package/model assets only.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, lstat, mkdir, open, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = path.join(root, 'scripts', 'german-runtime');
const runtime = path.join(root, 'bin', 'tts-german');
const cache = path.join(runtime, '.install-cache');
const marker = path.join(runtime, 'installed.json');
const models = JSON.parse(await readFile(path.join(definition, 'models.json'), 'utf8'));
const digest = data => createHash('sha256').update(data).digest('hex');
async function checksum(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function matches(file, bytes, hash) {
  try { const stat = await lstat(file); return stat.isFile() && !stat.isSymbolicLink() && stat.size === bytes && await checksum(file) === hash; }
  catch { return false; }
}
async function removeOwned(directory, parent) {
  const stat = await lstat(directory).catch(() => undefined);
  if (!stat) return;
  if (stat.isSymbolicLink()) throw new Error('Unexpected link in the German speech installation.');
  const parentReal = await realpath(parent), targetReal = await realpath(directory);
  const relative = path.relative(parentReal, targetReal);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('German speech cleanup is outside its installation.');
  await rm(targetReal, { recursive: true, force: true });
}
async function run(command, args, cwd, limitMs = 180_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'ignore'] });
    let output = '', oversized = false;
    child.stdout.on('data', chunk => {
      output += chunk.toString();
      if (output.length > 512_000) { oversized = true; child.kill('SIGKILL'); }
    });
    const timeout = setTimeout(() => child.kill('SIGKILL'), limitMs);
    child.once('error', () => { clearTimeout(timeout); reject(new Error('German speech installation command could not start.')); });
    child.once('close', code => { clearTimeout(timeout); code === 0 && !oversized ? resolve(output) : reject(new Error('German speech installation command failed.')); });
  });
}
async function installPackages() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !/npm-cli\.js$/.test(npmCli)) throw new Error('Run this installer through npm run install-voices.');
  for (const name of ['package.json', 'package-lock.json']) await copyFile(path.join(definition, name), path.join(runtime, name));
  await run(process.execPath, [npmCli, 'ci', '--omit=dev', '--include=optional', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', cache], runtime, 240_000);
  await verifyPackages();
}
async function verifyPackages() {
  // Verify that the correct native platform addon actually loads before marking it installed.
  await run(process.execPath, ['-e', "const s=require('sherpa-onnx-node'); if(typeof s.OfflineTts!=='function')process.exit(1)"], runtime, 30_000);
}
async function download(model, archive) {
  const temporary = `${archive}.${process.pid}.tmp`;
  let file;
  try {
    const response = await fetch(`https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${model.directory}.tar.bz2`, { signal: AbortSignal.timeout(180_000) });
    if (!response.ok || !response.body) throw new Error('German speech model download unavailable.');
    file = await open(temporary, 'wx', 0o600);
    const hash = createHash('sha256'); let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > model.archiveBytes) throw new Error('German speech model exceeded its pinned size.');
      hash.update(chunk); await file.writeFile(chunk);
    }
    await file.close(); file = undefined;
    if (bytes !== model.archiveBytes || hash.digest('hex') !== model.archiveSha256) throw new Error('German speech archive failed checksum verification.');
    await rename(temporary, archive);
  } finally { await file?.close(); await rm(temporary, { force: true }).catch(() => {}); }
}
async function modelMatches(model, directory) {
  return await matches(path.join(directory, model.file), model.bytes, model.sha256)
    && await matches(path.join(directory, 'tokens.txt'), model.tokensBytes, model.tokensSha256)
    && (await Promise.all(['MODEL_CARD', 'espeak-ng-data/phontab', 'espeak-ng-data/phondata', 'espeak-ng-data/de_dict']
      .map(file => lstat(path.join(directory, file)).then(stat => stat.isFile() && !stat.isSymbolicLink()).catch(() => false)))).every(Boolean);
}
async function installModel(model) {
  const destination = path.join(runtime, 'models', model.directory);
  if (await modelMatches(model, destination)) return false;
  await mkdir(cache, { recursive: true });
  const archive = path.join(cache, `${model.directory}.tar.bz2`);
  await download(model, archive);
  // Only extract the immutable checksum-verified upstream archive, into our owned staging cache.
  const entries = (await run('tar', ['-tf', archive], cache)).split(/\r?\n/).filter(Boolean);
  if (!entries.length || entries.some(entry => !entry.startsWith(`${model.directory}/`) || entry.includes('..') || entry.includes('\\') || path.isAbsolute(entry))) {
    throw new Error('German speech archive contains an unexpected path.');
  }
  await run('tar', ['-xf', archive, '--no-same-owner', '-C', cache], cache);
  const extracted = path.join(cache, model.directory);
  if (!await modelMatches(model, extracted)) throw new Error('German speech files failed verification.');
  await mkdir(path.dirname(destination), { recursive: true });
  await removeOwned(destination, path.join(runtime, 'models'));
  await rename(extracted, destination);
  await rm(archive, { force: true });
  return true;
}

try {
  if (process.env.CYRO_SKIP_TTS_INSTALL === '1' || process.env.CYRO_SKIP_GERMAN_TTS_INSTALL === '1') {
    console.log('[Cyro voices] Optional German voice installation skipped by the operator.');
  } else {
    if (!(['linux', 'win32', 'darwin'].includes(process.platform) && ['x64', 'arm64'].includes(process.arch))
      || (process.platform === 'win32' && process.arch !== 'x64')) throw new Error('Unsupported German speech host.');
    await mkdir(runtime, { recursive: true });
    const lockHash = digest(await readFile(path.join(definition, 'package-lock.json')));
    let prior; try { prior = JSON.parse(await readFile(marker, 'utf8')); } catch { /* First installation. */ }
    const hasPackage = await lstat(path.join(runtime, 'node_modules', 'sherpa-onnx-node', 'package.json')).then(stat => stat.isFile()).catch(() => false);
    await rm(marker, { force: true });
    let repaired = !hasPackage || prior?.lockHash !== lockHash || prior?.platform !== process.platform || prior?.arch !== process.arch;
    if (!repaired) { try { await verifyPackages(); } catch { repaired = true; } }
    if (repaired) {
      console.log('[Cyro voices] Installing pinned local German CPU speech runtime.');
      await installPackages();
    }
    for (const model of models) if (await installModel(model)) repaired = true;
    const modelHash = digest(JSON.stringify(models));
    if (repaired || prior?.modelHash !== modelHash || prior?.synthesisVerified !== true) {
      for (const voice of ['thorsten-medium', 'kerstin-low']) {
        const result = JSON.parse(await run(process.execPath, [path.join(definition, 'probe.cjs'), runtime, voice], runtime, 30_000));
        if (result.voice !== voice || result.audible !== true) throw new Error('German voice failed its local synthesis check.');
        console.log(`[Cyro voices] German ${voice.startsWith('thorsten') ? 'male' : 'female'} synthesis verified: ${result.sampleRate} Hz, audible PCM.`);
      }
    }
    for (const name of ['SHERPA-LICENSE.txt', 'ESPEAK-LICENSE.txt', 'THIRD-PARTY-NOTICES.txt']) await copyFile(path.join(definition, name), path.join(runtime, name));
    await writeFile(marker, JSON.stringify({ engine: 'sherpa-onnx', version: '1.13.8', lockHash, modelHash, synthesisVerified: true, platform: process.platform, arch: process.arch, models: models.map(model => ({ name: model.directory, sha256: model.sha256 })) }) + '\n', { mode: 0o600 });
    console.log('[Cyro voices] Verified two local German neural voices. Speech text stays on this host.');
  }
} catch (error) {
  console.warn(`[Cyro voices] Optional German voices unavailable: ${error instanceof Error ? error.message : 'installation failed'}`);
  console.warn('[Cyro voices] Other voice languages and bot features can start. Retry with npm run install-voices.');
  if (process.argv.includes('--required')) process.exitCode = 1;
} finally { await removeOwned(cache, runtime).catch(() => {}); }
