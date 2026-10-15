import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { expect, it } from 'vitest';
import { TimeClockStore } from '../src/time-clock/store.js';
import { defaultTimeClockConfig, emptyTimeClockMember, parseTimeClockConfig } from '../src/time-clock/types.js';

const A = '123456789012345678', B = '223456789012345678', C = '323456789012345678', U = '423456789012345678';
it('defaults off, validates only known settings and rejects duplicate or malformed role IDs', () => {
  expect(defaultTimeClockConfig()).toEqual({ enabled: false, channelId: null, roleIds: [] });
  expect(parseTimeClockConfig({ enabled: true, channelId: null, roleIds: [] }).enabled).toBe(true);
  for (const input of [null, { enabled: true, channelId: C, roleIds: [U, U] }, { enabled: false, channelId: C, roleIds: [], total: 99 }, { enabled: false, channelId: 'x', roleIds: [] }]) expect(() => parseTimeClockConfig(input)).toThrow();
});

it('serializes writes across guilds and does not commit invalid state or expose mutable references', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-time-clock-store-'));
  try {
    const store = new TimeClockStore(dir); await store.init();
    await Promise.all([store.mutate(A, state => { state.members[U] = { ...emptyTimeClockMember(), completedMs: 1000, startedAt: Date.now() }; }), store.mutate(B, state => { state.members[U] = { ...emptyTimeClockMember(), completedMs: 5000 }; })]);
    const before = await readFile(path.join(dir, 'time-clock.json'), 'utf8');
    await expect(store.mutate(A, state => { state.members[U]!.completedMs = -1; })).rejects.toThrow('Invalid');
    expect(await readFile(path.join(dir, 'time-clock.json'), 'utf8')).toBe(before);
    store.get(A).members[U]!.completedMs = 99;
    expect(store.get(A).members[U]!.completedMs).toBe(1000);
    const restored = new TimeClockStore(dir); await restored.init();
    expect(restored.get(B).members[U]!.completedMs).toBe(5000); expect(restored.get(A).members[U]!.startedAt).toEqual(expect.any(Number));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

it('fails closed on corrupted history without replacing or resetting it', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-time-clock-corrupt-'));
  try {
    const file = path.join(dir, 'time-clock.json');
    for (const raw of ['{broken', JSON.stringify({ version: 1, guilds: { [A]: { config: defaultTimeClockConfig(), members: { [U]: { completedMs: -2, startedAt: null, shifts: 1, lastShiftMs: 2 } }, receipts: [], panels: [] } } })]) {
      await writeFile(file, raw); await expect(new TimeClockStore(dir).init()).rejects.toThrow(); expect(await readFile(file, 'utf8')).toBe(raw);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
