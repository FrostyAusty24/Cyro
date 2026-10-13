import { EventEmitter } from 'node:events';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { Events } from 'discord.js';
import { expect, it, vi } from 'vitest';
import { GuildRetention } from '../src/services/guild-retention.js';
import { Logger } from '../src/logger.js';

const guildId = '111111111111111111';
const month = 30 * 86400000;
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

it('stops retention intake, detaches listeners and drains already queued reconciliation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'retention-lifecycle-'));
  const listing = deferred();
  const client = Object.assign(new EventEmitter(), { isReady: () => true, guilds: { cache: new Map() } });
  const guildIds = vi.fn(async () => { await listing.promise; return [guildId]; });
  const retention = new GuildRetention(client as never, join(directory, 'removed.json'), [{ guildIds, purgeGuild: vi.fn() }], new Logger('error'));
  try {
    await retention.init(); retention.attach();
    const running = retention.reconcile(1000);
    await setImmediate();
    let stopped = false;
    const stopping = retention.stop().then(() => { stopped = true; });
    expect(client.listenerCount(Events.GuildCreate)).toBe(0);
    expect(client.listenerCount(Events.GuildDelete)).toBe(0);
    client.emit(Events.GuildDelete, { id: guildId, available: true });
    await setImmediate();
    expect(stopped).toBe(false);
    listing.resolve();
    await Promise.all([running, stopping]);
    await retention.reconcile(month);
    expect(guildIds).toHaveBeenCalledOnce();
  } finally {
    listing.resolve(); await retention.stop();
    await rm(directory, { recursive: true, force: true });
  }
});

it('cancels an expired queued purge when a guild rejoins and leaves again before deletion starts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'retention-rejoin-'));
  const queuedPurge = deferred();
  const client = Object.assign(new EventEmitter(), { isReady: () => true, guilds: { cache: new Map() } });
  const deletions: string[] = [];
  const purgeGuild = vi.fn(async (id: string, shouldPurge: () => boolean = () => true) => {
    await queuedPurge.promise;
    if (shouldPurge()) deletions.push(id);
  });
  const file = join(directory, 'removed.json');
  const retention = new GuildRetention(client as never, file, [{ guildIds: async () => [guildId], purgeGuild }], new Logger('error'));
  try {
    await retention.init(); retention.attach();
    await retention.reconcile(1000);
    const expired = retention.reconcile(1000 + month);
    await vi.waitFor(() => expect(purgeGuild).toHaveBeenCalledOnce());
    const guild = { id: guildId, available: true };
    client.guilds.cache.set(guildId, guild);
    client.emit(Events.GuildCreate, guild);
    client.guilds.cache.delete(guildId);
    client.emit(Events.GuildDelete, guild);
    queuedPurge.resolve();
    await expired;
    await retention.flush();
    expect(deletions).toEqual([]);
    expect(JSON.parse(await readFile(file, 'utf8'))[guildId]).toBeGreaterThan(1000 + month);
  } finally {
    queuedPurge.resolve(); await retention.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
