import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Client } from 'discord.js';
import { expect, it } from 'vitest';
import { DashboardServer } from '../src/dashboard/server.js';
import { Logger } from '../src/logger.js';

it('serves the searchable picker asset without a session and loads it before the dashboard', async () => {
  const publicDir = path.resolve('public');
  const module = { getConfig: async () => ({}), updateConfig: async () => ({}), snapshot: async () => ({}) };
  const server = new DashboardServer({
    client: { isReady: () => false } as Client,
    config: { discordClientId: '123', discordToken: 'unused', dataDir: '.', logLevel: 'error', autoDeployCommands: false, pollIntervalSeconds: 60, dashboardUrl: 'http://localhost:3000' },
    logger: new Logger('error'), community: module, moderation: module, streams: {} as never, publicDir,
  });
  try {
    const port = await server.start(0, '127.0.0.1');
    const base = `http://127.0.0.1:${port}`;
    const asset = await fetch(`${base}/search-select.js`);
    expect(asset.status).toBe(200);
    expect(asset.headers.get('content-type')).toContain('text/javascript');
    expect(await asset.text()).toBe(await readFile(path.join(publicDir, 'search-select.js'), 'utf8'));

    const page = await fetch(`${base}/dashboard`);
    expect(page.status).toBe(200);
    const html = await page.text();
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
    const picker = scripts.findIndex(match => match[1] === '/search-select.js');
    const app = scripts.findIndex(match => match[1] === '/app.js');
    expect(picker).toBeGreaterThanOrEqual(0);
    expect(app).toBeGreaterThan(picker);
    expect(scripts[picker]?.[0]).toMatch(/\bdefer\b/);

    const head = await fetch(`${base}/search-select.js`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.headers.get('content-type')).toContain('text/javascript');
    expect(await head.text()).toBe('');
  } finally {
    await server.stop();
  }
});
