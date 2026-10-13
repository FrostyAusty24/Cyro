import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { setImmediate } from 'node:timers/promises';
import { Events, PermissionsBitField, PermissionFlagsBits } from 'discord.js';
import { afterEach, expect, it, vi } from 'vitest';
import { mergeConfig } from '../src/community/config.js';
import { CommunityStore } from '../src/community/store.js';
import { CommunityService } from '../src/community/service.js';
import { defaultGuild } from '../src/community/types.js';
import { VerificationChallenges, CHALLENGE_TTL_MS } from '../src/verification/challenges.js';
import { renderVerificationImage } from '../src/verification/image.js';
import { VerificationService } from '../src/verification/service.js';
import { Logger } from '../src/logger.js';

const guildId = '111111111111111111', channelId = '222222222222222222', roleId = '333333333333333333', messageId = '444444444444444444', userId = '555555555555555555';
const binding = { guildId, channelId, roleId, panelId: messageId, userId };
const directories: string[] = [];
async function directory() { const path = await mkdtemp(join(tmpdir(), 'verification-')); directories.push(path); return path; }
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

it('binds answers to guild and member, limits failures, consumes success and expires at the deadline', () => {
  let now = 1_000;
  const challenges = new VerificationChallenges(() => now, () => 'AB2C3D');
  const first = challenges.issue(binding);
  expect(challenges.answer(first.token, { ...binding, guildId: 'other' }, first.code).kind).toBe('invalid');
  expect(challenges.answer(first.token, { ...binding, userId: 'other' }, first.code).kind).toBe('invalid');
  expect(challenges.answer('forged', binding, first.code).kind).toBe('invalid');
  expect(challenges.answer(first.token, binding, 'bad')).toEqual({ kind: 'wrong', remaining: 2 });
  expect(challenges.answer(first.token, binding, first.code.toLowerCase())).toEqual({ kind: 'success', binding });
  expect(challenges.answer(first.token, binding, first.code).kind).toBe('invalid');
  expect(() => challenges.issue(binding)).toThrow(/wait/i);
  now += 20_000;
  const second = challenges.issue(binding);
  now += CHALLENGE_TTL_MS;
  expect(challenges.lookup(second.token, binding)).toBeNull();
  expect(challenges.answer(second.token, binding, second.code).kind).toBe('invalid');
  const third = challenges.issue(binding);
  challenges.answer(third.token, binding, 'wrong'); challenges.answer(third.token, binding, 'wrong');
  expect(challenges.answer(third.token, binding, 'wrong').kind).toBe('locked');
  expect(challenges.answer(third.token, binding, third.code).kind).toBe('invalid');
  now += 59_999;
  expect(() => challenges.issue(binding)).toThrow(/wait/i);
  now++;
  expect(challenges.issue(binding).code).toBe('AB2C3D');
});

it('replaces old images, isolates member cooldowns by guild and invalidates pending guild challenges', () => {
  let now = 1;
  const challenges = new VerificationChallenges(() => now, () => '234567');
  const first = challenges.issue(binding);
  const other = { ...binding, guildId: 'other' };
  const otherImage = challenges.issue(other);
  now += 20_000;
  const second = challenges.issue(binding);
  expect(challenges.lookup(first.token, binding)).toBeNull();
  challenges.invalidateGuild(guildId);
  expect(challenges.lookup(second.token, binding)).toBeNull();
  expect(challenges.lookup(otherImage.token, other)).toEqual(other);
});

it('renders valid image pixels without embedding the code as PNG text metadata', () => {
  const png = renderVerificationImage('AB2C3D');
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(300); expect(png.readUInt32BE(20)).toBe(96);
  const chunks: string[] = [], imageData: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset), type = png.toString('ascii', offset + 4, offset + 8);
    chunks.push(type); if (type === 'IDAT') imageData.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  expect(chunks).toEqual(['IHDR', 'IDAT', 'IEND']);
  expect(inflateSync(Buffer.concat(imageData)).length).toBe(96 * (300 * 3 + 1));
  expect(png.includes(Buffer.from('AB2C3D'))).toBe(false);
  expect(() => renderVerificationImage('<script>')).toThrow();
});

it('migrates older community files without changing counters or admitting malformed stored panel origins', async () => {
  const path = await directory(), state: any = defaultGuild();
  delete state.config.verification; delete state.verificationPanel; state.counting.current = 42;
  await writeFile(join(path, 'community.json'), JSON.stringify({ version: 1, guilds: { [guildId]: state } }));
  const store = new CommunityStore(path); await store.init();
  expect(store.config(guildId).verification.enabled).toBe(false);
  expect(store.get(guildId).verificationPanel).toBeNull();
  expect(store.get(guildId).counting.current).toBe(42);
  state.verificationPanel = { messageId: 'arbitrary', channelId, roleId, mode: 'challenge' };
  await writeFile(join(path, 'community.json'), JSON.stringify({ version: 1, guilds: { [guildId]: state } }));
  await expect(new CommunityStore(path).init()).rejects.toThrow(/preserved/i);
  expect(JSON.parse(await readFile(join(path, 'community.json'), 'utf8')).guilds[guildId].counting.current).toBe(42);
});

it('rejects unknown config, missing destinations and bypasses through self or welcome roles', () => {
  const config = defaultGuild().config;
  const verification = { enabled: true, channelId, roleId, mode: 'challenge' };
  expect(() => mergeConfig(config, { verification: { enabled: true } })).toThrow(/channel and role/i);
  expect(() => mergeConfig(config, { verification: { mode: 'anything' } })).toThrow(/mode/i);
  expect(() => mergeConfig(config, { verification: { arbitrary: true } })).toThrow(/unknown/i);
  expect(() => mergeConfig(config, { verification, selfRoles: { roles: [{ roleId, label: 'bypass' }] } })).toThrow(/automatic or self/i);
  expect(() => mergeConfig(config, { verification, welcome: { autoRoleIds: [roleId] } })).toThrow(/automatic or self/i);
  expect(mergeConfig(config, { verification }).verification.roleId).toBe(roleId);
});

async function fixture(mode: 'challenge' | 'reaction' = 'challenge') {
  const path = await directory(), store = new CommunityStore(path); await store.init();
  await store.mutate(guildId, state => {
    state.config = mergeConfig(state.config, { verification: { enabled: true, channelId, roleId, mode } });
    state.verificationPanel = { channelId, messageId, roleId, mode };
  });
  const role = { id: roleId, guild: { id: guildId }, editable: true, managed: false, permissions: new PermissionsBitField() };
  const member = { pending: false, user: { bot: false }, roles: { cache: new Map<string, unknown>(), add: vi.fn(async () => undefined) } };
  const message = { id: messageId, author: { id: 'bot' }, react: vi.fn(async () => undefined) };
  const channel = { id: channelId, guildId, isTextBased: () => true, isThread: () => false, permissionsFor: () => new PermissionsBitField(PermissionFlagsBits.Administrator), send: vi.fn(async () => message) };
  const guild = { id: guildId, members: { fetchMe: vi.fn(async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.ManageRoles) })), fetch: vi.fn(async () => member) }, roles: { fetch: vi.fn(async () => role) }, channels: { fetch: vi.fn(async () => channel) } };
  const client = Object.assign(new EventEmitter(), { user: { id: 'bot' }, guilds: { fetch: vi.fn(async () => guild) } });
  let tail: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(_guildId: string, operation: () => Promise<T>): Promise<T> => { const task = tail.then(operation); tail = task.catch(() => undefined); return task; };
  const challenges = new VerificationChallenges(Date.now, () => 'AB2C3D');
  const logger = new Logger('error'); vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  const service = new VerificationService(client as never, store, enqueue, logger, challenges); service.attach();
  const base = () => ({ guildId, channelId, user: { id: userId, bot: false }, deferred: false, replied: false,
    deferReply: vi.fn(async function(this: any) { this.deferred = true; }), editReply: vi.fn(async () => undefined), reply: vi.fn(async () => undefined),
    isButton: () => true, isModalSubmit: () => false });
  return { path, store, role, member, message, channel, guild, client, challenges, service, base };
}

it('issues private images, opens an answer modal, grants once and refuses forged or replayed answers', async () => {
  const f = await fixture();
  try {
    const start = { ...f.base(), customId: 'verify:start', message: f.message };
    f.client.emit(Events.InteractionCreate, start); await f.service.flush();
    expect(start.deferReply).toHaveBeenCalledOnce();
    const reply: any = start.editReply.mock.calls[0]![0];
    expect(reply.files[0].name).toBe('verification.png'); expect(JSON.stringify(reply.components)).not.toContain('AB2C3D');
    const answerId = reply.components[0].components[0].data.custom_id as string;
    const answer = { ...f.base(), customId: answerId, showModal: vi.fn(async () => undefined) };
    f.client.emit(Events.InteractionCreate, answer); await f.service.flush();
    expect(answer.showModal).toHaveBeenCalledOnce(); expect(answer.deferReply).not.toHaveBeenCalled();
    const modalId = (answer.showModal.mock.calls[0]![0] as any).data.custom_id;
    const submit = { ...f.base(), isButton: () => false, isModalSubmit: () => true, customId: modalId, fields: { getTextInputValue: () => 'ab2c3d' } };
    const forged = { ...submit, ...f.base(), isButton: () => false, isModalSubmit: () => true, user: { id: 'other', bot: false } };
    f.client.emit(Events.InteractionCreate, forged); await f.service.flush(); expect(f.member.roles.add).not.toHaveBeenCalled();
    f.client.emit(Events.InteractionCreate, submit); await f.service.flush();
    expect(f.member.roles.add).toHaveBeenCalledExactlyOnceWith(roleId, 'Completed Cyro image verification');
    f.client.emit(Events.InteractionCreate, { ...submit, ...f.base(), isButton: () => false, isModalSubmit: () => true }); await f.service.flush();
    expect(f.member.roles.add).toHaveBeenCalledOnce();
  } finally { f.service.stop(); await f.service.flush(); }
});

it('allows only persisted reaction panels and rechecks role privileges, hierarchy and screening', async () => {
  const f = await fixture('reaction');
  const reaction = { emoji: { id: null, name: '✅' }, message: { ...f.message, guildId, channelId, partial: false } };
  try {
    f.client.emit(Events.MessageReactionAdd, { ...reaction, message: { ...reaction.message, id: 'forged' } }, { id: userId });
    f.client.emit(Events.MessageReactionAdd, { ...reaction, message: { ...reaction.message, guildId: 'other' } }, { id: userId });
    await f.service.flush(); expect(f.member.roles.add).not.toHaveBeenCalled();
    f.role.editable = false; f.client.emit(Events.MessageReactionAdd, reaction, { id: userId }); await f.service.flush();
    expect(f.member.roles.add).not.toHaveBeenCalled();
    f.role.editable = true; f.role.permissions.add(PermissionFlagsBits.Administrator);
    f.client.emit(Events.MessageReactionAdd, reaction, { id: userId }); await f.service.flush(); expect(f.member.roles.add).not.toHaveBeenCalled();
    f.role.permissions.remove(PermissionFlagsBits.Administrator); f.member.pending = true;
    f.client.emit(Events.MessageReactionAdd, reaction, { id: userId }); await f.service.flush(); expect(f.member.roles.add).not.toHaveBeenCalled();
    f.member.pending = false;
    f.client.emit(Events.MessageReactionAdd, reaction, { id: userId }); await f.service.flush();
    expect(f.member.roles.add).toHaveBeenCalledExactlyOnceWith(roleId, 'Accepted Cyro reaction verification');
    expect(f.guild.members.fetchMe).toHaveBeenCalledWith({ force: true });
  } finally { f.service.stop(); await f.service.flush(); }
});

it('revokes outstanding challenges after configuration changes and fetches role safety again before CAPTCHA grants', async () => {
  const f = await fixture();
  try {
    const issued = f.challenges.issue(binding);
    const submit = { ...f.base(), customId: `verify:submit:${issued.token}`, isButton: () => false, isModalSubmit: () => true, fields: { getTextInputValue: () => issued.code } };
    f.role.editable = false;
    f.client.emit(Events.InteractionCreate, submit); await f.service.flush(); expect(f.member.roles.add).not.toHaveBeenCalled();
    f.role.editable = true;
    f.client.emit(Events.InteractionCreate, { ...submit, ...f.base(), isButton: () => false, isModalSubmit: () => true }); await f.service.flush();
    expect(f.member.roles.add).not.toHaveBeenCalled(); // Failed role operation still consumes the proof.
    const next = f.challenges.issue({ ...binding, userId: 'different' });
    await f.store.mutate(guildId, state => { state.config.verification.mode = 'reaction'; });
    const changed = { ...f.base(), user: { id: 'different', bot: false }, customId: `verify:submit:${next.token}`, isButton: () => false, isModalSubmit: () => true, fields: { getTextInputValue: () => next.code } };
    f.client.emit(Events.InteractionCreate, changed); await f.service.flush(); expect(f.member.roles.add).not.toHaveBeenCalled();
  } finally { f.service.stop(); await f.service.flush(); }
});

it('persists newly published panels and rejects rapid duplicate publish requests', async () => {
  const f = await fixture('reaction');
  try {
    const results = await Promise.allSettled([f.service.publishPanel(guildId), f.service.publishPanel(guildId)]);
    expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected']);
    expect(f.channel.send).toHaveBeenCalledOnce(); expect(f.message.react).toHaveBeenCalledWith('✅');
    const reopened = new CommunityStore(f.path); await reopened.init();
    expect(reopened.get(guildId).verificationPanel).toEqual({ channelId, messageId, roleId, mode: 'reaction' });
    expect(f.channel.send.mock.calls[0]![0]).toMatchObject({ allowedMentions: { parse: [] } });
  } finally { f.service.stop(); await f.service.flush(); }
});

it('publishes the configured reaction panel as a colored embed without extra public instructions', async () => {
  const f = await fixture('reaction');
  const title = 'Get verified', message = "Welcome to Example Community\n\nJust click the ✅ emoji below to access the rest of the discord!";
  try {
    await f.store.mutate(guildId, state => { state.config.verification.title = title; state.config.verification.message = message; });
    await f.service.publishPanel(guildId);
    const payload = JSON.parse(JSON.stringify(f.channel.send.mock.calls[0]![0]));
    expect(payload.content ?? '').toBe('');
    expect(payload.embeds).toEqual([{ title, description: message, color: 0x82d9f7 }]);
    expect(payload.components).toEqual([]);
    expect(payload.allowedMentions).toEqual({ parse: [] });
    expect(f.message.react).toHaveBeenCalledExactlyOnceWith('✅');
    expect(f.store.get(guildId).verificationPanel).toEqual({ channelId, messageId, roleId, mode: 'reaction' });
  } finally { f.service.stop(); await f.service.flush(); }
});

it.each(['reaction', 'challenge'] as const)('rejects publishing %s panels before sending when Embed Links is denied', async mode => {
  const f = await fixture(mode);
  try {
    f.channel.permissionsFor = () => new PermissionsBitField([
      PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions, PermissionFlagsBits.AttachFiles,
    ]);
    await expect(f.service.publishPanel(guildId)).rejects.toThrow(/enable.*Embed Links.*verification channel/i);
    expect(f.channel.send).not.toHaveBeenCalled();
    expect(f.message.react).not.toHaveBeenCalled();
    expect(f.store.get(guildId).verificationPanel).toEqual({ channelId, messageId, roleId, mode });
  } finally { f.service.stop(); await f.service.flush(); }
});

it('keeps the challenge Verify action working beneath the embed and grants after its private image answer', async () => {
  const f = await fixture('challenge');
  try {
    await f.service.publishPanel(guildId);
    const payload = JSON.parse(JSON.stringify(f.channel.send.mock.calls[0]![0]));
    const config = f.store.config(guildId).verification;
    expect(payload.content ?? '').toBe('');
    expect(payload.embeds).toEqual([{ title: config.title, description: config.message, color: 0x82d9f7 }]);
    expect(payload.allowedMentions).toEqual({ parse: [] });
    expect(payload.components[0].components[0]).toMatchObject({ type: 2, custom_id: 'verify:start', label: 'Verify', style: 1 });
    expect(f.message.react).not.toHaveBeenCalled();
    const reopened = new CommunityStore(f.path); await reopened.init();
    expect(reopened.get(guildId).verificationPanel).toEqual({ channelId, messageId, roleId, mode: 'challenge' });
    const start = { ...f.base(), customId: payload.components[0].components[0].custom_id, message: f.message };
    f.client.emit(Events.InteractionCreate, start); await f.service.flush();
    const privateReply: any = start.editReply.mock.calls[0]![0];
    expect(privateReply.files[0].name).toBe('verification.png');
    const token = privateReply.components[0].components[0].data.custom_id.slice('verify:answer:'.length);
    const submit = { ...f.base(), customId: `verify:submit:${token}`, isButton: () => false, isModalSubmit: () => true, fields: { getTextInputValue: () => 'AB2C3D' } };
    f.client.emit(Events.InteractionCreate, submit); await f.service.flush();
    expect(f.member.roles.add).toHaveBeenCalledExactlyOnceWith(roleId, 'Completed Cyro image verification');
  } finally { f.service.stop(); await f.service.flush(); }
});

it('drains a pending verified role grant on stop and refuses new events', async () => {
  const f = await fixture('reaction');
  let release!: () => void;
  f.member.roles.add.mockImplementation(() => new Promise<void>(resolve => { release = resolve; }));
  const reaction = { emoji: { id: null, name: '✅' }, message: { ...f.message, guildId, channelId, partial: false } };
  try {
    f.client.emit(Events.MessageReactionAdd, reaction, { id: userId });
    await vi.waitFor(() => expect(f.member.roles.add).toHaveBeenCalledOnce());
    f.service.stop(); f.client.emit(Events.MessageReactionAdd, reaction, { id: 'other' });
    let drained = false; const flushing = f.service.flush().then(() => { drained = true; });
    await setImmediate(); expect(drained).toBe(false);
    release(); await flushing; expect(f.member.roles.add).toHaveBeenCalledOnce();
    expect(f.client.listenerCount(Events.MessageReactionAdd)).toBe(0);
  } finally { release?.(); f.service.stop(); await f.service.flush(); }
});

it('community config updates persistently invalidate old verification panels', async () => {
  const f = await fixture();
  const client = Object.assign(f.client, { isReady: () => false });
  const service = new CommunityService(client as never, f.path, new Logger('error')); await service.init();
  try {
    await service.updateConfig(guildId, { verification: { enabled: false } });
    expect((await service.snapshot(guildId)).verificationPanel).toBeNull();
    const reopened = new CommunityStore(f.path); await reopened.init(); expect(reopened.get(guildId).verificationPanel).toBeNull();
  } finally { f.service.stop(); service.stop(); await Promise.all([f.service.flush(), service.flush()]); }
});
