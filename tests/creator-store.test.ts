import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import * as filesystem from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { JsonStore } from '../src/storage/store.js';
import type { StreamerRecord } from '../src/types.js';

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return { ...actual, rename: vi.fn(actual.rename) };
});

const directories: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))); });
async function file() { const directory = await mkdtemp(join(tmpdir(), 'creator-store-')); directories.push(directory); return join(directory, 'streamers.json'); }
function record(id = 'account', guildId = 'guild-one'): StreamerRecord {
  return { id, guildId, platform: 'twitch', username: `user-${id}`, displayName: 'Provider Name', alertChannelId: 'channel',
    enabled: true, state: 'live', currentSessionId: 'session', alertedSessionId: 'session', alertMessageId: 'message',
    cooldownSeconds: 300, messageTemplate: '{url}', cleanupMode: 'offline', discordMemberId: 'member-one',
    lastSnapshot: { sessionId: 'session', title: 'Still live', url: 'https://twitch.tv/user', viewerCount: 12 },
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' };
}

it('migrates each legacy account to a stable creator without merging matching names or altering stream state', async () => {
  const target = await file(), original = [record(), record('second')];
  await writeFile(target, JSON.stringify({ version: 1, streamers: original }));
  const store = new JsonStore(target); await store.init();
  const migrated = JSON.parse(await readFile(target, 'utf8'));
  expect(migrated.version).toBe(2);
  expect(await store.creatorsForGuild('guild-one')).toEqual(original.map(account => ({
    id: `creator-${account.id}`, guildId: account.guildId, name: account.displayName, discordMemberId: account.discordMemberId,
    accountIds: [account.id], createdAt: account.createdAt, updatedAt: account.updatedAt })));
  expect(await store.all()).toEqual(original.map(account => ({ ...account, creatorId: `creator-${account.id}`, creatorName: account.displayName })));
  const reopened = new JsonStore(target); await reopened.init();
  expect(await reopened.all()).toEqual(await store.all());
  expect(await reopened.creatorsForGuild('guild-one')).toHaveLength(2);
});

it('creates independent profiles by default and attaches new accounts to a chosen creator with its effective member', async () => {
  const store = new JsonStore(await file()); await store.init();
  const first = await store.add(record());
  expect(first).toMatchObject({ creatorId: 'creator-account', creatorName: 'Provider Name' });
  const creator = await store.addCreator('guild-one', '  Shared Creator  ', 'profile-member');
  const attached = await store.add({ ...record('second'), creatorId: creator.id });
  expect(attached).toMatchObject({ creatorId: creator.id, creatorName: 'Shared Creator', discordMemberId: 'profile-member', displayName: 'Provider Name' });
  expect((await store.getCreator(creator.id))?.accountIds).toEqual(['second']);
  expect(await store.creatorsForGuild('guild-one')).toHaveLength(2);
  expect((await store.get('second'))?.discordMemberId).toBe('profile-member');
});

it('moves an account and its history atomically with settings and retains history after account removal', async () => {
  const store = new JsonStore(await file()); await store.init(); await store.add(record());
  const destination = await store.addCreator('guild-one', 'Actual Creator', 'new-member');
  const moved = await store.update('account', { creatorId: destination.id, state: 'offline' });
  expect(moved).toMatchObject({ creatorId: destination.id, creatorName: 'Actual Creator', discordMemberId: 'new-member', state: 'offline' });
  expect((await store.getCreator('creator-account'))?.accountIds).toEqual([]);
  expect((await store.getCreator(destination.id))?.accountIds).toEqual(['account']);
  await store.moveAccount('guild-one', 'account', 'creator-account');
  expect((await store.getCreator(destination.id))?.accountIds).toEqual([]);
  await store.moveAccount('guild-one', 'account', destination.id);
  await expect(store.removeCreator('guild-one', destination.id)).rejects.toThrow(/accounts/i);
  await store.remove('account');
  expect((await store.getCreator(destination.id))?.accountIds).toEqual(['account']);
  expect((await store.removeCreator('guild-one', destination.id))?.accountIds).toEqual(['account']);
  expect(await store.getCreator(destination.id)).toBeUndefined();
  expect((await store.removeCreator('guild-one', 'creator-account'))?.id).toBe('creator-account');
  expect(await store.getCreator('creator-account')).toBeUndefined();
});

it('renames creator labels without overwriting provider names and synchronizes or clears linked members', async () => {
  const target = await file(), store = new JsonStore(target); await store.init();
  const first = await store.add(record());
  await store.add({ ...record('second'), creatorId: first.creatorId, displayName: 'Other Provider Name' });
  await store.updateCreator('guild-one', first.creatorId!, { name: 'Person Name', discordMemberId: 'shared-member' });
  expect((await store.forGuild('guild-one')).map(item => [item.creatorName, item.displayName, item.discordMemberId])).toEqual([
    ['Person Name', 'Provider Name', 'shared-member'], ['Person Name', 'Other Provider Name', 'shared-member']]);
  await store.updateCreator('guild-one', first.creatorId!, { discordMemberId: null });
  expect((await store.all()).every(item => item.discordMemberId === undefined)).toBe(true);
  await store.update('account', { discordMemberId: 'edited-member' });
  expect((await store.getCreator(first.creatorId!))?.discordMemberId).toBe('edited-member');
  expect((await store.get('second'))?.discordMemberId).toBe('edited-member');
  const disk = JSON.parse(await readFile(target, 'utf8'));
  expect(disk.streamers.every((item: StreamerRecord) => item.discordMemberId === 'edited-member' && !Object.hasOwn(item, 'creatorName'))).toBe(true);
});

it('rejects cross-guild associations and immutable identity writes without changing either guild', async () => {
  const store = new JsonStore(await file()); await store.init(); await store.add(record());
  const foreign = await store.addCreator('guild-two', 'Foreign Creator');
  const before = await store.all();
  await expect(store.update('account', { guildId: 'guild-two' })).rejects.toThrow(/identity|guild/i);
  await expect(store.update('account', { id: 'replacement' })).rejects.toThrow(/identity|immutable/i);
  await expect(store.update('account', { creatorName: 'Forged label' })).rejects.toThrow(/derived|read.only/i);
  await expect(store.update('account', { creatorId: foreign.id, state: 'offline' })).rejects.toThrow(/server/i);
  await expect(store.add({ ...record('bad'), creatorId: foreign.id })).rejects.toThrow(/server/i);
  await expect(store.moveAccount('guild-two', 'account', foreign.id)).rejects.toThrow(/server/i);
  await expect(store.updateCreator('guild-one', foreign.id, { name: 'Changed' })).rejects.toThrow(/server/i);
  await expect(store.updateCreator('guild-one', 'creator-account', { guildId: 'guild-two' } as never)).rejects.toThrow(/immutable|unsupported/i);
  await expect(store.removeCreator('guild-one', foreign.id)).rejects.toThrow(/server/i);
  expect(await store.all()).toEqual(before);
  expect((await store.getCreator(foreign.id))?.name).toBe('Foreign Creator');
});

it('rejects duplicate account identities and prevents reusing IDs with retained history', async () => {
  const store = new JsonStore(await file()); await store.init(); await store.add(record());
  await expect(store.add(record('account', 'guild-two'))).rejects.toThrow(/duplicate|already|history/i);
  await store.add(record('second'));
  await expect(store.update('second', { username: 'USER-ACCOUNT' })).rejects.toThrow(/duplicate|already/i);
  await store.remove('account');
  await expect(store.add(record())).rejects.toThrow(/duplicate|already|history/i);
  expect((await store.getCreator('creator-account'))?.accountIds).toEqual(['account']);
  expect((await store.get('second'))?.username).toBe('user-second');
});

it('rejects inconsistent persisted creator associations without replacing the original file', async () => {
  const target = await file(), store = new JsonStore(target); await store.init(); await store.add(record());
  const data = JSON.parse(await readFile(target, 'utf8')); data.creators[0].guildId = 'guild-two';
  const corrupt = JSON.stringify(data); await writeFile(target, corrupt);
  await expect(new JsonStore(target).init()).rejects.toThrow(/invalid|association/i);
  expect(await readFile(target, 'utf8')).toBe(corrupt);
});

it('includes empty-profile guilds in retention and purges only an eligible guild with its profiles', async () => {
  const store = new JsonStore(await file()); await store.init(); await store.add(record());
  const empty = await store.addCreator('guild-two', 'Empty Profile');
  expect(new Set(await store.guildIds())).toEqual(new Set(['guild-one', 'guild-two']));
  let eligible = true;
  const queued = store.purgeGuild('guild-one', () => eligible); eligible = false; await queued;
  expect(await store.creatorsForGuild('guild-one')).toHaveLength(1);
  await store.purgeGuild('guild-one');
  expect(await store.all()).toEqual([]);
  expect(await store.creatorsForGuild('guild-one')).toEqual([]);
  expect((await store.getCreator(empty.id))?.guildId).toBe('guild-two');
  expect(await store.guildIds()).toEqual(['guild-two']);
});

it('derives safe automatic profile names while preserving legacy and new provider display names', async () => {
  const target = await file(), longName = `\u0000 ${'N'.repeat(100)} `;
  const legacy = { ...record(), displayName: longName };
  await writeFile(target, JSON.stringify({ version: 1, streamers: [legacy] }));
  const store = new JsonStore(target); await store.init();
  expect(await store.get('account')).toMatchObject({ displayName: longName, creatorName: 'N'.repeat(80) });
  expect(await store.add({ ...record('second'), displayName: '\u0000 \n' })).toMatchObject({ displayName: '\u0000 \n', creatorName: 'user-second' });
  await expect(store.addCreator('guild-one', 'Invalid\nName')).rejects.toThrow(/control/i);
  await expect(store.addCreator('guild-one', 'N'.repeat(81))).rejects.toThrow(/80/i);
});

it('limits new profiles to 100 per guild while allowing existing profiles to receive accounts', async () => {
  const target = await file(), at = record().createdAt;
  const creators = Array.from({ length: 100 }, (_, index) => ({ id: `creator-${index}`, guildId: 'guild-one', name: `Creator ${index}`, accountIds: [], createdAt: at, updatedAt: at }));
  await writeFile(target, JSON.stringify({ version: 2, streamers: [], creators }));
  const store = new JsonStore(target); await store.init();
  await expect(store.addCreator('guild-one', 'One too many')).rejects.toThrow(/100/);
  await expect(store.add(record())).rejects.toThrow(/100/);
  expect((await store.add({ ...record(), creatorId: 'creator-0' })).creatorId).toBe('creator-0');
  expect((await store.addCreator('guild-two', 'Other guild')).guildId).toBe('guild-two');
});

it('rolls back profile edits and account moves when persistence fails and leaves failed migrations untouched', async () => {
  const target = await file(), store = new JsonStore(target); await store.init(); await store.add(record());
  const destination = await store.addCreator('guild-one', 'Destination', 'new-member');
  const persisted = await readFile(target, 'utf8'); await mkdir(`${target}.${process.pid}.tmp`);
  await expect(store.updateCreator('guild-one', 'creator-account', { name: 'Lost edit', discordMemberId: 'lost-member' })).rejects.toThrow();
  await expect(store.moveAccount('guild-one', 'account', destination.id)).rejects.toThrow();
  expect(await readFile(target, 'utf8')).toBe(persisted);
  expect(await store.get('account')).toMatchObject({ creatorId: 'creator-account', creatorName: 'Provider Name', discordMemberId: 'member-one' });
  expect((await store.getCreator(destination.id))?.accountIds).toEqual([]);
  const legacyTarget = await file(), legacy = JSON.stringify({ version: 1, streamers: [record()] });
  await writeFile(legacyTarget, legacy); await mkdir(`${legacyTarget}.${process.pid}.tmp`);
  const migration = new JsonStore(legacyTarget);
  await expect(migration.init()).rejects.toThrow();
  expect(await readFile(legacyTarget, 'utf8')).toBe(legacy);
  expect(await migration.all()).toEqual([]);
});

it('does not treat a missing migration write path as a missing original file', async () => {
  const target = await file(), original = JSON.stringify({ version: 1, streamers: [record()] });
  await writeFile(target, original);
  vi.mocked(filesystem.rename).mockRejectedValueOnce(Object.assign(new Error('Missing migration write path'), { code: 'ENOENT' }));
  await expect(new JsonStore(target).init()).rejects.toThrow('Missing migration write path');
  expect(await readFile(target, 'utf8')).toBe(original);
});

it('preserves case-sensitive YouTube channel identities during migration, add and update', async () => {
  const target = await file(), upper = `UC${'A'.repeat(22)}`, lower = `UC${'a'.repeat(22)}`;
  const youtube = (id: string, channel: string): StreamerRecord => ({ ...record(id), platform: 'youtube', username: channel, platformUserId: channel });
  await writeFile(target, JSON.stringify({ version: 1, streamers: [youtube('upper', upper), youtube('lower', lower)] }));
  const store = new JsonStore(target); await store.init();
  expect(await store.forGuild('guild-one', 'youtube')).toHaveLength(2);
  const mixed = `UCA${'a'.repeat(21)}`;
  await store.add(youtube('mixed', mixed));
  await store.update('mixed', { username: `UCa${'A'.repeat(21)}`, platformUserId: `UCa${'A'.repeat(21)}` });
  await expect(store.add(youtube('duplicate', upper))).rejects.toThrow(/already/i);
  expect(await store.forGuild('guild-one', 'youtube')).toHaveLength(3);
});
