// Optional source runtime installer. No application configuration or credentials are read.
import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { hostname } from 'node:os';
import { fileURLToPath } from 'node:url';

const version = '2026.08.19';
const assets = {
  'win32-x64': ['yt-dlp.exe', '66674953fe251b89f4d08c5f0e35e0728679bd67ab3d7d05c0562af101dd3e7a'],
  'linux-x64': ['yt-dlp_linux', '58162f9bfdc27458ea47bfcb311cf47028f17d8154a8bf7d689861d46399230a'],
  'linux-arm64': ['yt-dlp_linux_aarch64', 'b16e4dab368a816cd05d477d698a605a6ae87ccee1c8ffd38fa21d7254141fcc'],
};
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = resolve(root, 'bin');
const target = resolve(bin, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const temporary = `${target}.${process.pid}.tmp`;
const digest = value => createHash('sha256').update(value).digest('hex');
const platform = `${process.platform}-${process.arch}`;
const host = createHash('sha256').update(hostname()).digest('hex').slice(0, 16);
const [asset, expected] = assets[platform] ?? [];
let installed = false;

async function download(name, maximum) {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`https://github.com/yt-dlp/yt-dlp/releases/download/${version}/${name}`, { signal: controller.signal });
    if (!response.ok || !response.body) throw new Error(`Official release server returned status ${response.status}.`);
    const chunks = []; let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > maximum) { controller.abort(); throw new Error('Release asset exceeded its size limit.'); }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } finally { clearTimeout(deadline); }
}

try {
  if (!asset || !expected) throw new Error(`No pinned source binary for ${platform}.`);
  let current;
  try { current = await readFile(target); } catch { /* Fresh installation. */ }
  if (!current || digest(current) !== expected) {
    // Compare the hardcoded version pin with the official release manifest before installation.
    const sums = (await download('SHA2-256SUMS', 128 * 1024)).toString('utf8');
    const manifestHash = sums.split(/\r?\n/).find(line => line.split(/\s+/)[1]?.replace(/^\*/, '') === asset)?.split(/\s+/)[0];
    if (manifestHash !== expected) throw new Error('Official release manifest did not match the pinned checksum.');
    const binary = await download(asset, 64 * 1024 * 1024);
    if (digest(binary) !== expected) throw new Error('Downloaded source binary failed SHA256 verification.');
    await mkdir(bin, { recursive: true });
    await writeFile(temporary, binary, { flag: 'wx', mode: 0o700 });
    await rename(temporary, target);
    console.log(`[Cyro YouTube] Installed verified ${version} for ${platform}.`);
  } else console.log(`[Cyro YouTube] Verified ${version} already installed.`);
  if (process.platform !== 'win32') await chmod(target, 0o700);
  installed = true;
} catch {
  // A network outage or unsupported optional runtime must not prevent moderation/dashboard startup.
  console.warn('[Cyro YouTube] Optional source installation unavailable. Direct audio and other bot features can still start.');
  if (process.argv.includes('--required')) process.exitCode = 1;
} finally { await rm(temporary, { force: true }).catch(() => {}); }

if (installed && (process.argv.includes('--probe') || process.argv.includes('--probe-once'))) {
  const marker = resolve(bin, `youtube-probe-${version}.json`);
  let prior;
  try { prior = JSON.parse(await readFile(marker, 'utf8')); } catch { /* No prior successful host check. */ }
  if (process.argv.includes('--probe') || prior?.success !== true || prior?.sha256 !== expected || prior?.platform !== platform || prior?.host !== host) {
    try {
      const { checkYouTube } = await import('./check-youtube.mjs');
      const result = await checkYouTube();
      await writeFile(marker, `${JSON.stringify({ ...result, version, platform, host, sha256: expected }, null, 2)}\n`, { mode: 0o600 });
      console.log(`[Cyro YouTube] Host source probe ${result.success ? 'passed' : 'unavailable'}; metadata=${result.metadata}, audio=${result.audio}.`);
      if (!result.success && result.delivery) console.log(`[Cyro YouTube] Source delivery: ${JSON.stringify(result.delivery)}.`);
    } catch { console.warn('[Cyro YouTube] Optional host probe unavailable (build or source not ready). Bot startup will continue.'); }
  } else console.log('[Cyro YouTube] This installed source already passed its host probe.');
}
