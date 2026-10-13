// Optional, host-local neural speech runtime. Downloads contain public software/model
// assets only. Discord messages and application credentials are never used here.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = path.join(root, 'scripts', 'kokoro-runtime');
const runtime = path.join(root, 'bin', 'tts');
const cache = path.join(runtime, '.install-cache');
const marker = path.join(runtime, 'installed.json');
const revision = '1939ad2a8e416c0acfeecc08a694d14ef25f2231';
const assets = [
  ['config.json', 44, 'df34b4f930b23447cd4dc410fabfb42eb3f24e803e6c3f97d618fb359380a36f'],
  ['tokenizer.json', 3497, '77a02c8e164413299b4b4c403b14f8e0e1c1b727db4d46a09d6327b861060a34'],
  ['tokenizer_config.json', 113, 'be1cb066d6ef6b074b3f15e6a6dd21ac88ff3cdaedf325f0aaed686c70f75d20'],
  ['onnx/model_quantized.onnx', 92361116, 'fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478'],
];
const digest = data => createHash('sha256').update(data).digest('hex');
async function checksum(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function matches(file, bytes, sha256) {
  try { const stat = await lstat(file); return stat.isFile() && !stat.isSymbolicLink() && stat.size === bytes && await checksum(file) === sha256; }
  catch { return false; }
}

// Recursive removal is restricted to our installer cache and bundled binaries for
// other platforms. Resolve/check both parent and target; never follow a symlink.
async function removeOwned(directory, parent) {
  const parentReal = await realpath(parent);
  const stat = await lstat(directory).catch(() => undefined);
  if (!stat) return;
  if (stat.isSymbolicLink()) throw new Error('Unexpected link in the speech installation.');
  const targetReal = await realpath(directory);
  const relative = path.relative(parentReal, targetReal);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Speech cleanup path is outside its installation.');
  await rm(targetReal, { recursive: true, force: true });
}
async function pruneOtherPlatforms() {
  const binaries = path.join(runtime, 'node_modules', 'onnxruntime-node', 'bin', 'napi-v3');
  for (const entry of await readdir(binaries, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const platformDir = path.join(binaries, entry.name);
    if (entry.name !== process.platform) await removeOwned(platformDir, binaries);
    else for (const arch of await readdir(platformDir, { withFileTypes: true })) {
      if (arch.isDirectory() && arch.name !== process.arch) await removeOwned(path.join(platformDir, arch.name), platformDir);
    }
  }
}
async function installPackages() {
  // npm lifecycle provides this exact CLI path on Windows and Linux. Never run a
  // shell command containing paths, tokens, or user-controlled command fragments.
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !/npm-cli\.js$/.test(npmCli)) throw new Error('Run this installer through npm run install-voices.');
  await copyFile(path.join(definition, 'package.json'), path.join(runtime, 'package.json'));
  await copyFile(path.join(definition, 'package-lock.json'), path.join(runtime, 'package-lock.json'));
  await new Promise((resolve, reject) => {
    // CPU ONNX and Sharp bindings ship in their registry packages. Skipping all
    // lifecycle scripts also prevents GPU downloads or orphan install subprocesses.
    const child = spawn(process.execPath, [npmCli, 'ci', '--omit=dev', '--include=optional', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', cache], {
      cwd: runtime, stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true,
      env: { ...process.env, ONNXRUNTIME_NODE_INSTALL_CUDA: 'skip', npm_config_onnxruntime_node_install_cuda: 'skip' },
    });
    const deadline = setTimeout(() => child.kill('SIGKILL'), 240_000);
    child.once('error', () => { clearTimeout(deadline); reject(new Error('Speech package installation could not start.')); });
    child.once('exit', code => { clearTimeout(deadline); code === 0 ? resolve() : reject(new Error('Speech package installation failed.')); });
  });
  await pruneOtherPlatforms();
}
async function downloadAsset(name, bytes, sha256) {
  const target = path.join(runtime, 'model', name);
  if (await matches(target, bytes, sha256)) return;
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  const signal = AbortSignal.timeout(180_000);
  let file;
  try {
    const response = await fetch(`https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/${revision}/${name}`, { signal });
    if (!response.ok || !response.body) throw new Error('Public speech model download unavailable.');
    file = await open(temporary, 'wx', 0o600);
    const hash = createHash('sha256'); let received = 0;
    for await (const chunk of response.body) {
      received += chunk.length;
      if (received > bytes) throw new Error('Speech model exceeded its pinned size.');
      hash.update(chunk); await file.writeFile(chunk);
    }
    await file.close(); file = undefined;
    if (received !== bytes || hash.digest('hex') !== sha256) throw new Error('Speech model failed checksum verification.');
    await rename(temporary, target);
  } finally { await file?.close(); await rm(temporary, { force: true }).catch(() => {}); }
}

try {
  if (process.env.CYRO_SKIP_TTS_INSTALL === '1') {
    console.log('[Cyro voices] Optional neural voice installation skipped by the operator.');
  } else {
    if (!['linux', 'win32', 'darwin'].includes(process.platform) || !['x64', 'arm64'].includes(process.arch)) throw new Error('Unsupported speech host.');
    await mkdir(runtime, { recursive: true });
    const lockHash = digest(await readFile(path.join(definition, 'package-lock.json')));
    let prior; try { prior = JSON.parse(await readFile(marker, 'utf8')); } catch { /* Fresh installation. */ }
    const installedPackage = path.join(runtime, 'node_modules', 'kokoro-js', 'package.json');
    const hasPackage = await lstat(installedPackage).then(stat => stat.isFile()).catch(() => false);
    if (!hasPackage || prior?.lockHash !== lockHash || prior?.platform !== process.platform || prior?.arch !== process.arch) {
      console.log('[Cyro voices] Installing pinned CPU-only Kokoro runtime (first install can take a few minutes).');
      await rm(marker, { force: true });
      try { await installPackages(); } finally { await removeOwned(cache, runtime).catch(() => {}); }
    }
    for (const asset of assets) await downloadAsset(...asset);
    await copyFile(path.join(definition, 'MODEL-LICENSE.txt'), path.join(runtime, 'model', 'LICENSE.txt'));
    await writeFile(marker, JSON.stringify({ engine: 'kokoro', version: '1.2.1', revision, lockHash, platform: process.platform, arch: process.arch, modelSha256: assets[3][2] }) + '\n', { mode: 0o600 });
    console.log('[Cyro voices] Verified Kokoro q8 and four local neural voices. No speech text is sent to an external service.');
  }
} catch (error) {
  console.warn(`[Cyro voices] Optional neural voices unavailable: ${error instanceof Error ? error.message : 'installation failed'}`);
  console.warn('[Cyro voices] Other bot features can start. Retry with npm run install-voices.');
  if (process.argv.includes('--required')) process.exitCode = 1;
}
