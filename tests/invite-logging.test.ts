import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { afterEach, expect, it, vi } from 'vitest';
import { ChannelType, Events, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { CommunityService } from '../src/community/service.js';
import { CommunityStore } from '../src/community/store.js';
import { appendInviteLog, departureSource, MAX_INVITE_LOG, resolveInviteSource, unknownInvite } from '../src/community/invite-log.js';
import { defaultGuild } from '../src/community/types.js';
import { Logger } from '../src/logger.js';

const directories: string[] = [];
const services: CommunityService[] = [];
afterEach(async () => {
  for (const service of services.splice(0)) { service.stop(); await service.flush(); }
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true })));
});
async function fixture() {
  const path = await mkdtemp(join(tmpdir(), 'invite-logging-')); directories.push(path);
  let uses = 0;
  const guildId = '111111111111111111', channelId = '222222222222222222';
  const send = vi.fn(async () => ({ id: 'message' }));
  const channel = { id: channelId, guildId, type: ChannelType.GuildText, isTextBased: () => true, isThread: () => false, permissionsFor: () => new PermissionsBitField(PermissionFlagsBits.Administrator), send };
  const guild = {
    id: guildId, memberCount: 1, available: true,
    members: { fetchMe: async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.Administrator) }), fetch: async () => new Map() },
    invites: { fetch: vi.fn(async () => new Map([['link', { code: 'link', uses, inviterId: '333333333333333333', channelId }]])) },
    channels: { fetch: async () => channel },
  };
  const client = Object.assign(new EventEmitter(), { isReady: () => false, guilds: { fetch: async () => guild } });
  const logger = new Logger('error'); vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  const service = new CommunityService(client as never, path, logger); services.push(service); await service.init(); service.attach();
  const member = { id: '444444444444444444', displayName: 'Example', joinedTimestamp: 1000, user: { bot: false, username: 'example' }, guild };
  return { path, service, client, guild, guildId, channelId, member, send, setUses: (next: number) => { uses = next; } };
}

it('records a durable invite source and sends a ping-free staff log while challenges are disabled', async () => {
  const f = await fixture();
  await f.service.updateConfig(f.guildId, { invites: { loggingEnabled: true, logChannelId: f.channelId } });
  f.setUses(1); f.client.emit(Events.GuildMemberAdd, f.member); await f.service.flush();
  const snapshot = await f.service.snapshot(f.guildId);
  expect(snapshot.config.invites.enabled).toBe(false);
  expect(snapshot.inviteTracking.ready).toBe(true);
  expect(snapshot.inviteLeaderboard).toEqual([]);
  expect(snapshot.inviteLog).toEqual([expect.objectContaining({ event: 'joined', memberId: f.member.id, memberName: 'Example', inviterId: '333333333333333333', inviteCode: 'link', inviteChannelId: f.channelId, source: 'invite', reason: 'matched' })]);
  expect(f.send).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: { parse: [] } }));
  const reopened = new CommunityService({} as never, f.path, new Logger('error')); await reopened.init();
  expect((await reopened.snapshot(f.guildId)).inviteLog).toEqual(snapshot.inviteLog);
  expect((await reopened.snapshot('555555555555555555')).inviteLog).toEqual([]);
});

it('does not turn an invite-create event with missing uses into a guessed zero-use baseline', async () => {
  const f = await fixture();
  await f.service.updateConfig(f.guildId, { invites: { loggingEnabled: true } });
  f.client.emit(Events.InviteCreate, { code: 'unreliable', uses: null, inviterId: '333333333333333333', guild: f.guild });
  expect((await f.service.snapshot(f.guildId)).inviteTracking.ready).toBe(false);
});

it('records ambiguous joins and unmatched departures as unknown without guessing an inviter', async () => {
  const f = await fixture();
  await f.service.updateConfig(f.guildId, { invites: { loggingEnabled: true } });
  f.setUses(2); f.client.emit(Events.GuildMemberAdd, f.member); await f.service.flush();
  expect((await f.service.snapshot(f.guildId)).inviteLog[0]).toMatchObject({ event: 'joined', reason: 'ambiguous', source: 'unknown', inviterId: null, inviteCode: null });
  f.client.emit(Events.GuildMemberRemove, f.member); await f.service.flush();
  expect((await f.service.snapshot(f.guildId)).inviteLog[0]).toMatchObject({ event: 'left', reason: 'ambiguous', source: 'unknown', inviterId: null });
  f.client.emit(Events.GuildMemberRemove, { ...f.member, id: '666666666666666666' }); await f.service.flush();
  expect((await f.service.snapshot(f.guildId)).inviteLog[0]).toMatchObject({ event: 'left', reason: 'unknown-join', source: 'unknown', inviterId: null });
  expect(f.send).not.toHaveBeenCalled();
});

it('logs each rejoin source separately from original challenge credit and deduplicates join/leave deliveries', async () => {
  const f = await fixture(), original = '333333333333333333', second = '777777777777777777';
  const invites = (firstUses: number, secondUses: number) => new Map([
    ['first', { code: 'first', uses: firstUses, inviterId: original, channelId: f.channelId }],
    ['second', { code: 'second', uses: secondUses, inviterId: second, channelId: f.channelId }],
  ]);
  f.guild.invites.fetch.mockResolvedValue(invites(0, 0));
  await f.service.updateConfig(f.guildId, { invites: { enabled: true, loggingEnabled: true, logChannelId: f.channelId } });
  f.guild.invites.fetch.mockResolvedValue(invites(1, 0));
  for (let i = 0; i < 2; i++) f.client.emit(Events.GuildMemberAdd, f.member);
  await f.service.flush();
  for (let i = 0; i < 2; i++) f.client.emit(Events.GuildMemberRemove, f.member);
  await f.service.flush();
  const rejoined = { ...f.member, joinedTimestamp: 2000 };
  f.guild.invites.fetch.mockResolvedValue(invites(1, 1));
  f.client.emit(Events.GuildMemberAdd, rejoined); await f.service.flush();
  expect((await f.service.snapshot(f.guildId)).inviteLog[0]).toMatchObject({ event: 'joined', inviterId: second, inviteCode: 'second', referralInviterId: original });
  f.client.emit(Events.GuildMemberRemove, rejoined); await f.service.flush();
  const snapshot = await f.service.snapshot(f.guildId);
  expect(snapshot.inviteLog[0]).toMatchObject({ event: 'left', inviterId: second, inviteCode: 'second', referralInviterId: original });
  expect(snapshot.inviteLog).toHaveLength(4);
  expect(snapshot.inviteLeaderboard).toEqual([{ userId: original, active: 0, total: 1 }]);
  expect(f.send).toHaveBeenCalledTimes(4);
});

it('retains the saved history when logging is disabled and preserves audit rows when Discord delivery fails', async () => {
  const f = await fixture();
  await f.service.updateConfig(f.guildId, { invites: { loggingEnabled: true, logChannelId: f.channelId } });
  f.send.mockRejectedValueOnce(new Error('Network result unknown'));
  f.setUses(1); f.client.emit(Events.GuildMemberAdd, f.member); await f.service.flush();
  const saved = (await f.service.snapshot(f.guildId)).inviteLog;
  expect(saved).toHaveLength(1); expect(f.send).toHaveBeenCalledTimes(1);
  await f.service.updateConfig(f.guildId, { invites: { loggingEnabled: false } });
  f.client.emit(Events.GuildMemberRemove, f.member);
  f.client.emit(Events.GuildMemberAdd, { ...f.member, joinedTimestamp: 2000 }); await f.service.flush();
  expect((await f.service.snapshot(f.guildId)).inviteLog).toEqual(saved);
  expect((await f.service.snapshot(f.guildId)).inviteTracking.ready).toBe(false);
  expect(f.send).toHaveBeenCalledTimes(1);
});

it('bounds retained invite history and returns only the latest 250 guild-scoped rows', async () => {
  const f = await fixture(), store = new CommunityStore(f.path); await store.init();
  await store.mutate(f.guildId, state => {
    for (let index = 0; index < MAX_INVITE_LOG + 2; index++) appendInviteLog(state, { ...unknownInvite('no-baseline'), event: 'joined', memberId: String(index), memberName: `Member ${index}`, joinedAt: index, at: index, referralInviterId: null });
  });
  expect(store.get(f.guildId).inviteLog).toHaveLength(MAX_INVITE_LOG);
  expect(store.get(f.guildId).inviteLog[0]?.memberName).toBe('Member 2');
  const reopened = new CommunityService({} as never, f.path, new Logger('error')); await reopened.init();
  const rows = (await reopened.snapshot(f.guildId)).inviteLog;
  expect(rows).toHaveLength(250); expect(rows[0]?.memberName).toBe(`Member ${MAX_INVITE_LOG + 1}`);
  expect((await reopened.snapshot('other')).inviteLog).toEqual([]);
});

it('does not reuse an older membership source for a partial departure without a join timestamp', () => {
  const state = defaultGuild();
  appendInviteLog(state, { source: 'invite', reason: 'matched', inviterId: 'alice', inviteCode: 'link', inviteChannelId: null, event: 'joined', memberId: 'bob', memberName: 'Bob', joinedAt: 1000, at: 1000, referralInviterId: null });
  expect(departureSource(state, 'bob', null)).toMatchObject({ source: 'unknown', reason: 'unknown-join', inviterId: null });
});

it('opens legacy guild files with logging disabled and preserves existing referral counts', async () => {
  const f = await fixture(), legacy = JSON.parse(JSON.stringify(defaultGuild()));
  delete legacy.inviteLog; delete legacy.config.invites.loggingEnabled; delete legacy.config.invites.logChannelId;
  legacy.config.invites.enabled = true;
  legacy.inviteMembers.member = { inviterId: 'original', active: true };
  legacy.inviteScores.original = { active: 1, total: 4 };
  const contents = JSON.stringify({ version: 1, guilds: { [f.guildId]: legacy } });
  await writeFile(join(f.path, 'community.json'), contents);
  const reopened = new CommunityStore(f.path); await reopened.init();
  const state = reopened.get(f.guildId);
  expect(state.config.invites).toMatchObject({ enabled: true, loggingEnabled: false, logChannelId: null });
  expect(state.inviteLog).toEqual([]); expect(state.inviteScores.original).toEqual({ active: 1, total: 4 });
  expect(await readFile(join(f.path, 'community.json'), 'utf8')).toBe(contents);
});

it('rejects a foreign log channel, missing channel permissions, or missing Manage Server before enabling', async () => {
  const f = await fixture(), channel = await f.guild.channels.fetch();
  const fetch = vi.spyOn(f.guild.channels, 'fetch');
  fetch.mockResolvedValue({ ...channel, guildId: '555555555555555555' });
  await expect(f.service.updateConfig(f.guildId, { invites: { loggingEnabled: true, logChannelId: f.channelId } })).rejects.toThrow(/this server/);
  fetch.mockResolvedValue({ ...channel, permissionsFor: () => new PermissionsBitField([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]) });
  await expect(f.service.updateConfig(f.guildId, { invites: { loggingEnabled: true, logChannelId: f.channelId } })).rejects.toThrow(/Embed Links/);
  f.guild.members.fetchMe = async () => ({ permissions: new PermissionsBitField() });
  await expect(f.service.updateConfig(f.guildId, { invites: { loggingEnabled: true } })).rejects.toThrow(/Manage Server/);
  expect((await f.service.getConfig(f.guildId)).invites.loggingEnabled).toBe(false);
  expect(f.guild.invites.fetch).not.toHaveBeenCalled();
});

it('labels deleted, missing-baseline and unchanged invite observations without claiming a source', () => {
  const before = [{ code: 'link', uses: 1, inviterId: 'alice' }];
  expect(resolveInviteSource(undefined, before)).toEqual(unknownInvite('no-baseline'));
  expect(resolveInviteSource(before, [])).toEqual(unknownInvite('deleted-invite'));
  expect(resolveInviteSource(before, before)).toEqual(unknownInvite('no-use-change'));
  expect(resolveInviteSource(before, [{ ...before[0]!, uses: 2 }, { code: 'new', uses: 1, inviterId: 'bob' }])).toEqual(unknownInvite('ambiguous'));
});
