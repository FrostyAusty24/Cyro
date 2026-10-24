import { afterEach, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer, request, type Server } from 'node:https';
import { fallbackTlsOptions, watchFallbackTls, type DashboardFallbackConfig, type FallbackTlsReloader } from '../src/dashboard/fallback.js';

vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, readFile: vi.fn(actual.readFile) };
});
const fixtures = 'tests/fixtures/dashboard-fallback';
const folders: string[] = [];
const reloaders: FallbackTlsReloader[] = [];
const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(reloaders.splice(0).map(item => item.stop()));
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve, reject) => { server.close(error => error ? reject(error) : resolve()); server.closeAllConnections(); })));
  vi.restoreAllMocks();
  vi.mocked(fs.readFile).mockReset().mockImplementation((await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')).readFile);
  for (const folder of folders.splice(0)) {
    for (const file of ['certificate.pem', 'privatekey.pem', 'replacement.pem']) {
      await fs.unlink(path.join(folder, file)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
    await fs.rmdir(folder);
  }
});

async function setup() {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'cyro-tls-reload-')); folders.push(folder);
  const cert = await fs.readFile(`${fixtures}/test-server.pem`);
  const key = await fs.readFile(`${fixtures}/test-only-key.pem`);
  const ca = await fs.readFile(`${fixtures}/test-ca.pem`);
  const config: DashboardFallbackConfig = { url: 'https://localhost:3443', host: '127.0.0.1', port: 0, certFile: path.join(folder, 'certificate.pem'), keyFile: path.join(folder, 'privatekey.pem') };
  await fs.writeFile(config.certFile, cert); await fs.writeFile(config.keyFile, key);
  const initial = await fallbackTlsOptions(config);
  const logger = { warn: vi.fn(), info: vi.fn() };
  const replace = async (contents: Buffer | string) => {
    const next = path.join(folder, 'replacement.pem');
    await fs.writeFile(next, contents); await fs.rename(next, config.certFile);
  };
  return { config, initial, logger, replace, cert, ca };
}

async function serve(initial: Awaited<ReturnType<typeof fallbackTlsOptions>>) {
  const server = createServer(initial, (_req, res) => { res.writeHead(200); res.end('still running'); }); servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); const port = typeof address === 'object' && address ? address.port : 0;
  const ca = await fs.readFile(`${fixtures}/test-ca.pem`);
  const read = () => new Promise<string>((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, servername: 'localhost', ca, agent: false }, res => {
      let body = ''; res.setEncoding('utf8'); res.on('data', chunk => { body += chunk; }); res.on('end', () => resolve(body));
    }); req.once('error', reject); req.end();
  });
  return { server, read };
}

it('retains the live TLS context for missing, malformed, expired and mismatched replacements, with throttled sanitized warnings', async () => {
  const s = await setup(); const live = await serve(s.initial);
  const apply = vi.fn(options => live.server.setSecureContext(options));
  let now = Date.now();
  const reloader = watchFallbackTls(s.config, s.initial, apply, s.logger, { now: () => now }); reloaders.push(reloader);
  await fs.unlink(s.config.certFile); await reloader.refresh();
  await s.replace('sensitive-file-content-must-never-appear'); await reloader.refresh();
  await s.replace(await fs.readFile(`${fixtures}/test-expired.pem`)); await reloader.refresh();
  await s.replace(Buffer.concat([s.cert, s.ca])); await fs.writeFile(s.config.keyFile, 'invalid-private-key-must-never-appear'); await reloader.refresh();
  expect(apply).not.toHaveBeenCalled();
  expect(await live.read()).toBe('still running');
  expect(s.logger.warn).toHaveBeenCalledTimes(1);
  expect(s.logger.warn.mock.calls[0]).toEqual(['Backup HTTPS certificate renewal could not be loaded. The last working certificate is still in use; check certificate renewal and file permissions.']);
  now += 3_600_000; await reloader.refresh(); expect(s.logger.warn).toHaveBeenCalledTimes(2);
  await fs.writeFile(s.config.keyFile, s.initial.key); await reloader.refresh();
  expect(apply).toHaveBeenCalledOnce(); expect(await live.read()).toBe('still running');
});

it('polls for valid atomic certificate changes, swaps context once, and keeps serving with the existing key', async () => {
  const s = await setup(); const live = await serve(s.initial);
  const apply = vi.fn(options => live.server.setSecureContext(options));
  const reloader = watchFallbackTls(s.config, s.initial, apply, s.logger, { intervalMs: 15 }); reloaders.push(reloader);
  await reloader.refresh(); expect(apply).not.toHaveBeenCalled();
  // A valid chain replacement exercises the same atomic PEM path as renewed certificates.
  const fullchain = Buffer.concat([s.cert, Buffer.from('\n'), s.ca]);
  await s.replace(fullchain);
  await vi.waitFor(() => expect(apply).toHaveBeenCalledTimes(1));
  expect(apply.mock.calls[0][0].cert).toEqual(fullchain);
  expect(await live.read()).toBe('still running');
  await reloader.refresh(); expect(apply).toHaveBeenCalledTimes(1);
  expect(s.logger.info).toHaveBeenCalledExactlyOnceWith('Backup HTTPS certificate reloaded without restarting the bot.');
  expect(s.logger.warn).not.toHaveBeenCalled();
});

it('coalesces overlapping checks and joins pending reads on shutdown without applying afterward', async () => {
  const s = await setup(); const apply = vi.fn();
  const reloader = watchFallbackTls(s.config, s.initial, apply, s.logger); reloaders.push(reloader);
  const actualRead = (await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')).readFile;
  let release!: (value: Buffer) => void;
  const pending = new Promise<Buffer>(resolve => { release = resolve; });
  const read = vi.mocked(fs.readFile).mockClear().mockImplementation(((file: Parameters<typeof fs.readFile>[0], ...args: any[]) =>
    String(file) === s.config.certFile ? pending : (actualRead as any)(file, ...args)) as typeof fs.readFile);
  const first = reloader.refresh(); const second = reloader.refresh(); expect(second).toBe(first);
  expect(read).toHaveBeenCalledTimes(2);
  let stopped = false; const shutdown = reloader.stop().then(() => { stopped = true; });
  await Promise.resolve(); expect(stopped).toBe(false);
  release(Buffer.concat([s.cert, s.ca]));
  await first; await shutdown;
  expect(stopped).toBe(true); expect(apply).not.toHaveBeenCalled(); expect(s.logger.warn).not.toHaveBeenCalled();
  await reloader.refresh(); expect(read).toHaveBeenCalledTimes(2);
});

it('does not keep the process alive and clears its scheduled check when stopped', async () => {
  const s = await setup(); const schedule = vi.spyOn(globalThis, 'setTimeout'); const clear = vi.spyOn(globalThis, 'clearTimeout');
  const reloader = watchFallbackTls(s.config, s.initial, vi.fn(), s.logger); reloaders.push(reloader);
  expect(schedule.mock.calls[0][1]).toBe(60_000);
  const timer = schedule.mock.results[0].value as ReturnType<typeof setTimeout>;
  expect(timer.hasRef()).toBe(false);
  await reloader.stop(); expect(clear).toHaveBeenCalledWith(timer);
});
