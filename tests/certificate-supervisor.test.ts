import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { superviseCertificateRenewal } from '../scripts/certificate-supervisor.mjs';
import { createLaunchPlan, supervise } from '../launcher.js';

class FakeChild extends EventEmitter {
  kill = vi.fn((_signal: string) => true);
  closed = false;
  close(code = 0) { if (!this.closed) { this.closed = true; this.emit('close', code, null); } }
}

const roots: string[] = [];
const active: any[] = [];
const children: FakeChild[] = [];
async function rootFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cyro-renewal-launch-'));
  roots.push(root);
  await mkdir(path.join(root, 'dist/src'), { recursive: true });
  await writeFile(path.join(root, 'dist/src/index.js'), '// harmless fixture');
  return root;
}
function worker(overrides: Record<string, unknown> = {}, options: Record<string, unknown> = {}) {
  const logs: string[] = [];
  const signals = new EventEmitter();
  const calls: any[][] = [];
  const own: FakeChild[] = [];
  const spawnProcess = (...args: any[]) => {
    calls.push(args);
    const child = new FakeChild(); children.push(child); own.push(child); return child;
  };
  const run = superviseCertificateRenewal({ command: 'worker', args: [], ...overrides }, {
    spawnProcess, signals, log: (message: string) => logs.push(message),
    retryMs: 100, graceMs: 50, forceMs: 10, ...options,
  });
  active.push(run);
  return { ...run, logs, signals, calls, children: own };
}

describe('optional certificate worker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    for (const run of active.splice(0)) run.stop();
    for (const child of children.splice(0)) child.close();
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
  });

  it('restarts only after close, with a fixed retry delay and no raw error logging', async () => {
    const run = worker();
    expect(run.children).toHaveLength(1);
    run.children[0]!.emit('error', new Error('PRIVATE_CREDENTIAL'));
    run.children[0]!.emit('error', new Error('PRIVATE_CREDENTIAL'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(run.children).toHaveLength(1);
    run.children[0]!.close(1);
    await vi.advanceTimersByTimeAsync(99);
    expect(run.children).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(run.children).toHaveLength(2);
    expect(run.logs.filter(message => message.includes('worker failed'))).toHaveLength(1);
    expect(run.logs.join('\n')).not.toContain('PRIVATE_CREDENTIAL');
  });

  it('keeps trying missing files and recovers when repaired', async () => {
    let available = false;
    const prepare = vi.fn(async () => available);
    const run = worker({ prepare });
    await vi.advanceTimersByTimeAsync(0);
    expect(run.children).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(300);
    expect(run.children).toHaveLength(0);
    available = true;
    await vi.advanceTimersByTimeAsync(100);
    expect(run.children).toHaveLength(1);
    expect(prepare).toHaveBeenCalledTimes(5);
  });

  it('does not launch after an in-flight preflight finishes during shutdown', async () => {
    let resolveCheck!: (value: boolean) => void;
    const run = worker({ prepare: () => new Promise(resolve => { resolveCheck = resolve; }) });
    run.stop();
    expect(await run.done).toBe(0);
    resolveCheck(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(run.children).toHaveLength(0);
    expect(run.signals.listenerCount('SIGTERM')).toBe(0);
  });

  it('allows only OS environment values and discards all worker output', () => {
    const run = worker({ env: { PATH: 'node-path', HOME: 'service-home', DISCORD_TOKEN: 'PRIVATE_BOT', TUNNEL_TOKEN: 'PRIVATE_TUNNEL', CLOUDFLARE_API_TOKEN: 'PRIVATE_DNS', NODE_OPTIONS: 'PRIVATE_OPTIONS' } });
    expect(run.calls[0]![2]).toEqual({
      cwd: undefined, env: { PATH: 'node-path', HOME: 'service-home' },
      stdio: ['ignore', 'ignore', 'ignore'], shell: false, detached: false,
    });
    expect(JSON.stringify(run.calls)).not.toContain('PRIVATE');
  });

  it('forwards shutdown once, waits for close, and cancels pending retries', async () => {
    const run = worker();
    let done = false;
    void run.done.then(() => { done = true; });
    run.signals.emit('SIGINT'); run.signals.emit('SIGTERM');
    await Promise.resolve();
    expect(done).toBe(false);
    expect(run.children[0]!.kill.mock.calls).toEqual([['SIGINT']]);
    run.children[0]!.close();
    expect(await run.done).toBe(0);
    await vi.advanceTimersByTimeAsync(500);
    expect(run.children).toHaveLength(1);
    expect(run.signals.listenerCount('SIGINT')).toBe(0);
  });

  it('bounds unresponsive worker cleanup and does not leak thrown signal errors', async () => {
    const run = worker();
    run.children[0]!.kill.mockImplementation(() => { throw new Error('PRIVATE_DETAIL'); });
    run.stop();
    await vi.advanceTimersByTimeAsync(60);
    expect(await run.done).toBe(1);
    expect(run.children[0]!.kill.mock.calls).toEqual([['SIGTERM'], ['SIGKILL']]);
    expect(run.logs.join('\n')).not.toContain('PRIVATE_DETAIL');
  });

  it('cancels a queued retry when shutdown arrives after worker exit', async () => {
    const run = worker();
    run.children[0]!.close(1);
    run.stop();
    expect(await run.done).toBe(0);
    await vi.advanceTimersByTimeAsync(500);
    expect(run.children).toHaveLength(1);
  });

  it('recovers synchronous spawn and thrown preflight failures without escaping', async () => {
    let healthy = false;
    const spawnProcess = vi.fn(() => { throw new Error('PRIVATE_SPAWN'); });
    const run = worker({ prepare: async () => { if (!healthy) throw new Error('PRIVATE_CONFIG'); return true; } }, { spawnProcess });
    await vi.advanceTimersByTimeAsync(100);
    expect(spawnProcess).not.toHaveBeenCalled();
    healthy = true;
    await vi.advanceTimersByTimeAsync(200);
    expect(spawnProcess).toHaveBeenCalledTimes(2);
    expect(run.logs.join('\n')).not.toContain('PRIVATE');
  });

  it('keeps Discord and the tunnel running through worker failure and stops all children on bot exit', async () => {
    const own: { command: string; child: FakeChild }[] = [];
    const run = supervise({
      bot: { command: 'bot', args: [] }, tunnel: { command: 'tunnel', args: [] },
      certificateRenewal: { command: 'certificate', args: [] },
    }, {
      signals: new EventEmitter(), log: () => {},
      graceMs: 100, forceMs: 10, certificateRetryMs: 100, certificateGraceMs: 50, certificateForceMs: 10,
      spawnProcess: (command: string) => { const child = new FakeChild(); children.push(child); own.push({ command, child }); return child; },
    });
    active.push(run);
    expect(own.map(value => value.command)).toEqual(['bot', 'tunnel', 'certificate']);
    own[2]!.child.close(1);
    await vi.advanceTimersByTimeAsync(100);
    expect(own.map(value => value.command)).toEqual(['bot', 'tunnel', 'certificate', 'certificate']);
    expect(own[0]!.child.kill).not.toHaveBeenCalled();
    expect(own[1]!.child.kill).not.toHaveBeenCalled();
    own[0]!.child.close(1);
    expect(own[1]!.child.kill.mock.calls).toEqual([['SIGTERM']]);
    expect(own[3]!.child.kill.mock.calls).toEqual([['SIGTERM']]);
    let allDone = false;
    void run.done.then(() => { allDone = true; });
    own[1]!.child.close();
    await Promise.resolve();
    expect(allDone).toBe(false);
    own[3]!.child.close();
    expect(await run.done).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(own).toHaveLength(4);
  });

  it('does not launch renewal when the bot cannot be spawned', async () => {
    const spawnProcess = vi.fn(() => { throw new Error('PRIVATE_DETAIL'); });
    const run = supervise({
      bot: { command: 'bot', args: [] }, tunnel: { command: 'tunnel', args: [] },
      certificateRenewal: { command: 'certificate', args: [] },
    }, { signals: new EventEmitter(), spawnProcess, log: () => {} });
    active.push(run);
    expect(await run.done).toBe(1);
    expect(spawnProcess).toHaveBeenCalledTimes(1);
  });
});

afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

it('keeps renewal disabled by default and discovers its private files only when explicitly enabled', async () => {
  const root = await rootFixture();
  const disabled = await createLaunchPlan({ root, env: {} });
  expect(disabled.certificateRenewal).toBeUndefined();
  const plan = await createLaunchPlan({ root, env: { CYRO_CERTIFICATE_RENEWAL_ENABLED: 'true', PATH: 'node-path', DISCORD_TOKEN: 'PRIVATE_BOT', TUNNEL_TOKEN: 'PRIVATE_TUNNEL', NODE_OPTIONS: 'PRIVATE_OPTIONS' } });
  expect(plan.certificateRenewal!.env).toEqual({ PATH: 'node-path' });
  expect(plan.certificateRenewal!.args).toEqual([path.join(root, 'certificate-tools/cli.mjs'), '--config', path.join(root, 'private/fallback/renewal.json'), '--watch']);
  expect(await plan.certificateRenewal!.prepare()).toBe(false);
  await mkdir(path.join(root, 'certificate-tools'));
  await mkdir(path.join(root, 'private/fallback'), { recursive: true });
  await writeFile(path.join(root, 'certificate-tools/cli.mjs'), '// harmless fixture');
  await writeFile(path.join(root, 'private/fallback/renewal.json'), '{}');
  expect(await plan.certificateRenewal!.prepare()).toBe(true);
  expect(JSON.stringify(plan.certificateRenewal)).not.toContain('PRIVATE');
});
