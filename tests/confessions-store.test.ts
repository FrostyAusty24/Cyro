import { expect, it } from 'vitest';
import { defaultConfessionsConfig, parseConfessionsConfig } from '../src/confessions/types.js';
import { ConfessionsStore } from '../src/confessions/store.js';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

it('defaults confessions off and accepts only a selected same-format channel and bounded cooldown', () => {
  expect(defaultConfessionsConfig()).toEqual({ enabled: false, channelId: null, cooldownSeconds: 60 });
  expect(parseConfessionsConfig({ enabled: true, channelId: '323456789012345678', cooldownSeconds: 30 })).toEqual({ enabled: true, channelId: '323456789012345678', cooldownSeconds: 30 });
  for (const input of [null, { enabled: true, channelId: null, cooldownSeconds: 60 }, { enabled: false, channelId: null, cooldownSeconds: -1 }, { enabled: false, channelId: null, cooldownSeconds: 86401 }, { enabled: false, channelId: null, cooldownSeconds: 1.5 }, { enabled: false, channelId: null, cooldownSeconds: 60, authorId: 'x' }]) expect(() => parseConfessionsConfig(input)).toThrow();
});

it('serializes durable numbering, isolates guild state, and rejects identity-bearing history', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-confessions-store-'));
  try {
    const store = new ConfessionsStore(dir); await store.init();
    const guildId = '123456789012345678';
    await Promise.all([store.mutate(guildId, s => s.nextNumber++), store.mutate(guildId, s => s.nextNumber++)]);
    expect(store.get(guildId).nextNumber).toBe(3);
    expect(store.get('223456789012345678').nextNumber).toBe(1);
    await expect(store.mutate(guildId, (s: any) => { s.authorId = '423456789012345678'; })).rejects.toThrow('Invalid');
    const restored = new ConfessionsStore(dir); await restored.init();
    expect(restored.get(guildId).nextNumber).toBe(3);
    const disk = await readFile(path.join(dir, 'confessions.json'), 'utf8');
    expect(disk).not.toContain('authorId');
    await restored.purgeGuild(guildId, () => false); expect(await restored.guildIds()).toEqual([guildId]);
    await restored.purgeGuild(guildId); expect(await restored.guildIds()).toEqual([]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
