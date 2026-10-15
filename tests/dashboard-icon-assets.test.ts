import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Client } from 'discord.js';
import { expect, it } from 'vitest';
import { DashboardServer } from '../src/dashboard/server.js';
import { Logger } from '../src/logger.js';

it('serves shared icons publicly and loads their helper before every dashboard consumer', async () => {
  const publicDir = path.resolve('public');
  const module = { getConfig: async () => ({}), updateConfig: async () => ({}), snapshot: async () => ({}) };
  const server = new DashboardServer({
    client: { isReady: () => false } as Client,
    config: { discordClientId: '123', discordToken: 'unused', dataDir: '.', logLevel: 'error', autoDeployCommands: false, pollIntervalSeconds: 60, dashboardUrl: 'http://localhost:3000' },
    logger: new Logger('error'), community: module, moderation: module, streams: {} as never, publicDir,
  });
  try {
    const base = `http://127.0.0.1:${await server.start(0, '127.0.0.1')}`;
    for (const [file, type] of [['icons.js', 'text/javascript'], ['icons.svg', 'image/svg+xml']]) {
      const response = await fetch(`${base}/${file}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain(type);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(await response.text()).toBe(await readFile(path.join(publicDir, file!), 'utf8'));
      const head = await fetch(`${base}/${file}`, { method: 'HEAD' });
      expect(head.status).toBe(200);
      expect(await head.text()).toBe('');
    }
    const html = await (await fetch(`${base}/dashboard`)).text();
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
    const helper = scripts.findIndex(match => match[1] === '/icons.js');
    expect(helper).toBeGreaterThanOrEqual(0);
    expect(scripts[helper]?.[0]).toMatch(/\bdefer\b/);
    for (const consumer of ['/home.js', '/search-select.js', '/app.js']) {
      expect(scripts.findIndex(match => match[1] === consumer)).toBeGreaterThan(helper);
    }
    expect((await fetch(`${base}/unlisted.svg`)).status).toBe(404);
  } finally {
    await server.stop();
  }
});
