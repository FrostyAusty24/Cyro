import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { CommunityStore } from '../src/community/store.js';
import { applyCount, applyInviteJoin, applyInviteLeave, awardMessageXp, resolveInvite } from '../src/community/logic.js';
import { defaultGuild } from '../src/community/types.js';
import { mergeConfig, assertSafeRole } from '../src/community/config.js';
import { PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { CommunityService } from '../src/community/service.js';
import { Logger } from '../src/logger.js';
import { communityCommands } from '../src/community/commands.js';

const directories: string[] = [];
async function directory() { const path = await mkdtemp(join(tmpdir(), 'community-')); directories.push(path); return path; }
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

it('serializes concurrent guild updates and reloads durable isolated data', async () => {
  const path = await directory();
  const store = new CommunityStore(path);
  await store.init();
  await Promise.all(Array.from({ length: 10 }, () => store.mutate('guild-one', guild => { guild.counting.current++; })));
  await store.mutate('guild-two', guild => { guild.counting.current = 50; });
  const reopened = new CommunityStore(path);
  await reopened.init();
  expect(reopened.get('guild-one').counting.current).toBe(10);
  expect(reopened.get('guild-two').counting.current).toBe(50);
  expect(JSON.parse(await readFile(join(path, 'community.json'), 'utf8')).version).toBe(1);
});

it('counts in order, resets on consecutive users, and ignores duplicate deliveries', () => {
  const state = defaultGuild();
  expect(applyCount(state, '1', 'alice', 'm1')).toEqual({ kind: 'correct', current: 1 });
  expect(applyCount(state, '1', 'alice', 'm1')).toEqual({ kind: 'duplicate' });
  expect(applyCount(state, '2', 'alice', 'm2')).toEqual({ kind: 'wrong', expected: 2, reason: 'same-user' });
  expect(state.counting.current).toBe(0);
  expect(state.counting.best).toBe(1);
  expect(applyCount(state, '1', 'bob', 'm3')).toEqual({ kind: 'correct', current: 1 });
  expect(applyCount(state, '3', 'alice', 'm4')).toEqual({ kind: 'wrong', expected: 2, reason: 'wrong-number' });
});

it('attributes only one unambiguous invite increment and never guesses missing or simultaneous baselines', () => {
  const before = [{ code: 'one', uses: 1, inviterId: 'alice' }, { code: 'two', uses: 2, inviterId: 'bob' }];
  expect(resolveInvite(before, [{ ...before[0]!, uses: 2 }, before[1]!])).toBe('alice');
  expect(resolveInvite(undefined, before)).toBeNull();
  expect(resolveInvite(before, [{ ...before[0]!, uses: 3 }, before[1]!])).toBeNull();
  expect(resolveInvite(before, [{ ...before[0]!, uses: 2 }, { ...before[1]!, uses: 3 }])).toBeNull();
  expect(resolveInvite(before, [before[1]!])).toBeNull();
});

it('keeps unique invite totals across rejoin cycles and decrements only active referrals', () => {
  const state = defaultGuild();
  applyInviteJoin(state, 'newcomer', 'alice');
  applyInviteJoin(state, 'newcomer', 'alice');
  expect(state.inviteScores.alice).toEqual({ active: 1, total: 1 });
  applyInviteLeave(state, 'newcomer');
  applyInviteLeave(state, 'newcomer');
  expect(state.inviteScores.alice).toEqual({ active: 0, total: 1 });
  applyInviteJoin(state, 'newcomer', 'bob');
  expect(state.inviteScores.alice).toEqual({ active: 1, total: 1 });
  expect(state.inviteScores.bob).toBeUndefined();
  applyInviteJoin(state, 'self', 'self');
  expect(state.inviteScores.self).toBeUndefined();
});

it('awards modest XP at most once per minute without cross-member cooldowns', () => {
  const state = defaultGuild();
  expect(awardMessageXp(state, 'alice', 100000)).toBe(10);
  expect(awardMessageXp(state, 'alice', 100001)).toBe(0);
  expect(awardMessageXp(state, 'bob', 100001)).toBe(10);
  expect(awardMessageXp(state, 'alice', 160000)).toBe(10);
  expect(state.levels.alice?.xp).toBe(20);
});

it('validates nested config patches and rejects privileged or unmanageable role assignment', () => {
  const config = defaultGuild().config;
  const updated = mergeConfig(config, { counting: { enabled: true, channelId: '123456789012345678' } });
  expect(updated.counting.enabled).toBe(true);
  expect(updated.welcome).toEqual(config.welcome);
  expect(() => mergeConfig(config, { counting: { enabled: true } })).toThrow(/channel/i);
  expect(() => mergeConfig(config, { invites: { challengeTarget: -1 } })).toThrow();
  expect(() => mergeConfig(config, { unknown: true })).toThrow();
  const role = { id: '123456789012345678', guild: { id: '999999999999999999' }, managed: false, editable: true, permissions: new PermissionsBitField(PermissionFlagsBits.Administrator) };
  expect(() => assertSafeRole(role as never)).toThrow(/privileged/i);
  expect(() => assertSafeRole({ ...role, permissions: new PermissionsBitField(), editable: false } as never)).toThrow(/hierarchy/i);
  expect(() => assertSafeRole({ ...role, permissions: new PermissionsBitField() } as never)).not.toThrow();
});

it('returns independent, safe default snapshots before any guild enables features', async () => {
  const service = new CommunityService({} as never, await directory(), new Logger('error'));
  await service.init();
  const one = await service.snapshot('one');
  one.config.levels.enabled = true;
  expect((await service.getConfig('two')).levels.enabled).toBe(false);
  expect((await service.snapshot('one')).config.levels.enabled).toBe(false);
  expect(one.inviteTracking.ready).toBe(false);
  expect(one.inviteLeaderboard).toEqual([]);
});

it('reacts only after serial counting commits and never advances edited messages', async () => {
  const guildId = '111111111111111111';
  const channelId = '222222222222222222';
  const channel = { id: channelId, guildId, isTextBased: () => true, isThread: () => false, permissionsFor: () => new PermissionsBitField(PermissionFlagsBits.Administrator) };
  const guild = { id: guildId, members: { fetchMe: async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.Administrator) }) }, channels: { fetch: async () => channel }, roles: { fetch: async () => new Map() } };
  const client = Object.assign(new EventEmitter(), { isReady: () => false, guilds: { fetch: async () => guild } });
  const service = new CommunityService(client as never, await directory(), new Logger('error'));
  await service.init();
  await service.updateConfig(guildId, { counting: { enabled: true, channelId } });
  service.attach();
  const react = vi.fn(async () => undefined);
  const message = { id: 'm1', guildId, channelId, guild, author: { id: 'alice', bot: false }, content: '1', webhookId: null, react, reply: vi.fn(), member: null };
  client.emit('messageCreate', message);
  await vi.waitFor(() => expect(react).toHaveBeenCalledWith('✅'));
  client.emit('messageUpdate', message, { ...message, content: '2' });
  expect((await service.snapshot(guildId)).counting.current).toBe(1);
  service.stop();
});

it('baselines existing members without credit, then credits and removes a unique observed referral', async () => {
  const guildId = '111111111111111111';
  let uses = 0;
  const guild = { id: guildId, memberCount: 2, members: { fetchMe: async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.Administrator) }), fetch: async () => new Map([['existing', { id: 'existing', user: { bot: false } }]]) }, invites: { fetch: async () => new Map([['link', { code: 'link', uses, inviterId: 'inviter' }]]) } };
  const client = Object.assign(new EventEmitter(), { isReady: () => false, guilds: { fetch: async () => guild } });
  const service = new CommunityService(client as never, await directory(), new Logger('error'));
  await service.init();
  await service.updateConfig(guildId, { invites: { enabled: true } });
  expect((await service.snapshot(guildId)).inviteTracking.ready).toBe(true);
  service.attach();
  uses = 1;
  client.emit('guildMemberAdd', { id: 'new', guild, user: { bot: false } });
  await vi.waitFor(async () => expect((await service.snapshot(guildId)).inviteLeaderboard).toEqual([{ userId: 'inviter', active: 1, total: 1 }]));
  client.emit('guildMemberRemove', { id: 'new', guild, user: { bot: false } });
  await vi.waitFor(async () => expect((await service.snapshot(guildId)).inviteLeaderboard[0]?.active).toBe(0));
  service.stop();
});

it('registers public community stats and a staff-only self-role panel command', () => {
  const commands = communityCommands.map(command => command.toJSON());
  expect(commands.map(command => command.name)).toEqual(expect.arrayContaining(['counting', 'invites', 'rank', 'leaderboard', 'roles-panel']));
  expect(commands.find(command => command.name === 'roles-panel')?.default_member_permissions).toBe(PermissionFlagsBits.ManageGuild.toString());
  expect(commands.every(command => command.dm_permission === false)).toBe(true);
});

it('answers community interactions without consuming unrelated commands', async () => {
  const client = Object.assign(new EventEmitter(), { isReady: () => false });
  const service = new CommunityService(client as never, await directory(), new Logger('error'));
  await service.init(); service.attach();
  const reply = vi.fn(async () => undefined);
  const interaction = { isChatInputCommand: () => true, isButton: () => false, inCachedGuild: () => true, guildId: 'guild', commandName: 'counting', reply, editReply: reply, deferReply: async () => undefined };
  client.emit('interactionCreate', interaction);
  await vi.waitFor(() => expect(reply).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining('disabled') })));
  const unrelated = vi.fn();
  client.emit('interactionCreate', { ...interaction, commandName: 'twitch', reply: unrelated });
  expect(unrelated).not.toHaveBeenCalled();
  service.stop();
});

it('purges only the requested guild and persists removal', async () => {
  const path = await directory();
  const store = new CommunityStore(path); await store.init();
  await store.mutate('one', state => { state.counting.current = 20; });
  await store.mutate('two', state => { state.counting.current = 30; });
  expect(store.guildIds()).toEqual(['one', 'two']);
  await store.purgeGuild('one');
  await store.flush();
  const reopened = new CommunityStore(path); await reopened.init();
  expect(reopened.guildIds()).toEqual(['two']);
  expect(reopened.get('one').counting.current).toBe(0);
  expect(reopened.get('two').counting.current).toBe(30);
});

it('rolls back failed disk writes and continues accepting later mutations', async () => {
  const path = await directory();
  let rejectWrites = true;
  const store = new CommunityStore(path, async (file, contents) => { if (rejectWrites) throw new Error('Disk full'); await writeFile(file, contents); });
  await store.init();
  await expect(store.mutate('one', state => { state.counting.current = 8; })).rejects.toThrow('Disk full');
  expect(store.get('one').counting.current).toBe(0);
  rejectWrites = false;
  await store.mutate('one', state => { state.counting.current++; });
  expect(store.get('one').counting.current).toBe(1);
  const reopened = new CommunityStore(path); await reopened.init();
  expect(reopened.get('one').counting.current).toBe(1);
});

it('rejects channel IDs from another guild and staff-only role permissions', async () => {
  const guildId = '111111111111111111';
  const guild = { id: guildId, members: { fetchMe: async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.Administrator) }) }, channels: { fetch: async () => ({ guildId: '333333333333333333', isTextBased: () => true, isThread: () => false, permissionsFor: () => new PermissionsBitField(PermissionFlagsBits.Administrator) }) } };
  const client = { guilds: { fetch: async () => guild } };
  const service = new CommunityService(client as never, await directory(), new Logger('error')); await service.init();
  await expect(service.updateConfig(guildId, { counting: { enabled: true, channelId: '222222222222222222' } })).rejects.toThrow(/server|guild/i);
  expect(() => assertSafeRole({ id: 'role', guild: { id: 'guild' }, managed: false, editable: true, permissions: new PermissionsBitField(PermissionFlagsBits.ManageNicknames) } as never)).toThrow(/privileged/i);
});

it('does not attribute a changed known invite when another new invite has unobserved uses', () => {
  expect(resolveInvite([{ code: 'known', uses: 0, inviterId: 'alice' }], [{ code: 'known', uses: 1, inviterId: 'alice' }, { code: 'new', uses: 1, inviterId: 'bob' }])).toBeNull();
});

it('rechecks welcome-role privilege at join time and constrains welcome mentions', async () => {
  const guildId = '111111111111111111', channelId = '222222222222222222', roleId = '333333333333333333';
  const send = vi.fn(async () => undefined), add = vi.fn(async () => undefined);
  const role = { id: roleId, guild: { id: guildId }, managed: false, editable: true, permissions: new PermissionsBitField() };
  const channel = { guildId, isTextBased: () => true, isThread: () => false, permissionsFor: () => new PermissionsBitField(PermissionFlagsBits.Administrator), send };
  const guild = { id: guildId, name: 'Example @everyone', memberCount: 2, members: { fetchMe: async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.Administrator) }) }, channels: { fetch: async () => channel }, roles: { fetch: async (id?: string) => id ? role : new Map([[roleId, role]]) } };
  const client = Object.assign(new EventEmitter(), { isReady: () => false, guilds: { fetch: async () => guild } });
  const logger = new Logger('error'); vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  const service = new CommunityService(client as never, await directory(), logger); await service.init();
  await service.updateConfig(guildId, { welcome: { enabled: true, channelId, autoRoleIds: [roleId] } });
  role.permissions = new PermissionsBitField(PermissionFlagsBits.Administrator);
  service.attach();
  client.emit('guildMemberAdd', { id: 'new', guild, user: { bot: false }, roles: { add } });
  await vi.waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: { parse: [], users: ['new'] } })));
  expect(add).not.toHaveBeenCalled(); service.stop();
});

it('fails closed on semantically corrupt stored guild state without overwriting it', async () => {
  const path = await directory(), file = join(path, 'community.json');
  const state = defaultGuild();
  const invalid = JSON.stringify({ version: 1, guilds: { guild: { ...state, counting: { ...state.counting, current: 'not-a-count' } } } });
  await writeFile(file, invalid);
  const store = new CommunityStore(path);
  await expect(store.init()).rejects.toThrow(/invalid/i);
  expect(await readFile(file, 'utf8')).toBe(invalid);
});

it('waits for membership screening before granting an automatic role', async () => {
  const guildId = '111111111111111111', channelId = '222222222222222222', roleId = '333333333333333333';
  const send = vi.fn(async () => undefined), add = vi.fn(async () => undefined);
  const role = { id: roleId, guild: { id: guildId }, managed: false, editable: true, permissions: new PermissionsBitField() };
  const channel = { guildId, isTextBased: () => true, isThread: () => false, permissionsFor: () => new PermissionsBitField(PermissionFlagsBits.Administrator), send };
  const guild = { id: guildId, name: 'Example', memberCount: 2, members: { fetchMe: async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.Administrator) }) }, channels: { fetch: async () => channel }, roles: { fetch: async (id?: string) => id ? role : new Map([[roleId, role]]) } };
  const client = Object.assign(new EventEmitter(), { isReady: () => false, guilds: { fetch: async () => guild } });
  const service = new CommunityService(client as never, await directory(), new Logger('error')); await service.init();
  await service.updateConfig(guildId, { welcome: { enabled: true, channelId, autoRoleIds: [roleId] } }); service.attach();
  const pending = { id: 'new', guild, user: { bot: false }, pending: true, roles: { add } };
  client.emit('guildMemberAdd', pending);
  await vi.waitFor(() => expect(send).toHaveBeenCalled());
  expect(add).not.toHaveBeenCalled();
  client.emit('guildMemberUpdate', pending, { ...pending, pending: false });
  await vi.waitFor(() => expect(add).toHaveBeenCalledTimes(1)); service.stop();
});

it('refuses to establish an invite baseline from missing usage counts', async () => {
  const guildId = '111111111111111111';
  const guild = { id: guildId, memberCount: 1, members: { fetchMe: async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.Administrator) }), fetch: async () => new Map() }, invites: { fetch: async () => new Map([['link', { code: 'link', uses: null, inviterId: 'inviter' }]]) } };
  const service = new CommunityService({ guilds: { fetch: async () => guild } } as never, await directory(), new Logger('error')); await service.init();
  await expect(service.updateConfig(guildId, { invites: { enabled: true } })).rejects.toThrow(/usage|uses/i);
  expect((await service.getConfig(guildId)).invites.enabled).toBe(false);
  expect((await service.snapshot(guildId)).inviteTracking.ready).toBe(false);
});

