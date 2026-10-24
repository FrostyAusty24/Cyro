import { spawn } from 'node:child_process';

const OS_ENV_KEYS = ['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'SYSTEMROOT', 'WINDIR', 'SSL_CERT_FILE', 'SSL_CERT_DIR'];

/** An optional certificate worker must never determine whether Discord can run. */
export function superviseCertificateRenewal(spec, {
  spawnProcess = spawn, signals = process, log = console.log,
  retryMs = 60_000, graceMs = 30_000, forceMs = 5_000,
} = {}) {
  if (![retryMs, graceMs, forceMs].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Certificate supervisor timer settings are invalid.');
  }
  let child;
  let checking = false;
  let stopping = false;
  let finished = false;
  let retryTimer;
  let graceTimer;
  let forceTimer;
  let result = 0;
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  const handlers = {};
  const finish = (forced = false) => {
    if (finished || !stopping || (!forced && child)) return;
    finished = true;
    clearTimeout(retryTimer);
    clearTimeout(graceTimer);
    clearTimeout(forceTimer);
    for (const [signal, handler] of Object.entries(handlers)) signals.off(signal, handler);
    resolveDone(result);
  };
  const signalChild = signal => {
    if (!child) return;
    try { child.kill(signal); }
    catch {
      result = 1;
      log('Cyro launcher: could not signal certificate worker; host cleanup may be required.');
    }
  };
  const stop = (signal = 'SIGTERM') => {
    if (stopping) return;
    stopping = true;
    clearTimeout(retryTimer);
    retryTimer = undefined;
    if (child) {
      graceTimer = setTimeout(() => {
        result = 1;
        log('Cyro launcher: certificate worker stop deadline exceeded; forcing it to stop.');
        forceTimer = setTimeout(() => {
          log('Cyro launcher: certificate worker exit was not confirmed; host container cleanup is required.');
          finish(true);
        }, forceMs);
        signalChild('SIGKILL');
        finish();
      }, graceMs);
      signalChild(signal);
    }
    finish();
  };
  const schedule = () => {
    if (stopping || finished || child || retryTimer !== undefined) return;
    log('Cyro launcher: certificate worker unavailable; retrying in one minute. The bot remains running.');
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void start();
    }, retryMs);
  };
  const start = async () => {
    if (stopping || finished || child || checking) return;
    checking = true;
    let ready = true;
    try { if (spec.prepare) ready = Boolean(await spec.prepare()); }
    catch { ready = false; }
    checking = false;
    if (stopping || finished || child) return;
    if (!ready) { schedule(); return; }
    let next;
    try {
      // The launch plan contains only an OS environment allowlist. Never inherit
      // bot credentials or expose worker output/exception details through logs.
      next = spawnProcess(spec.command, spec.args, {
        cwd: spec.cwd,
        env: Object.fromEntries(OS_ENV_KEYS.filter(key => spec.env?.[key] !== undefined).map(key => [key, spec.env[key]])),
        stdio: ['ignore', 'ignore', 'ignore'],
        shell: false, detached: false,
      });
    } catch { schedule(); return; }
    child = next;
    log('Cyro launcher: certificate renewal worker started.');
    let errorSeen = false;
    next.on('error', () => {
      if (errorSeen) return;
      errorSeen = true;
      log('Cyro launcher: certificate worker failed; waiting for it to close before retrying.');
      // Node emits close after an error. Do not overlap an unconfirmed process.
    });
    next.once('close', () => {
      if (child === next) child = undefined;
      if (stopping) finish();
      else schedule();
    });
  };
  for (const signal of ['SIGINT', 'SIGTERM']) {
    handlers[signal] = () => stop(signal);
    signals.on(signal, handlers[signal]);
  }
  void start();
  return { done, stop };
}
