import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { Collection, PermissionFlagsBits, PermissionsBitField, type Client, type Guild } from 'discord.js';
import { afterEach, expect, it, vi } from 'vitest';
import { SuggestionsService } from '../src/suggestions/service.js';
import { ControlStore } from '../src/control/store.js';
import { AccessService } from '../src/control/access.js';
import { Logger } from '../src/logger.js';

const A = '123456789012345678', B = '223456789012345678', C = '323456789012345678', U = '423456789012345678', V = '523456789012345678', BOT = '623456789012345678', M = '723456789012345678', I = '823456789012345678', R = '923456789012345678';
const folders: string[] = [], services: SuggestionsService[] = [];
afterEach(async () => {
  for (const service of services.splice(0)) { service.stop(); await service.flush(); }
  await Promise.all(folders.splice(0).map(f => rm(f, { recursive: true, force: true })));
});
async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-suggestions-service-')); folders.push(dir);
  const control = new ControlStore(dir); await control.init(); const access = new AccessService(control);
  const guild: any = { id: A, ownerId: U, roles: { fetch: vi.fn(async () => guild.roles.cache), cache: new Collection() } };
  const members = new Map([U, V, BOT].map(id => [id, { id, guild, pending: false, displayName: id === U ? 'Test creator' : 'Member', user: { id, bot: id === BOT }, roles: { cache: new Collection() }, permissions: new PermissionsBitField() }]));
  guild.members = { fetch: vi.fn(async (value: any) => members.get(typeof value === 'string' ? value : value.user)), fetchMe: vi.fn(async () => members.get(BOT)) };
  const message: any = { id: M, channelId: C, guildId: A, author: { id: BOT }, edit: vi.fn(async () => message) };
  const channel: any = { id: C, guild, type: 0, permissionsFor: vi.fn(() => new PermissionsBitField(PermissionFlagsBits.Administrator)), send: vi.fn(async () => message), messages: { fetch: vi.fn(async () => message) } };
  guild.channels = { fetch: vi.fn(async () => channel) };
  const client: any = new EventEmitter(); client.user = { id: BOT }; client.guilds = { fetch: vi.fn(async () => guild), cache: new Collection([[A, guild]]) }; client.isReady = () => true;
  const logger = new Logger('error'); vi.spyOn(logger, 'error').mockImplementation(() => undefined); vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  const service = new SuggestionsService(client as Client, dir, logger, access); services.push(service); await service.init();
  await service.updateConfig(A, { enabled: true, channelId: C, cooldownMinutes: 0 });
  return { dir, control, access, guild: guild as Guild, members, channel, message, client, logger, service };
}
it('creates one durable suggestion for duplicate simultaneous submissions', async () => {
  const f = await fixture();
  const [first, duplicate] = await Promise.all([f.service.create(f.guild, U, 'Add community game nights', I), f.service.create(f.guild, U, 'Add community game nights', I)]);
  expect(first).toMatchObject({ number: 1, delivery: 'sent', messageId: M, upVotes: 0, downVotes: 0 });
  expect(duplicate.id).toBe(first.id); expect(f.channel.send).toHaveBeenCalledOnce();
  expect(f.channel.send.mock.calls[0][0]).toMatchObject({ nonce: I, enforceNonce: true, allowedMentions: { parse: [] } });
  expect(f.service.snapshot(B).items).toEqual([]);
  const restarted = new SuggestionsService(f.client, f.dir, f.logger, f.access); services.push(restarted); await restarted.init();
  expect(restarted.snapshot(A).items).toEqual(f.service.snapshot(A).items);
});
it('serializes votes and persists the latest choice without exposing voter identities', async () => {
  const f = await fixture(); const suggestion = await f.service.create(f.guild, U, 'An idea', I);
  await Promise.all([
    f.service.vote(f.guild, U, suggestion.id, 'up', '823456789012345679', f.message),
    f.service.vote(f.guild, V, suggestion.id, 'up', '823456789012345680', f.message),
    f.service.vote(f.guild, U, suggestion.id, 'down', '823456789012345681', f.message),
  ]);
  await f.service.vote(f.guild, U, suggestion.id, 'up', '823456789012345679', f.message);
  const item = f.service.snapshot(A).items[0]!;
  expect(item).toMatchObject({ upVotes: 1, downVotes: 1, score: 0, syncPending: false }); expect(item).not.toHaveProperty('votes');
  expect(f.message.edit.mock.calls.at(-1)[0].components[0].toJSON().components.map((b: any) => b.label)).toEqual(['Upvote · 1', 'Downvote · 1', 'Remove vote']);
  await f.service.vote(f.guild, U, suggestion.id, null, '823456789012345682', f.message);
  const restarted = new SuggestionsService(f.client, f.dir, f.logger, f.access); services.push(restarted); await restarted.init();
  expect(restarted.snapshot(A).items[0]).toMatchObject({ upVotes: 1, downVotes: 0 });
});
it('lets authorized staff make an immutable decision and closes voting', async () => {
  const f = await fixture(); const item = await f.service.create(f.guild, U, 'An idea', I);
  await expect(f.service.decide(f.guild, V, item.id, { status: 'accepted', reason: 'Planned' })).rejects.toThrow('not granted');
  const decision = await f.service.decide(f.guild, U, item.id, { status: 'accepted', reason: 'Planned' });
  expect(decision).toMatchObject({ status: 'accepted', decision: { actorId: U, reason: 'Planned' }, syncPending: false });
  await expect(f.service.decide(f.guild, U, item.id, { status: 'accepted', reason: 'Planned' })).resolves.toEqual(decision);
  await expect(f.service.decide(f.guild, U, item.id, { status: 'declined' })).rejects.toThrow('already');
  await expect(f.service.vote(f.guild, V, item.id, 'up', '823456789012345680', f.message)).rejects.toThrow('closed');
  expect(f.message.edit.mock.calls.at(-1)[0].components[0].toJSON().components.every((button: any) => button.disabled)).toBe(true);
});
it('retains votes when message editing fails and repairs the display after restart', async () => {
  const f = await fixture(); const item = await f.service.create(f.guild, U, 'An idea', I);
  f.message.edit.mockRejectedValueOnce(new Error('Network failure'));
  expect(await f.service.vote(f.guild, V, item.id, 'up', '823456789012345680', f.message)).toMatchObject({ upVotes: 1, syncPending: true });
  const restarted = new SuggestionsService(f.client, f.dir, f.logger, f.access); services.push(restarted); await restarted.init();
  await restarted.reconcile();
  expect(restarted.snapshot(A).items[0]).toMatchObject({ upVotes: 1, syncPending: false });
  expect(f.message.edit).toHaveBeenCalledTimes(2); expect(f.channel.send).toHaveBeenCalledOnce();
});
it('persists an unknown send and never automatically repeats it after restart', async () => {
  const f = await fixture(); f.channel.send.mockRejectedValueOnce(new Error('Socket reset'));
  await expect(f.service.create(f.guild, U, 'An idea', I)).rejects.toThrow('unknown outcome');
  const restarted = new SuggestionsService(f.client, f.dir, f.logger, f.access); services.push(restarted); await restarted.init();
  await restarted.reconcile();
  await expect(restarted.create(f.guild, U, 'An idea', I)).rejects.toThrow('unknown outcome');
  expect(f.channel.send).toHaveBeenCalledOnce();
  expect(restarted.snapshot(A)).toMatchObject({ counts: { pending: 1 }, items: [{ delivery: 'pending' }] });
});
it('opens the modal immediately, then defers and rechecks permissions when it is submitted', async () => {
  const f = await fixture(); f.service.attach();
  const member = f.members.get(V)!;
  const command: any = { guild: f.guild, guildId: A, member, user: member.user, commandName: 'suggestion', isChatInputCommand: () => true, isButton: () => false, isModalSubmit: () => false, inCachedGuild: () => true, isRepliable: () => true, showModal: vi.fn(async () => undefined), reply: vi.fn() };
  f.guild.members.fetch = vi.fn(async () => { throw new Error('Fresh lookup should not precede the modal'); });
  f.client.emit('interactionCreate', command); await f.service.flush();
  expect(command.showModal).toHaveBeenCalledOnce(); expect(f.guild.members.fetch).not.toHaveBeenCalled();
  await f.control.mutate(A, state => { state.access.commandRoles.suggestion = [R]; });
  const order: string[] = [];
  f.guild.members.fetch = vi.fn(async () => { order.push('member'); return member as any; });
  const modal: any = { ...command, commandName: undefined, id: I, customId: 'suggest:create', isChatInputCommand: () => false, isModalSubmit: () => true, deferred: false, fields: { getTextInputValue: () => 'An idea' }, deferReply: vi.fn(async () => { modal.deferred = true; order.push('defer'); }), editReply: vi.fn(async () => undefined) };
  f.client.emit('interactionCreate', modal); await f.service.flush();
  expect(order[0]).toBe('defer'); expect(modal.editReply.mock.calls[0][0].content).toContain('roles');
  expect(f.channel.send).not.toHaveBeenCalled();
});
it('disabling suggestions stops new submissions and votes but still permits staff decisions', async () => {
  const f = await fixture(); const item = await f.service.create(f.guild, U, 'An idea', I);
  await f.service.updateConfig(A, { enabled: false, channelId: C, cooldownMinutes: 0 });
  await expect(f.service.create(f.guild, V, 'Another idea', '823456789012345680')).rejects.toThrow('not enabled');
  await expect(f.service.vote(f.guild, V, item.id, 'up', '823456789012345680', f.message)).rejects.toThrow('not enabled');
  await expect(f.service.decide(f.guild, U, item.id, { status: 'closed' })).resolves.toMatchObject({ status: 'closed' });
});
it('applies a durable per-member cooldown without rejecting duplicate receipts', async () => {
  const f = await fixture(); await f.service.updateConfig(A, { enabled: true, channelId: C, cooldownMinutes: 5 });
  await f.service.create(f.guild, U, 'An idea', I);
  const restarted = new SuggestionsService(f.client, f.dir, f.logger, f.access); services.push(restarted); await restarted.init();
  await expect(restarted.create(f.guild, U, 'Another idea', '823456789012345680')).rejects.toThrow('wait');
  await expect(restarted.create(f.guild, U, 'An idea', I)).resolves.toMatchObject({ number: 1 });
  await expect(restarted.create(f.guild, V, 'Another member idea', '823456789012345681')).resolves.toMatchObject({ number: 2 });
});
it('keeps open and unconfirmed suggestions at the history limit, pruning only completed synced records', async () => {
  const f = await fixture(); await f.service.create(f.guild, U, 'An idea', I);
  const file = path.join(f.dir, 'suggestions.json'), data = JSON.parse(await readFile(file, 'utf8'));
  const seed = data.guilds[A].items[0];
  data.guilds[A].items = Array.from({ length: 1000 }, (_, i) => ({ ...seed, id: String(BigInt(I) + BigInt(i)), number: i + 1 })); data.guilds[A].nextNumber = 1001;
  await writeFile(file, JSON.stringify(data));
  const restored = new SuggestionsService(f.client, f.dir, f.logger, f.access); services.push(restored); await restored.init();
  await expect(restored.create(f.guild, U, 'Another idea', '823456789012349000')).rejects.toThrow('1,000');
  expect(f.channel.send).toHaveBeenCalledOnce();
  await restored.decide(f.guild, U, I, { status: 'closed' });
  const next = await restored.create(f.guild, U, 'Another idea', '823456789012349000'); expect(next.number).toBe(1001);
  const saved = JSON.parse(await readFile(file, 'utf8')).guilds[A];
  expect(saved.items).toHaveLength(1000); expect(saved.items.some((item: any) => item.id === I)).toBe(false);
});
it('bounds voter records while allowing existing voters to change or remove their vote', async () => {
  const f = await fixture(); await f.service.create(f.guild, U, 'An idea', I);
  const file = path.join(f.dir, 'suggestions.json'), data = JSON.parse(await readFile(file, 'utf8'));
  data.guilds[A].items[0].votes = Object.fromEntries(Array.from({ length: 10000 }, (_, i) => [String(BigInt(U) + BigInt(i)), { choice: 'up', interactionId: I }]));
  await writeFile(file, JSON.stringify(data));
  const restored = new SuggestionsService(f.client, f.dir, f.logger, f.access); services.push(restored); await restored.init();
  await expect(restored.vote(f.guild, V, I, 'up', '823456789012345680', f.message)).rejects.toThrow('10,000');
  await expect(restored.vote(f.guild, U, I, null, '823456789012345681', f.message)).resolves.toMatchObject({ upVotes: 9999 });
  expect(Object.keys(JSON.parse(await readFile(file, 'utf8')).guilds[A].items[0].votes)).toHaveLength(10000);
});
it('rechecks dashboard authorization inside the settings queue before committing', async () => {
  const f = await fixture(); const authorize = vi.fn(async () => { throw new Error('Dashboard access revoked'); });
  await expect(f.service.updateConfig(A, { enabled: false, channelId: C, cooldownMinutes: 10 }, authorize)).rejects.toThrow('revoked');
  expect(authorize).toHaveBeenCalledOnce(); expect(f.service.getConfig(A)).toMatchObject({ enabled: true, cooldownMinutes: 0 });
});
it('paginates every retained suggestion so older open ideas remain reachable', async () => {
  const f = await fixture(); await f.service.create(f.guild, U, 'An idea', I);
  const file = path.join(f.dir, 'suggestions.json'), data = JSON.parse(await readFile(file, 'utf8')), seed = data.guilds[A].items[0];
  data.guilds[A].items = Array.from({ length: 101 }, (_, i) => ({ ...seed, id: String(BigInt(I) + BigInt(i)), number: i + 1 })); data.guilds[A].nextNumber = 102;
  await writeFile(file, JSON.stringify(data));
  const restored = new SuggestionsService(f.client, f.dir, f.logger, f.access); services.push(restored); await restored.init();
  expect(restored.snapshot(A)).toMatchObject({ page: 1, totalPages: 2, displayed: 100, items: [expect.objectContaining({ number: 101 }), ...Array.from({ length: 99 }, () => expect.anything())] });
  expect(restored.snapshot(A, 2)).toMatchObject({ page: 2, totalPages: 2, displayed: 1, items: [{ number: 1 }] });
  expect(() => restored.snapshot(A, 0)).toThrow('page');
});
it('reconciles at most ten dirty messages per pass and skips unavailable guilds', async () => {
  const f = await fixture(); await f.service.create(f.guild, U, 'An idea', I);
  const file = path.join(f.dir, 'suggestions.json'), data = JSON.parse(await readFile(file, 'utf8')), seed = data.guilds[A].items[0];
  data.guilds[A].items = Array.from({ length: 11 }, (_, i) => ({ ...seed, id: String(BigInt(I) + BigInt(i)), number: i + 1, syncPending: true })); data.guilds[A].nextNumber = 12;
  await writeFile(file, JSON.stringify(data));
  const restored = new SuggestionsService(f.client, f.dir, f.logger, f.access); services.push(restored); await restored.init();
  await restored.reconcile(); expect(f.message.edit).toHaveBeenCalledTimes(10);
  (f.guild as any).available = false; await restored.reconcile(); expect(f.message.edit).toHaveBeenCalledTimes(10);
  (f.guild as any).available = true; f.client.isReady = () => false; await restored.reconcile(); expect(f.message.edit).toHaveBeenCalledTimes(10);
  f.client.isReady = () => true; await restored.reconcile(); expect(f.message.edit).toHaveBeenCalledTimes(11);
});
it('rejects copied buttons, other-guild records, bots, and members who lose channel access', async () => {
  const f = await fixture(); const item = await f.service.create(f.guild, U, 'An idea', I);
  for (const patch of [{ guildId: B }, { channelId: B }, { id: B }, { author: { id: U } }]) await expect(f.service.vote(f.guild, V, item.id, 'up', '823456789012345680', { ...f.message, ...patch })).rejects.toThrow('saved suggestion');
  await expect(f.service.vote({ ...f.guild, id: B } as Guild, V, item.id, 'up', '823456789012345680', f.message)).rejects.toThrow('not enabled');
  await expect(f.service.vote(f.guild, BOT, item.id, 'up', '823456789012345680', f.message)).rejects.toThrow('Only server members');
  f.channel.permissionsFor.mockImplementation((member: any) => new PermissionsBitField(member.id === V ? 0n : PermissionFlagsBits.Administrator));
  await expect(f.service.vote(f.guild, V, item.id, 'up', '823456789012345680', f.message)).rejects.toThrow('cannot view');
  f.members.get(V)!.pending = true;
  await expect(f.service.vote(f.guild, V, item.id, 'up', '823456789012345680', f.message)).rejects.toThrow('screening');
  expect(f.service.snapshot(A).items[0]).toMatchObject({ upVotes: 0, downVotes: 0 }); expect(f.message.edit).not.toHaveBeenCalled();
});
it('drains an in-flight send before flush completes and rejects work after stopping', async () => {
  const f = await fixture();
  let sent!: () => void, finish!: () => void;
  const entered = new Promise<void>(resolve => { sent = resolve; });
  const gate = new Promise<void>(resolve => { finish = resolve; });
  f.channel.send.mockImplementation(async () => { sent(); await gate; return f.message; });
  const creation = f.service.create(f.guild, U, 'An idea', I); await entered;
  f.service.stop(); let drained = false; const flushing = f.service.flush().then(() => { drained = true; });
  await Promise.resolve(); expect(drained).toBe(false);
  await expect(f.service.create(f.guild, V, 'Too late', '823456789012345680')).rejects.toThrow('stopping');
  finish(); await creation; await flushing; expect(drained).toBe(true);
  expect(JSON.parse(await readFile(path.join(f.dir, 'suggestions.json'), 'utf8')).guilds[A].items[0]).toMatchObject({ delivery: 'sent', messageId: M });
});
