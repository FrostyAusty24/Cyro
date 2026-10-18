import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { parse } from 'dotenv';

export async function createLaunchPlan({ root = path.dirname(fileURLToPath(import.meta.url)), env = process.env } = {}) {
  root = path.resolve(root);
  let fileEnv = {};
  try { fileEnv = parse(await readFile(path.join(root, '.env'))); }
  catch (error) { if (error?.code !== 'ENOENT') throw new Error('The private environment file could not be read.'); }
  // Hosting environment values win over the private file, as with dotenv.
  const mergedEnv = { ...fileEnv, ...Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined)) };
  const internalPort = mergedEnv.CYRO_INTERNAL_DASHBOARD_PORT?.trim() || '1029';
  if (!/^\d{1,5}$/.test(internalPort) || Number(internalPort) < 1 || Number(internalPort) > 65535) {
    throw new Error('CYRO_INTERNAL_DASHBOARD_PORT must be a port from 1 to 65535.');
  }
  const botEntry = path.join(root, 'dist/src/index.js');
  try {
    if (!(await stat(botEntry)).isFile()) throw new Error();
    await access(botEntry, constants.R_OK);
  } catch { throw new Error('Bot entry is missing or unreadable. Place launcher.js in the bot project root.'); }
  const botEnv = { ...mergedEnv, DASHBOARD_HOST: '127.0.0.1', DASHBOARD_PORT: String(Number(internalPort)), PORT: String(Number(internalPort)) };
  delete botEnv.TUNNEL_TOKEN;
  delete botEnv.TUNNEL_TOKEN_FILE;
  const tunnelEnv = {};
  for (const key of ['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'SYSTEMROOT', 'WINDIR', 'SSL_CERT_FILE', 'SSL_CERT_DIR']) {
    if (mergedEnv[key] !== undefined) tunnelEnv[key] = mergedEnv[key];
  }
  const binary = path.join(root, 'bin', 'cloudflared');
  const tokenFile = path.join(root, '.secrets/cloudflared-token');
  return {
    bot: { command: process.execPath, args: [botEntry], cwd: root, env: botEnv, stdio: ['ignore', 'inherit', 'inherit'] },
    // Never relay raw tunnel output or pass its credential as an argument value.
    tunnel: { command: binary, args: ['tunnel', '--no-autoupdate', 'run', '--token-file', tokenFile], cwd: root, env: tunnelEnv, stdio: ['ignore', 'ignore', 'ignore'] },
    // Repairing the token or binary recovers on a retry without restarting Discord.
    prepareTunnel: async () => {
      try {
        if (!(await stat(binary)).isFile()) return false;
        await access(binary, constants.X_OK);
        const token = await stat(tokenFile);
        if (!token.isFile() || token.size === 0) return false;
        await access(tokenFile, constants.R_OK);
        return true;
      } catch { return false; }
    },
  };
}

export function supervise(plan, {
  spawnProcess = spawn, signals = process, log = console.log,
  graceMs = 65_000, forceMs = 5_000,
  retryInitialMs = 1_000, retryMaxMs = 60_000, stableMs = 120_000,
  now = Date.now,
} = {}) {
  if (![graceMs, forceMs, retryInitialMs, retryMaxMs, stableMs].every(value => Number.isFinite(value) && value > 0) || retryMaxMs < retryInitialMs) {
    throw new Error('Launcher timer settings are invalid.');
  }
  const records = new Set();
  let tunnelRecord;
  let tunnelCheckActive = false;
  let stopping = false;
  let starting = true;
  let finished = false;
  let result = 0;
  let graceTimer;
  let forceTimer;
  let retryTimer;
  let nextDelay = retryInitialMs;
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  const handlers = {};
  const sendSignal = (record, signal) => {
    try { record.child.kill(signal); }
    catch { result = 1; log('Cyro launcher: could not signal ' + record.name + '; host cleanup may be required.'); }
  };
  const finish = (forced = false) => {
    if (finished || starting || !stopping || (!forced && records.size > 0)) return;
    finished = true;
    clearTimeout(graceTimer);
    clearTimeout(forceTimer);
    clearTimeout(retryTimer);
    for (const [signal, handler] of Object.entries(handlers)) signals.off(signal, handler);
    resolveDone(result);
  };
  const stop = (signal = 'SIGTERM') => {
    if (stopping) return;
    stopping = true;
    clearTimeout(retryTimer);
    retryTimer = undefined;
    log('Cyro launcher: stopping bot and tunnel.');
    graceTimer = setTimeout(() => {
      result = 1;
      log('Cyro launcher: graceful stop deadline exceeded; forcing remaining children to stop.');
      forceTimer = setTimeout(() => {
        log('Cyro launcher: child exit was not confirmed; host container cleanup is required.');
        finish(true);
      }, forceMs);
      for (const record of records) sendSignal(record, 'SIGKILL');
      finish();
    }, graceMs);
    for (const record of records) sendSignal(record, signal);
    finish();
  };
  const scheduleTunnel = () => {
    if (stopping || finished || tunnelRecord || retryTimer !== undefined) return;
    const delay = nextDelay;
    nextDelay = Math.min(retryMaxMs, nextDelay * 2);
    log('Cyro launcher: tunnel unavailable; retrying in ' + delay + ' ms. The bot remains running.');
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void startTunnel();
    }, delay);
  };
  const launch = name => {
    const spec = plan[name];
    let child;
    try {
      child = spawnProcess(spec.command, spec.args, { cwd: spec.cwd, env: spec.env, stdio: spec.stdio, shell: false, detached: false });
    } catch {
      log('Cyro launcher: ' + name + ' could not be created; inspect host permissions and configuration.');
      if (name === 'bot') { result = 1; stop(); } else scheduleTunnel();
      return;
    }
    const record = { name, child, startedAt: now(), errorSeen: false };
    records.add(record);
    if (name === 'tunnel') tunnelRecord = record;
    child.on('error', () => {
      if (record.errorSeen) return;
      record.errorSeen = true;
      log('Cyro launcher: ' + name + ' process failed; inspect host permissions and configuration.');
      if (name === 'bot') { result = 1; stop(); }
      // Wait for close after an error: no replacement while an old child may exist.
    });
    child.once('close', code => {
      records.delete(record);
      if (tunnelRecord === record) tunnelRecord = undefined;
      if ((name === 'bot' || stopping) && typeof code === 'number' && code !== 0) result = 1;
      if (!stopping) {
        if (name === 'bot') {
          result = 1;
          log('Cyro launcher: bot exited unexpectedly; no automatic bot restart.');
          stop();
        } else {
          if (now() - record.startedAt >= stableMs) nextDelay = retryInitialMs;
          scheduleTunnel();
        }
      }
      finish();
    });
  };
  const startTunnel = async () => {
    if (stopping || finished || tunnelRecord || tunnelCheckActive) return;
    tunnelCheckActive = true;
    let available = true;
    try { if (plan.prepareTunnel) available = Boolean(await plan.prepareTunnel()); }
    catch { available = false; }
    tunnelCheckActive = false;
    if (stopping || finished || tunnelRecord) return;
    if (!available) { scheduleTunnel(); return; }
    launch('tunnel');
  };
  for (const signal of ['SIGINT', 'SIGTERM']) {
    handlers[signal] = () => stop(signal);
    signals.on(signal, handlers[signal]);
  }
  launch('bot');
  if (!stopping) void startTunnel();
  starting = false;
  finish();
  return { done, stop };
}

export async function runLauncher({ root, env, platform = process.platform, arch = process.arch, supervisorOptions = {} } = {}) {
  const log = supervisorOptions.log ?? console.log;
  if (platform !== 'linux' || arch !== 'x64' || Number(process.versions.node.split('.')[0]) < 22) {
    log('Cyro launcher: this bundle requires Linux amd64 and Node.js 22 or newer. Nothing was started.');
    return 1;
  }
  let plan;
  try { plan = await createLaunchPlan({ root, env }); }
  catch {
    log('Cyro launcher: bot preflight failed. Check the bot entry, private environment file, and internal dashboard port. Nothing was started.');
    return 1;
  }
  log('Cyro launcher: starting one bot; private dashboard listens on 127.0.0.1:' + plan.bot.env.DASHBOARD_PORT + '. The tunnel recovers independently.');
  return supervise(plan, supervisorOptions).done;
}

// ARC may launch this .js file through ts-node; package.json must keep type=module.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(await runLauncher());
}
