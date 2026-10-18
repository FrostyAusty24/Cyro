import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { createLaunchPlan, supervise, runLauncher } from '../launcher.js';

const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cyro-resilient-launcher-'));
  roots.push(root);
  await mkdir(path.join(root, 'dist/src'), { recursive: true });
  await mkdir(path.join(root, 'bin'));
  await mkdir(path.join(root, '.secrets'));
  await writeFile(path.join(root, 'dist/src/index.js'), '// harmless fixture');
  return root;
}
async function tunnelFiles(root: string) {
  await writeFile(path.join(root, 'bin/cloudflared'), 'harmless fixture', { mode: 0o755 });
  await writeFile(path.join(root, '.secrets/cloudflared-token'), 'PRIVATE_FIXTURE_TOKEN');
}
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

describe('launch plan', () => {
  it('starts with missing tunnel files and discovers repairs without reconstructing the bot plan', async () => {
    const root = await fixture();
    const plan = await createLaunchPlan({ root, env: {} });
    expect(plan.bot.env.PORT).toBe('1029');
    expect(plan.bot.env.DASHBOARD_HOST).toBe('127.0.0.1');
    expect(await plan.prepareTunnel()).toBe(false);
    await tunnelFiles(root);
    expect(await plan.prepareTunnel()).toBe(true);
    const token = path.join(root, '.secrets/cloudflared-token');
    await writeFile(token, '');
    expect(await plan.prepareTunnel()).toBe(false);
    await rm(token);
    await mkdir(token);
    expect(await plan.prepareTunnel()).toBe(false);
  });
  it('loads .env with hosting values taking precedence and strips tunnel credentials from bot environment', async () => {
    const root = await fixture();
    await writeFile(path.join(root, '.env'), 'CYRO_INTERNAL_DASHBOARD_PORT=3000\nDISCORD_TOKEN=FILE_PRIVATE_TOKEN\nDASHBOARD_URL=https://cyrobot.ca\nTUNNEL_TOKEN=PRIVATE_TUNNEL_TOKEN\n');
    const original = { CYRO_INTERNAL_DASHBOARD_PORT: '3100', DISCORD_TOKEN: 'HOST_PRIVATE_TOKEN', PORT: '1234', DASHBOARD_HOST: '0.0.0.0', TUNNEL_TOKEN_FILE: 'private' };
    const plan = await createLaunchPlan({ root, env: original });
    expect(plan.bot.env.PORT).toBe('3100');
    expect(plan.bot.env.DASHBOARD_PORT).toBe('3100');
    expect(plan.bot.env.DASHBOARD_HOST).toBe('127.0.0.1');
    expect(plan.bot.env.DISCORD_TOKEN).toBe('HOST_PRIVATE_TOKEN');
    expect(plan.bot.env.DASHBOARD_URL).toBe('https://cyrobot.ca');
    expect(plan.bot.env.TUNNEL_TOKEN).toBeUndefined();
    expect(plan.bot.env.TUNNEL_TOKEN_FILE).toBeUndefined();
    expect(plan.tunnel.env.DISCORD_TOKEN).toBeUndefined();
    expect(plan.tunnel.env.TUNNEL_TOKEN).toBeUndefined();
    expect(JSON.stringify(plan.tunnel)).not.toContain('PRIVATE');
    expect(original.PORT).toBe('1234');
    const filePlan = await createLaunchPlan({ root, env: { CYRO_INTERNAL_DASHBOARD_PORT: undefined } });
    expect(filePlan.bot.env.PORT).toBe('3000');
  });
  it.each(['0', '-1', '65536', '3.5', '3000junk', '1e3'])('rejects malformed internal port %s', async port => {
    const root = await fixture();
    await expect(createLaunchPlan({ root, env: { CYRO_INTERNAL_DASHBOARD_PORT: port } })).rejects.toThrow('CYRO_INTERNAL_DASHBOARD_PORT');
  });
  it('requires the bot entry even though the tunnel is optional', async () => {
    const root = await fixture();
    await rm(path.join(root, 'dist/src/index.js'));
    await expect(createLaunchPlan({ root, env: {} })).rejects.toThrow('Bot entry');
  });
  it('rejects unreadable .env without echoing its path or secrets', async () => {
    const root = await fixture();
    await mkdir(path.join(root, '.env'));
    await expect(createLaunchPlan({ root, env: {} })).rejects.toThrow('private environment file could not be read');
  });
});

class FakeChild extends EventEmitter {
  closed = false;
  kill = vi.fn((_signal: string) => true);
  close(code = 0) { if (!this.closed) { this.closed = true; this.emit('close', code, null); } }
}
const runs: ReturnType<typeof harness>[] = [];
function harness(options: Record<string, unknown> = {}, planExtra: Record<string, unknown> = {}) {
  const children: FakeChild[] = [];
  const calls: any[][] = [];
  const logs: string[] = [];
  const signals = new EventEmitter();
  const spawnProcess = (...args: any[]) => { calls.push(args); const child = new FakeChild(); children.push(child); return child; };
  const run = supervise({ bot: { command: 'bot', args: [] }, tunnel: { command: 'tunnel', args: [] }, ...planExtra }, {
    signals, spawnProcess, log: (message: string) => logs.push(message), retryInitialMs: 100, retryMaxMs: 400, stableMs: 1000, graceMs: 100, forceMs: 10, ...options,
  });
  const value = { ...run, children, calls, logs, signals };
  runs.push(value);
  return value;
}

describe('independent tunnel supervisor', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(async () => {
    for (const run of runs.splice(0)) { run.stop(); for (const child of run.children) child.close(); }
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
  });
  it('retries only the tunnel with exponential backoff, caps delay, and resets after a stable lifetime', async () => {
    const run = harness();
    expect(run.children).toHaveLength(2);
    for (const delay of [100, 200, 400, 400]) {
      const count = run.children.length;
      run.children.at(-1)!.close(1);
      expect(run.children[0]!.kill).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(run.children).toHaveLength(count);
      await vi.advanceTimersByTimeAsync(1);
      expect(run.children).toHaveLength(count + 1);
    }
    await vi.advanceTimersByTimeAsync(1000);
    run.children.at(-1)!.close(1);
    const count = run.children.length;
    await vi.advanceTimersByTimeAsync(100);
    expect(run.children).toHaveLength(count + 1);
    expect(run.calls.filter(call => call[0] === 'bot')).toHaveLength(1);
    expect(run.calls.every(call => call[2].shell === false && call[2].detached === false)).toBe(true);
  });
  it('does not retry after error until close, and never logs raw errors', async () => {
    const run = harness();
    run.children[1]!.emit('error', new Error('PRIVATE_DETAIL'));
    run.children[1]!.emit('error', new Error('PRIVATE_DETAIL'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(run.children).toHaveLength(2);
    expect(run.children[0]!.kill).not.toHaveBeenCalled();
    run.children[1]!.close(-2);
    await vi.advanceTimersByTimeAsync(100);
    expect(run.children).toHaveLength(3);
    expect(run.logs.join('\n')).not.toContain('PRIVATE_DETAIL');
    expect(run.logs.filter(text => text.includes('process failed'))).toHaveLength(1);
  });
  it('keeps the bot up while tunnel preflight is unavailable, then recovers', async () => {
    let available = false;
    const prepareTunnel = vi.fn(async () => available);
    const run = harness({}, { prepareTunnel });
    await vi.advanceTimersByTimeAsync(0);
    expect(run.children).toHaveLength(1);
    available = true;
    await vi.advanceTimersByTimeAsync(100);
    expect(run.children).toHaveLength(2);
    expect(prepareTunnel).toHaveBeenCalledTimes(2);
    expect(run.children[0]!.kill).not.toHaveBeenCalled();
  });
  it('sanitizes thrown preflight errors and continues retrying without restarting the bot', async () => {
    const run = harness({}, { prepareTunnel: async () => { throw new Error('PRIVATE_DETAIL'); } });
    await vi.advanceTimersByTimeAsync(1000);
    expect(run.children).toHaveLength(1);
    expect(run.children[0]!.kill).not.toHaveBeenCalled();
    expect(run.logs.join('\n')).not.toContain('PRIVATE_DETAIL');
  });
  it('does not launch a tunnel when an in-flight preflight finishes after shutdown', async () => {
    let resolveCheck!: (value: boolean) => void;
    const run = harness({}, { prepareTunnel: () => new Promise(resolve => { resolveCheck = resolve; }) });
    run.stop();
    run.children[0]!.close();
    expect(await run.done).toBe(0);
    resolveCheck(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(run.children).toHaveLength(1);
  });
  it('cancels queued retries during shutdown and forwards the signal only once', async () => {
    const run = harness();
    run.children[1]!.close(1);
    run.signals.emit('SIGINT');
    run.signals.emit('SIGTERM');
    run.children[0]!.close();
    expect(await run.done).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(run.children).toHaveLength(2);
    expect(run.children[0]!.kill.mock.calls).toEqual([['SIGINT']]);
    expect(run.signals.listenerCount('SIGINT')).toBe(0);
  });
  it('waits for both children to close during ordinary shutdown', async () => {
    const run = harness();
    run.stop();
    let completed = false;
    void run.done.then(() => { completed = true; });
    run.children[0]!.close();
    await Promise.resolve();
    expect(completed).toBe(false);
    run.children[1]!.close();
    expect(await run.done).toBe(0);
    expect(run.children.map(child => child.kill.mock.calls)).toEqual([[['SIGTERM']], [['SIGTERM']]]);
  });
  it('stops the tunnel on bot exit and never automatically restarts the bot', async () => {
    const run = harness();
    run.children[0]!.close(1);
    expect(run.children[1]!.kill.mock.calls).toEqual([['SIGTERM']]);
    run.children[1]!.close();
    expect(await run.done).toBe(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(run.children).toHaveLength(2);
  });
  it('stops both children on bot error and preserves the failure exit status', async () => {
    const run = harness();
    run.children[0]!.emit('error', new Error('PRIVATE_DETAIL'));
    expect(run.children[1]!.kill.mock.calls).toEqual([['SIGTERM']]);
    for (const child of run.children) child.close();
    expect(await run.done).toBe(1);
    expect(run.logs.join('\n')).not.toContain('PRIVATE_DETAIL');
  });
  it('retries a synchronous tunnel spawn failure without stopping the existing bot', async () => {
    const bot = new FakeChild();
    const recovered = new FakeChild();
    let attempts = 0;
    const run = harness({ spawnProcess: () => { attempts++; if (attempts === 1) return bot; if (attempts === 2) throw new Error('PRIVATE_DETAIL'); return recovered; } });
    expect(bot.kill).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(attempts).toBe(3);
    run.stop(); bot.close(); recovered.close();
    expect(await run.done).toBe(0);
    expect(run.logs.join('\n')).not.toContain('PRIVATE_DETAIL');
  });
  it('returns failure without starting a tunnel when bot spawn fails synchronously', async () => {
    const spawnProcess = vi.fn(() => { throw new Error('PRIVATE_DETAIL'); });
    const run = harness({ spawnProcess });
    expect(await run.done).toBe(1);
    expect(spawnProcess).toHaveBeenCalledTimes(1);
    expect(run.logs.join('\n')).not.toContain('PRIVATE_DETAIL');
  });
  it('forces unresponsive children after the grace deadline and remains bounded', async () => {
    const run = harness();
    run.stop();
    await vi.advanceTimersByTimeAsync(110);
    expect(await run.done).toBe(1);
    expect(run.children.map(child => child.kill.mock.calls)).toEqual([[['SIGTERM'], ['SIGKILL']], [['SIGTERM'], ['SIGKILL']]]);
  });
  it('bounds failed signal delivery without leaking error details', async () => {
    const run = harness();
    for (const child of run.children) child.kill.mockImplementation(() => { throw new Error('PRIVATE_DETAIL'); });
    run.stop();
    await vi.advanceTimersByTimeAsync(110);
    expect(await run.done).toBe(1);
    expect(run.logs.join('\n')).not.toContain('PRIVATE_DETAIL');
  });
  it('reports a nonzero bot drain exit even when shutdown was requested', async () => {
    const run = harness();
    run.stop(); run.children[0]!.close(1); run.children[1]!.close();
    expect(await run.done).toBe(1);
  });
  it('reports a failed tunnel drain during requested shutdown', async () => {
    const run = harness();
    run.stop(); run.children[0]!.close(); run.children[1]!.close(1);
    expect(await run.done).toBe(1);
  });
});

it('refuses unsupported platforms without launching children', async () => {
  const spawnProcess = vi.fn();
  const supervisorOptions = { spawnProcess, log: () => {} };
  expect(await runLauncher({ platform: 'win32', arch: 'x64', supervisorOptions })).toBe(1);
  expect(await runLauncher({ platform: 'linux', arch: 'arm64', supervisorOptions })).toBe(1);
  expect(spawnProcess).not.toHaveBeenCalled();
});

it('recovers real harmless tunnel processes and reaps all children at shutdown', async () => {
  const children: ReturnType<typeof spawn>[] = [];
  let resolveSecondExit!: () => void;
  const secondExit = new Promise<void>(resolve => { resolveSecondExit = resolve; });
  let tunnelCloses = 0;
  const run = supervise({
    bot: { command: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'], stdio: 'ignore' },
    tunnel: { command: process.execPath, args: ['-e', 'process.exit(3)'], stdio: 'ignore' },
  }, {
    signals: new EventEmitter(), log: () => {}, graceMs: 1000, forceMs: 100, retryInitialMs: 10, retryMaxMs: 30,
    spawnProcess: (...args: Parameters<typeof spawn>) => {
      const child = spawn(...args);
      children.push(child);
      if (children.length > 1) child.once('close', () => { if (++tunnelCloses === 2) resolveSecondExit(); });
      return child;
    },
  });
  try {
    await secondExit;
    expect(children[0]!.exitCode).toBeNull();
    run.stop();
    expect(await run.done).toBe(0);
    expect(children.length).toBeGreaterThanOrEqual(3);
    expect(children.every(child => child.exitCode !== null || child.signalCode !== null)).toBe(true);
  } finally { run.stop(); await run.done; }
}, 10_000);
