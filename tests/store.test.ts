import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { JsonStore } from '../src/storage/store.js';
import type { StreamerRecord } from '../src/types.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

function fixture(id: string): StreamerRecord {
  return {
    id, guildId: 'guild', platform: 'twitch', username: `user-${id}`, displayName: `User ${id}`,
    alertChannelId: 'channel', cooldownSeconds: 300, messageTemplate: '{url}', cleanupMode: 'offline',
    enabled: true, state: 'unknown', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('JsonStore', () => {
  it('rechecks removal eligibility inside the storage queue after a guild rejoins', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'stream-alert-bot-'));
    temporaryDirectories.push(directory);
    const store = new JsonStore(path.join(directory, 'streamers.json'));
    await store.init(); await store.add(fixture('retained'));
    let removed = true;
    const pendingWrite = store.update('retained', { displayName: 'Keep my settings' });
    const pendingPurge = store.purgeGuild('guild', () => removed);
    removed = false;
    await Promise.all([pendingWrite, pendingPurge]);
    expect((await store.forGuild('guild'))[0]?.displayName).toBe('Keep my settings');
  });
  it('does not publish a mutation when persistence fails', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'stream-alert-bot-'));
    temporaryDirectories.push(directory);
    const file = path.join(directory, 'streamers.json');
    const store = new JsonStore(file); await store.init();
    await mkdir(`${file}.${process.pid}.tmp`);
    await expect(store.add(fixture('failed'))).rejects.toThrow();
    expect(await store.all()).toEqual([]);
  });
  it('persists add, update, and remove operations', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'stream-alert-bot-'));
    temporaryDirectories.push(directory);
    const file = path.join(directory, 'streamers.json');
    const store = new JsonStore(file);
    await store.init();
    await store.add(fixture('a'));
    expect((await store.update('a', { state: 'live' })).state).toBe('live');
    expect((await store.forGuild('guild', 'twitch'))).toHaveLength(1);
    expect((await store.remove('a'))?.id).toBe('a');
    expect(JSON.parse(await readFile(file, 'utf8')).streamers).toEqual([]);
  });

  it('rejects duplicate platform usernames in the same guild', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'stream-alert-bot-'));
    temporaryDirectories.push(directory);
    const store = new JsonStore(path.join(directory, 'streamers.json'));
    await store.init();
    await store.add(fixture('a'));
    await expect(store.add({ ...fixture('b'), username: 'USER-A' })).rejects.toThrow('already tracked');
  });
});
