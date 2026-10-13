import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { Collection, PermissionFlagsBits, PermissionsBitField, type Client, type Guild } from 'discord.js';
import { afterEach, expect, it, vi } from 'vitest';
import { ConfessionsService } from '../src/confessions/service.js';
import { ControlStore } from '../src/control/store.js';
import { AccessService } from '../src/control/access.js';
import { Logger } from '../src/logger.js';

const A = '123456789012345678', B = '223456789012345678', C = '323456789012345678', U = '423456789012345678', V = '523456789012345678', BOT = '623456789012345678', M = '723456789012345678', R = '923456789012345678';
let sequence = 0;
const interactionId = () => String((BigInt(Date.now()) - 1420070400000n) << 22n | BigInt(sequence++));
const folders: string[] = [], services: ConfessionsService[] = [];
afterEach(async () => {
  for (const service of services.splice(0)) { service.stop(); await service.flush(); }
  await Promise.all(folders.splice(0).map(f => rm(f, { recursive: true, force: true })));
});
async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-confessions-service-')); folders.push(dir);
  const control = new ControlStore(dir); await control.init(); const access = new AccessService(control);
  const guild: any = { id: A, ownerId: U, roles: { fetch: vi.fn(async () => guild.roles.cache), cache: new Collection() } };
  const members = new Map([U, V, BOT].map(id => [id, { id, guild, pending: false, displayName: 'PRIVATE DISPLAY NAME', user: { id, bot: id === BOT }, roles: { cache: new Collection() }, permissions: new PermissionsBitField() }]));
  guild.members = { fetch: vi.fn(async (value: any) => members.get(typeof value === 'string' ? value : value.user)), fetchMe: vi.fn(async () => members.get(BOT)) };
  const message: any = { id: M, channelId: C, guildId: A, author: { id: BOT } };
  const channel: any = { id: C, guild, type: 0, permissionsFor: vi.fn(() => new PermissionsBitField(PermissionFlagsBits.Administrator)), send: vi.fn(async () => message) };
  guild.channels = { fetch: vi.fn(async () => channel) };
  const client: any = new EventEmitter(); client.user = { id: BOT }; client.guilds = { fetch: vi.fn(async () => guild), cache: new Collection([[A, guild]]) };
  const logger = new Logger('error'); vi.spyOn(logger, 'error').mockImplementation(() => undefined); vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  const service = new ConfessionsService(client as Client, dir, logger, access); services.push(service); await service.init();
  await service.updateConfig(A, { enabled: true, channelId: C, cooldownSeconds: 60 });
  return { dir, control, access, guild: guild as Guild, members, channel, message, client, logger, service };
}

it('posts a numbered anonymous embed and retains neither text nor author in history or the dashboard', async () => {
  const f = await fixture(), id = interactionId();
  const result = await f.service.create(f.guild, U, 'A confession with @everyone', id);
  expect(result).toMatchObject({ number: 1, messageUrl: `https://discord.com/channels/${A}/${C}/${M}` });
  const payload = f.channel.send.mock.calls[0][0];
  expect(payload).toMatchObject({ nonce: id, enforceNonce: true, embeds: [{ title: 'Confession #1', description: 'A confession with @everyone', color: 0x82d9f7 }], allowedMentions: { parse: [] } });
  expect(JSON.stringify(payload)).not.toContain(U); expect(JSON.stringify(payload)).not.toContain('PRIVATE DISPLAY NAME');
  expect(payload.embeds[0]).not.toHaveProperty('author'); expect(payload).not.toHaveProperty('content');
  const stored = await readFile(path.join(f.dir, 'confessions.json'), 'utf8');
  expect(stored).not.toContain('A confession with'); expect(stored).not.toContain(U);
  expect(f.service.dashboard(A)).toMatchObject({ counts: { published: 1, pending: 0 } });
  expect(JSON.stringify(f.service.dashboard(A))).not.toContain('A confession with');
  expect(f.service.dashboard(B)).toMatchObject({ config: { enabled: false }, counts: { published: 0, pending: 0 } });
});

it('deduplicates simultaneous submissions and refuses uncertain replay after restart without reusing numbers', async () => {
  const f = await fixture(), id = interactionId();
  const [first, repeat] = await Promise.all([f.service.create(f.guild, U, 'Secret', id), f.service.create(f.guild, U, 'Secret', id)]);
  expect(first).toEqual(repeat); expect(f.channel.send).toHaveBeenCalledOnce();
  f.channel.send.mockRejectedValueOnce(new Error('Network error containing Secret'));
  const failedId = interactionId();
  await expect(f.service.create(f.guild, V, 'Second secret', failedId)).rejects.toThrow('unknown outcome');
  const restarted = new ConfessionsService(f.client, f.dir, f.logger, f.access); services.push(restarted); await restarted.init();
  await expect(restarted.create(f.guild, V, 'Second secret', failedId)).rejects.toThrow('unknown outcome');
  expect(f.channel.send).toHaveBeenCalledTimes(2);
  expect(await restarted.create(f.guild, U, 'Next secret', interactionId())).toMatchObject({ number: 3 });
  expect(restarted.dashboard(A)).toMatchObject({ counts: { published: 2, pending: 1 } });
  expect(JSON.stringify(f.logger.warn.mock.calls)).not.toContain('Secret');
});

it('enforces a member cooldown in memory while keeping durable receipts free of author identities', async () => {
  const f = await fixture(), id = interactionId();
  await f.service.create(f.guild, U, 'Private words', id);
  await expect(f.service.create(f.guild, U, 'Again', interactionId())).rejects.toThrow('wait');
  await expect(f.service.create(f.guild, U, 'Private words', id)).resolves.toMatchObject({ number: 1 });
  await expect(f.service.create(f.guild, V, 'Someone else', interactionId())).resolves.toMatchObject({ number: 2 });
  const disk = await readFile(path.join(f.dir, 'confessions.json'), 'utf8');
  expect(disk).not.toContain(U); expect(disk).not.toContain(V);
});

it('bounds receipts and rejects expired interactions so pruned requests cannot be posted again', async () => {
  const f = await fixture(); await f.service.create(f.guild, U, 'First', interactionId());
  const file = path.join(f.dir, 'confessions.json'), disk = JSON.parse(await readFile(file, 'utf8'));
  const seed = disk.guilds[A].receipts[0], now = Date.now();
  const oldId = String((BigInt(now - 16 * 60_000) - 1420070400000n) << 22n);
  disk.guilds[A].receipts = Array.from({ length: 1000 }, (_, i) => ({ ...seed, id: String(BigInt(oldId) + BigInt(i)), number: i + 1, createdAt: new Date(now - 16 * 60_000).toISOString() }));
  disk.guilds[A].nextNumber = 1001; disk.guilds[A].published = 1000;
  await writeFile(file, JSON.stringify(disk));
  const restarted = new ConfessionsService(f.client, f.dir, f.logger, f.access); services.push(restarted); await restarted.init();
  await expect(restarted.create(f.guild, V, 'New', interactionId())).resolves.toMatchObject({ number: 1001 });
  await expect(restarted.create(f.guild, U, 'Replay', oldId)).rejects.toThrow('expired');
  expect(JSON.parse(await readFile(file, 'utf8')).guilds[A].receipts).toHaveLength(1000);
});

it('handles /confess privately, defers before member lookup, and acknowledges without repeating confession text', async () => {
  const f = await fixture(); f.service.attach(); const order: string[] = [];
  const originalFetch = f.guild.members.fetch;
  f.guild.members.fetch = vi.fn(async (...args: any[]) => { order.push('member'); return originalFetch(...args); }) as any;
  const interaction: any = { id: interactionId(), guild: f.guild, guildId: A, user: { id: U }, commandName: 'confess', isChatInputCommand: () => true, inCachedGuild: () => true, deferred: false, replied: false, options: { getString: vi.fn(() => 'Private command text') }, deferReply: vi.fn(async () => { interaction.deferred = true; order.push('defer'); }), editReply: vi.fn(async () => undefined) };
  f.client.emit('interactionCreate', interaction); await f.service.flush();
  expect(order[0]).toBe('defer'); expect(interaction.deferReply.mock.calls[0][0]).toEqual({ flags: 64 });
  expect(f.channel.send).toHaveBeenCalledOnce();
  expect(interaction.options.getString).toHaveBeenCalledWith('confession', true);
  expect(interaction.editReply.mock.calls[0][0].content).toContain('Confession #1');
  expect(interaction.editReply.mock.calls[0][0].content).not.toContain('Private command text');
});

it('rechecks command roles and channel visibility and refuses bots, disabled guilds, or foreign channels', async () => {
  const f = await fixture();
  await f.control.mutate(A, state => { state.access.commandRoles.confess = [R]; });
  await expect(f.service.create(f.guild, V, 'Secret', interactionId())).rejects.toThrow('roles');
  f.members.get(V)!.roles.cache.set(R, {} as any);
  f.channel.permissionsFor.mockImplementation((member: any) => member.id === BOT ? new PermissionsBitField(PermissionFlagsBits.Administrator) : new PermissionsBitField());
  await expect(f.service.create(f.guild, V, 'Secret', interactionId())).rejects.toThrow('cannot view');
  f.channel.permissionsFor.mockImplementation(() => new PermissionsBitField(PermissionFlagsBits.Administrator));
  await expect(f.service.create(f.guild, BOT, 'Secret', interactionId())).rejects.toThrow();
  f.channel.guild = { id: B };
  await expect(f.service.create(f.guild, U, 'Secret', interactionId())).rejects.toThrow('this server');
  await expect(f.service.configure(f.guild, { enabled: true, channelId: C, cooldownSeconds: 60 })).rejects.toThrow('this server');
  f.channel.guild = f.guild;
  await f.service.configure(f.guild, { enabled: false, channelId: C, cooldownSeconds: 60 });
  await expect(f.service.create(f.guild, U, 'Secret', interactionId())).rejects.toThrow('not enabled');
  expect(f.channel.send).not.toHaveBeenCalled();
});

it('checks Embed Links and fresh dashboard authorization before persisting settings', async () => {
  const f = await fixture();
  const denied = vi.fn(async () => { throw new Error('Dashboard access revoked'); });
  await expect(f.service.updateConfig(A, { enabled: false, channelId: C, cooldownSeconds: 30 }, denied)).rejects.toThrow('revoked');
  expect(denied).toHaveBeenCalledOnce(); expect(f.service.getConfig(A)).toMatchObject({ enabled: true, cooldownSeconds: 60 });
  f.channel.permissionsFor.mockReturnValue(new PermissionsBitField([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]));
  await expect(f.service.create(f.guild, U, 'Secret', interactionId())).rejects.toThrow('Embed Links');
  expect(f.channel.send).not.toHaveBeenCalled();
});

it('persists pending before sending, drains an in-flight send at shutdown, and detaches the listener', async () => {
  const f = await fixture(); f.service.attach(); f.service.attach();
  expect(f.client.listenerCount('interactionCreate')).toBe(1);
  let release!: () => void, started!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  const sending = new Promise<void>(resolve => { started = resolve; });
  f.channel.send.mockImplementationOnce(async () => {
    const saved = JSON.parse(await readFile(path.join(f.dir, 'confessions.json'), 'utf8'));
    expect(saved.guilds[A].receipts[0].delivery).toBe('pending'); started(); await hold; return f.message;
  });
  const post = f.service.create(f.guild, U, 'Secret', interactionId());
  await sending; f.service.stop(); expect(f.client.listenerCount('interactionCreate')).toBe(0);
  await expect(f.service.create(f.guild, V, 'Next', interactionId())).rejects.toThrow('stopping');
  let drained = false; const drain = f.service.flush().then(() => { drained = true; });
  await Promise.resolve(); expect(drained).toBe(false);
  release(); await post; await drain;
  expect(f.service.dashboard(A)).toMatchObject({ counts: { published: 1, pending: 0 } });
});

it('declines DMs privately and ignores unrelated commands without sending a confession', async () => {
  const f = await fixture(); f.service.attach();
  const dm: any = { commandName: 'confess', isChatInputCommand: () => true, inCachedGuild: () => false, reply: vi.fn(async () => undefined) };
  f.client.emit('interactionCreate', dm); await f.service.flush();
  expect(dm.reply.mock.calls[0][0]).toMatchObject({ flags: 64, content: 'Use /confess inside a Discord server.' });
  const unrelated = { ...dm, commandName: 'playmusic', reply: vi.fn() };
  f.client.emit('interactionCreate', unrelated); await f.service.flush();
  expect(unrelated.reply).not.toHaveBeenCalled(); expect(f.channel.send).not.toHaveBeenCalled();
});

it('does not send when the pending receipt cannot be saved', async () => {
  const f = await fixture();
  const save = vi.spyOn((f.service as any).store, 'mutate').mockRejectedValueOnce(new Error('Disk full'));
  await expect(f.service.create(f.guild, U, 'Private text', interactionId())).rejects.toThrow('Disk full');
  expect(save).toHaveBeenCalledOnce(); expect(f.channel.send).not.toHaveBeenCalled();
  expect(f.service.dashboard(A).counts).toEqual({ published: 0, pending: 0 });
});
