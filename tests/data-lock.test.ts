import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm, utimes } from 'node:fs/promises';
import os from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import lockfile from 'proper-lockfile';
import { expect, it, vi } from 'vitest';
import { acquireDataLock } from '../src/storage/data-lock.js';

it('rejects a second writer until the current bot releases its data folder', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bot-lock-'));
  let release: (() => Promise<void>) | undefined;
  try {
    release = await acquireDataLock(directory);
    await expect(acquireDataLock(directory)).rejects.toThrow('Another bot process');
    await release(); release = undefined;
    release = await acquireDataLock(directory);
  } finally { await release?.(); await rm(directory, { recursive: true, force: true }); }
});

it('recovers an abandoned lock after the fixed crash timeout', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bot-lock-crash-'));
  let release: (() => Promise<void>) | undefined;
  try {
    const lock = path.join(directory, '.bot-owner.lock');
    await mkdir(lock);
    const abandoned = new Date(Date.now() - 120_000);
    await utimes(lock, abandoned, abandoned);
    release = await acquireDataLock(directory);
    await expect(acquireDataLock(directory)).rejects.toThrow('Another bot process');
  } finally { await release?.(); await rm(directory, { recursive: true, force: true }); }
});

it('can wait for the previous owner to release without starting a second writer', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bot-lock-wait-'));
  let owner: (() => Promise<void>) | undefined;
  let nextOwner: (() => Promise<void>) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    owner = await acquireDataLock(directory);
    timer = setTimeout(() => { void owner?.(); }, 25);
    nextOwner = await acquireDataLock(directory, undefined, { waitMs: 2_000 });
    expect(nextOwner).toBeTypeOf('function');
    await expect(acquireDataLock(directory)).rejects.toThrow('Another bot process');
  } finally {
    clearTimeout(timer); await nextOwner?.(); await owner?.();
    await rm(directory, { recursive: true, force: true });
  }
});

it('cancels a pending wait promptly without releasing the active owner', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bot-lock-abort-'));
  const controller = new AbortController();
  let owner: (() => Promise<void>) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    owner = await acquireDataLock(directory);
    const started = performance.now();
    timer = setTimeout(() => controller.abort(), 25);
    await expect(acquireDataLock(directory, undefined, { waitMs: 2_000, signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(performance.now() - started).toBeLessThan(500);
    await expect(acquireDataLock(directory)).rejects.toThrow('Another bot process');
  } finally {
    clearTimeout(timer); await owner?.();
    await rm(directory, { recursive: true, force: true });
  }
});

it('releases ownership if cancellation arrives during the atomic acquisition', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bot-lock-abort-acquire-'));
  const controller = new AbortController();
  const acquire = lockfile.lock;
  let acquired: (() => Promise<void>) | undefined;
  const spy = vi.spyOn(lockfile, 'lock').mockImplementationOnce(async (file, options) => {
    acquired = await acquire(file, options);
    controller.abort();
    return acquired;
  });
  try {
    await expect(acquireDataLock(directory, undefined, { waitMs: 2_000, signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(await lockfile.check(directory, { lockfilePath: path.join(directory, '.bot-owner.lock') })).toBe(false);
    acquired = undefined;
  } finally {
    spy.mockRestore(); await acquired?.();
    await rm(directory, { recursive: true, force: true });
  }
});

it('reports the startup wait once and still refuses a live owner at the deadline', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bot-lock-deadline-'));
  let owner: (() => Promise<void>) | undefined;
  const onWaiting = vi.fn();
  try {
    owner = await acquireDataLock(directory);
    const started = performance.now();
    // Leave room for real filesystem I/O when the entire suite runs concurrently.
    await expect(acquireDataLock(directory, undefined, { waitMs: 500, onWaiting })).rejects.toThrow('Another bot process');
    expect(performance.now() - started).toBeLessThan(3000);
    expect(onWaiting).toHaveBeenCalledTimes(1);
    await expect(acquireDataLock(directory)).rejects.toThrow('Another bot process');
    await owner(); owner = undefined;
    owner = await acquireDataLock(directory);
  } finally { await owner?.(); await rm(directory, { recursive: true, force: true }); }
});

it.each(['SIGINT', 'SIGTERM'])('stops application startup on %s during the ownership wait before opening stores or making network connections', async signal => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bot-lock-startup-'));
  const owner = await acquireDataLock(directory);
  const entry = pathToFileURL(path.resolve('src/index.ts')).href;
  const loader = pathToFileURL(createRequire(import.meta.url).resolve('tsx')).href;
  // Windows cannot deliver POSIX signals; exercise Node's same registered signal handler via stdin.
  const script = `import net from 'node:net';
    net.Socket.prototype.connect = function () { throw new Error('Network is forbidden in the startup cancellation test'); };
    process.stdin.once('data', () => { process.emit(${JSON.stringify(signal)}); process.stdin.destroy(); });
    await import(${JSON.stringify(entry)});`;
  const child = spawn(process.execPath, ['--import', loader, '--input-type=module', '--eval', script], {
    cwd: directory,
    env: { SystemRoot: process.env.SystemRoot, PATH: process.env.PATH, TEMP: process.env.TEMP,
      DISCORD_TOKEN: 'offline-test-token', DISCORD_CLIENT_ID: '12345678901234567', DATA_DIR: directory,
      AUTO_DEPLOY_COMMANDS: 'false', DASHBOARD_ENABLED: 'false', LOG_LEVEL: 'info' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let output = ''; let stopSentAt: number | undefined;
  child.stdout.on('data', chunk => {
    output += String(chunk);
    if (stopSentAt === undefined && output.includes('Waiting for data-folder ownership')) {
      stopSentAt = performance.now(); child.stdin.end('stop\n');
    }
  });
  child.stderr.on('data', chunk => { output += String(chunk); });
  const timer = setTimeout(() => child.kill(), 5_000);
  try {
    const code = await new Promise<number | null>((resolve, reject) => {
      child.once('error', reject); child.once('close', resolve);
    });
    expect(code, output).toBe(0);
    expect(stopSentAt, output).toBeTypeOf('number');
    expect(performance.now() - stopSentAt!).toBeLessThan(1_000);
    expect(output).toContain('Startup cancelled before data-folder ownership was acquired.');
    expect(output).not.toContain('Discord bot is ready');
    expect(await readdir(directory)).toEqual(['.bot-owner.lock']);
    await expect(acquireDataLock(directory)).rejects.toThrow('Another bot process');
  } finally {
    clearTimeout(timer); child.kill(); await owner();
    await rm(directory, { recursive: true, force: true });
  }
}, 10_000);

it('waits while an abandoned lock is fresh and acquires only after it becomes stale', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bot-lock-expiry-'));
  const controller = new AbortController();
  let pending: Promise<() => Promise<void>> | undefined;
  try {
    const lock = path.join(directory, '.bot-owner.lock');
    await mkdir(lock);
    let reportWaiting!: () => void;
    const waiting = new Promise<void>(resolve => { reportWaiting = resolve; });
    const onWaiting = vi.fn(reportWaiting);
    pending = acquireDataLock(directory, undefined, { waitMs: 2_000, signal: controller.signal, onWaiting });
    await waiting;
    await expect(acquireDataLock(directory)).rejects.toThrow('Another bot process');
    const abandoned = new Date(Date.now() - 120_000);
    await utimes(lock, abandoned, abandoned);
    const release = await pending;
    expect(onWaiting).toHaveBeenCalledTimes(1);
    await expect(acquireDataLock(directory)).rejects.toThrow('Another bot process');
    await release();
  } finally {
    controller.abort(); await pending?.then(release => release(), () => undefined);
    await rm(directory, { recursive: true, force: true });
  }
});

it('does not retry filesystem errors unrelated to another owner', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'bot-lock-permission-'));
  const denied = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
  const spy = vi.spyOn(lockfile, 'lock').mockRejectedValueOnce(denied);
  const onWaiting = vi.fn();
  try {
    await expect(acquireDataLock(directory, undefined, { waitMs: 2_000, onWaiting })).rejects.toBe(denied);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(onWaiting).not.toHaveBeenCalled();
  } finally { spy.mockRestore(); await rm(directory, { recursive: true, force: true }); }
});
