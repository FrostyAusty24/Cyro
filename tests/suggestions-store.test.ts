import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { afterEach, expect, it } from 'vitest';
import { SuggestionsStore } from '../src/suggestions/store.js';

const A = '123456789012345678', B = '223456789012345678';
const folders: string[] = [];
afterEach(async () => { await Promise.all(folders.splice(0).map(f => rm(f, { recursive: true, force: true }))); });
async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-suggestions-')); folders.push(dir);
  const store = new SuggestionsStore(dir); await store.init(); return { dir, store };
}
it('keeps per-server settings durable and isolated', async () => {
  const { dir, store } = await fixture();
  expect(store.get(A).config).toEqual({ enabled: false, channelId: null, cooldownMinutes: 5 });
  await store.mutate(A, g => { g.config = { enabled: true, channelId: A, cooldownMinutes: 10 }; });
  const restored = new SuggestionsStore(dir); await restored.init();
  expect(restored.get(A).config.cooldownMinutes).toBe(10);
  expect(restored.get(B).config.enabled).toBe(false);
});
it('rejects corrupt saved history without replacing it with empty state', async () => {
  const { dir } = await fixture();
  const file = path.join(dir, 'suggestions.json');
  const broken = JSON.stringify({ version: 1, guilds: { [A]: { config: { enabled: false, channelId: null, cooldownMinutes: 5 }, nextNumber: 1, items: [{ id: 'bad' }] } } });
  await writeFile(file, broken);
  await expect(new SuggestionsStore(dir).init()).rejects.toThrow('Invalid suggestions');
  expect(await readFile(file, 'utf8')).toBe(broken);
});
