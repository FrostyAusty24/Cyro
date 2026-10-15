import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { Collection, PermissionFlagsBits, PermissionsBitField, type Client, type Guild } from 'discord.js';
import { afterEach, expect, it, vi } from 'vitest';
import { TimeClockService } from '../src/time-clock/service.js';
import { ControlStore } from '../src/control/store.js';
import { AccessService } from '../src/control/access.js';
import { Logger } from '../src/logger.js';

const A = '123456789012345678', B = '223456789012345678', C = '323456789012345678', U = '423456789012345678', V = '523456789012345678', BOT = '623456789012345678', M = '723456789012345678', R = '923456789012345678';
let sequence = 0;
const interactionId = (at = Date.now()) => String((BigInt(at) - 1420070400000n) << 22n | BigInt(sequence++));
const folders: string[] = [], services: TimeClockService[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const service of services.splice(0)) { service.stop(); await service.flush(); }
  await Promise.all(folders.splice(0).map(f => rm(f, { recursive: true, force: true })));
});
async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-time-clock-')); folders.push(dir);
  const control = new ControlStore(dir); await control.init(); const access = new AccessService(control);
  const guild: any = { id: A, ownerId: U, roles: { fetch: vi.fn(async () => guild.roles.cache), cache: new Collection() } };
  guild.roles.cache.set(R, { id: R, guild, managed: false });
  const members = new Map([U, V, BOT].map(id => [id, { id, guild, pending: false, displayName: 'Private display name', user: { id, bot: id === BOT }, roles: { cache: new Collection() }, permissions: new PermissionsBitField() }]));
  guild.members = { fetch: vi.fn(async (value: any) => members.get(typeof value === 'string' ? value : value.user)), fetchMe: vi.fn(async () => members.get(BOT)) };
  const message: any = { id: M, channelId: C, guildId: A, author: { id: BOT } };
  const channel: any = { id: C, guild, type: 0, permissionsFor: vi.fn(() => new PermissionsBitField([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])), send: vi.fn(async () => message) };
  guild.channels = { fetch: vi.fn(async () => channel) };
  const client: any = new EventEmitter(); client.user = { id: BOT }; client.guilds = { fetch: vi.fn(async () => guild), cache: new Collection([[A, guild]]) };
  const logger = new Logger('error'); vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  const service = new TimeClockService(client as Client, dir, logger, access); services.push(service); await service.init();
  await service.updateConfig(A, { enabled: true, channelId: C, roleIds: [] });
  return { dir, control, access, guild: guild as Guild, members, channel, message, client, logger, service };
}

it('records elapsed milliseconds, totals and active shifts across restart without storing member names', async () => {
  const f = await fixture(), start = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(start);
  await f.service.clockIn(f.guild, V, interactionId());
  clock.mockReturnValue(start + 3_723_456);
  expect(f.service.snapshot(A).members[0]).toMatchObject({ activeMs: 3_723_456, totalMs: 3_723_456, completedMs: 0, shifts: 0 });
  f.service.stop(); await f.service.flush();
  const resumed = new TimeClockService(f.client, f.dir, f.logger, f.access); services.push(resumed); await resumed.init();
  expect(await resumed.clockOut(f.guild, V, interactionId())).toMatchObject({ startedAt: null, lastShiftMs: 3_723_456, totalMs: 3_723_456, shifts: 1 });
  await resumed.clockIn(f.guild, V, interactionId()); clock.mockReturnValue(start + 3_800_000);
  const row = await resumed.clockOut(f.guild, V, interactionId());
  expect(row).toMatchObject({ completedMs: 3_800_000, shifts: 2, lastShiftMs: 76_544 });
  const disk = await readFile(path.join(f.dir, 'time-clock.json'), 'utf8');
  expect(disk).not.toContain('Private display name');
  expect(resumed.snapshot(B)).toMatchObject({ counts: { members: 0, active: 0, totalMs: 0 }, config: { enabled: false } });
});

it('serializes competing transitions and returns duplicate receipts without applying them twice', async () => {
  const f = await fixture(), id = interactionId();
  const [a, b] = await Promise.all([f.service.clockIn(f.guild, V, id), f.service.clockIn(f.guild, V, id)]);
  expect(a).toEqual(b);
  await expect(f.service.clockIn(f.guild, V, interactionId())).rejects.toThrow('already');
  const out = interactionId();
  const rows = await Promise.all([f.service.clockOut(f.guild, V, out), f.service.clockOut(f.guild, V, out)]);
  expect(rows[0]).toEqual(rows[1]); expect(rows[0].shifts).toBe(1);
  await expect(f.service.clockOut(f.guild, V, interactionId())).rejects.toThrow('not clocked');
  // A delayed delivery of the original in event cannot open a second shift.
  expect(await f.service.clockIn(f.guild, V, id)).toEqual(a);
  expect(f.service.snapshot(A).counts.active).toBe(0);
  await expect(f.service.clockIn(f.guild, U, id)).rejects.toThrow('different action');
  await expect(f.service.clockOut(f.guild, V, id)).rejects.toThrow('different action');
});

it('allows ending a shift and checking own time after feature and role access are revoked', async () => {
  const f = await fixture();
  await f.service.clockIn(f.guild, V, interactionId());
  await f.service.configure(f.guild, { enabled: false, channelId: C, roleIds: [R] });
  await f.control.mutate(A, value => { value.access.commandRoles.time = [R]; });
  await expect(f.service.memberTime(f.guild, V)).resolves.toMatchObject({ userId: V });
  await expect(f.service.clockOut(f.guild, V, interactionId())).resolves.toMatchObject({ startedAt: null, shifts: 1 });
  await expect(f.service.clockIn(f.guild, V, interactionId())).rejects.toThrow('roles');
  expect(await f.service.clock(f.guild, V)).toMatchObject({ mode: 'personal', member: { userId: V } });
});

it('supports command-only tracking without a panel channel', async () => {
  const f = await fixture();
  await f.service.configure(f.guild, { enabled: true, channelId: null, roleIds: [] });
  await expect(f.service.clockIn(f.guild, V, interactionId())).resolves.toMatchObject({ userId: V });
  await expect(f.service.clockOut(f.guild, V, interactionId())).resolves.toMatchObject({ shifts: 1 });
  await expect(f.service.publishPanel(f.guild, U, randomUUID())).rejects.toThrow('Choose a text');
  expect(f.channel.send).not.toHaveBeenCalled();
});

it('requires eligible roles, fresh membership and screening for clock-in', async () => {
  const f = await fixture();
  await f.service.configure(f.guild, { enabled: true, channelId: C, roleIds: [R] });
  await expect(f.service.clockIn(f.guild, V, interactionId())).rejects.toThrow('member roles');
  f.members.get(V)!.roles.cache.set(R, {} as any);
  f.members.get(V)!.pending = true;
  await expect(f.service.clockIn(f.guild, V, interactionId())).rejects.toThrow('screening');
  f.members.get(V)!.pending = false;
  await expect(f.service.clockIn(f.guild, V, interactionId())).resolves.toMatchObject({ userId: V });
  await expect(f.service.clockIn(f.guild, BOT, interactionId())).rejects.toThrow('Only members');
  f.members.get(V)!.guild = { id: B } as any;
  await expect(f.service.clockOut(f.guild, V, interactionId())).rejects.toThrow('Only members');
});

it('protects other members and team totals and reevaluates revoked dashboard access', async () => {
  const f = await fixture();
  await f.service.clockIn(f.guild, U, interactionId()); await f.service.clockIn(f.guild, V, interactionId());
  await expect(f.service.memberTime(f.guild, V, U)).rejects.toThrow('dashboard');
  expect(await f.service.clock(f.guild, V)).toMatchObject({ mode: 'personal' });
  expect(await f.service.clock(f.guild, U)).toMatchObject({ mode: 'team', counts: { members: 2, active: 2 }, page: 1, pages: 1 });
  await f.control.mutate(A, value => { value.access.dashboardRoleIds = [R]; });
  f.members.get(V)!.roles.cache.set(R, {} as any);
  expect(await f.service.clock(f.guild, V)).toMatchObject({ mode: 'team' });
  f.members.get(V)!.roles.cache.clear();
  expect(await f.service.clock(f.guild, V)).toMatchObject({ mode: 'personal' });
  await expect(f.service.clock(f.guild, U, 2)).rejects.toThrow('1 to 1');
});

it('paginates everyone’s totals in descending order with stable ties', async () => {
  const f = await fixture();
  await (f.service as any).store.mutate(A, (state: any) => {
    for (let i = 0; i < 23; i++) state.members[String(BigInt(V) + BigInt(i))] = { completedMs: Math.floor(i / 2) * 1000, startedAt: null, shifts: 1, lastShiftMs: 0 };
  });
  const first = await f.service.clock(f.guild, U), last = await f.service.clock(f.guild, U, 3);
  expect(first).toMatchObject({ mode: 'team', page: 1, pages: 3, counts: { members: 23 } });
  if (first.mode !== 'team' || last.mode !== 'team') throw new Error('Expected manager results');
  expect(first.members).toHaveLength(10); expect(last.members).toHaveLength(3);
  expect(first.members.slice(0, 3).map(row => row.completedMs)).toEqual([11000, 10000, 10000]);
  expect(first.members[1]!.userId < first.members[2]!.userId).toBe(true);
});

it('rejects expired and future requests before mutation and never subtracts time if the clock goes backwards', async () => {
  const f = await fixture(), now = Date.now(); const time = vi.spyOn(Date, 'now').mockReturnValue(now);
  await expect(f.service.clockIn(f.guild, V, interactionId(now - 16 * 60_000))).rejects.toThrow('expired');
  await expect(f.service.clockIn(f.guild, V, interactionId(now + 61_000))).rejects.toThrow('expired');
  await f.service.clockIn(f.guild, V, interactionId());
  time.mockReturnValue(now - 1000);
  expect(await f.service.clockOut(f.guild, V, interactionId())).toMatchObject({ completedMs: 0, lastShiftMs: 0 });
});

it('does not alter a shift when persistence fails, and retries can then complete normally', async () => {
  const f = await fixture(), id = interactionId();
  const store = (f.service as any).store;
  const save = vi.spyOn(store, 'write').mockRejectedValueOnce(new Error('Disk full'));
  await expect(f.service.clockIn(f.guild, V, id)).rejects.toThrow('Disk full');
  expect(f.service.snapshot(A).members).toEqual([]);
  await f.service.clockIn(f.guild, V, id);
  save.mockRejectedValueOnce(new Error('Disk full'));
  const out = interactionId();
  await expect(f.service.clockOut(f.guild, V, out)).rejects.toThrow('Disk full');
  expect(f.service.snapshot(A).members[0]).toMatchObject({ startedAt: expect.any(Number), shifts: 0 });
  await expect(f.service.clockOut(f.guild, V, out)).resolves.toMatchObject({ shifts: 1 });
});

it('publishes one embed with private-action buttons, no member totals, and durable UUID deduplication', async () => {
  const f = await fixture(), id = randomUUID();
  await f.service.clockIn(f.guild, V, interactionId());
  const results = await Promise.all([f.service.publishPanel(f.guild, U, id), f.service.publishPanel(f.guild, U, id)]);
  expect(results[0]).toEqual(results[1]); expect(f.channel.send).toHaveBeenCalledOnce();
  const payload = f.channel.send.mock.calls[0][0];
  expect(payload).toMatchObject({ allowedMentions: { parse: [] }, embeds: [{ title: 'Time clock' }], enforceNonce: true });
  expect(payload.components[0].toJSON().components.map((item: any) => item.custom_id)).toEqual(['time-clock:in', 'time-clock:out', 'time-clock:me']);
  expect(JSON.stringify(payload)).not.toContain(V);
  const resumed = new TimeClockService(f.client, f.dir, f.logger, f.access); services.push(resumed); await resumed.init();
  expect(await resumed.publishPanel(f.guild, U, id)).toEqual(results[0]); expect(f.channel.send).toHaveBeenCalledOnce();
  await expect(resumed.publishPanel(f.guild, V, randomUUID())).rejects.toThrow('dashboard');
});

it('never reposts a panel with an uncertain delivery, including after restart', async () => {
  const f = await fixture(), id = randomUUID();
  f.channel.send.mockRejectedValueOnce(new Error('Provider sensitive text'));
  await expect(f.service.publishPanel(f.guild, U, id)).rejects.toThrow('unknown outcome');
  const resumed = new TimeClockService(f.client, f.dir, f.logger, f.access); services.push(resumed); await resumed.init();
  await expect(resumed.publishPanel(f.guild, U, id)).rejects.toThrow('unknown outcome');
  expect(f.channel.send).toHaveBeenCalledOnce();
  expect(JSON.stringify(f.logger.warn.mock.calls)).not.toContain('Provider sensitive text');
});

it('rechecks guild/channel/role identity and permission without forcing a private channel', async () => {
  const f = await fixture();
  await f.service.publishPanel(f.guild, U, randomUUID()); // ordinary public channel permissions suffice
  f.channel.guild = { id: B };
  await expect(f.service.configure(f.guild, { enabled: true, channelId: C, roleIds: [] })).rejects.toThrow('this server');
  f.channel.guild = f.guild;
  (f.guild.roles.cache.get(R) as any).guild = { id: B };
  await expect(f.service.configure(f.guild, { enabled: true, channelId: C, roleIds: [R] })).rejects.toThrow('this server');
  const revoked = vi.fn(async () => { throw new Error('Access revoked'); });
  await expect(f.service.configure(f.guild, { enabled: false, channelId: C, roleIds: [] }, revoked)).rejects.toThrow('revoked');
  expect(f.service.getConfig(A).enabled).toBe(true);
  f.channel.permissionsFor.mockReturnValue(new PermissionsBitField([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]));
  await expect(f.service.publishPanel(f.guild, U, randomUUID())).rejects.toThrow('Embed Links');
});

it('rechecks manager access after channel lookup before sending or reserving a panel', async () => {
  const f = await fixture();
  await f.control.mutate(A, value => { value.access.dashboardRoleIds = [R]; });
  f.members.get(V)!.roles.cache.set(R, {} as any);
  (f.guild.channels.fetch as any).mockImplementationOnce(async () => { f.members.get(V)!.roles.cache.clear(); return f.channel; });
  await expect(f.service.publishPanel(f.guild, V, randomUUID())).rejects.toThrow('dashboard');
  expect(f.channel.send).not.toHaveBeenCalled();
  expect(JSON.parse(await readFile(path.join(f.dir, 'time-clock.json'), 'utf8')).guilds[A].panels).toEqual([]);
});

it('defers button responses privately before lookups and keeps the totals out of the public channel', async () => {
  const f = await fixture(); f.service.attach(); f.service.attach(); const order: string[] = [];
  expect(f.client.listenerCount('interactionCreate')).toBe(1);
  const original = f.guild.members.fetch;
  f.guild.members.fetch = vi.fn(async (...args: any[]) => { order.push('member'); return original(...args); }) as any;
  const interaction: any = { id: interactionId(), locale: 'en-US', guild: f.guild, guildId: A, user: { id: V }, customId: 'time-clock:in', isChatInputCommand: () => false, isButton: () => true, inCachedGuild: () => true, deferred: false, replied: false,
    deferReply: vi.fn(async () => { order.push('defer'); interaction.deferred = true; }), editReply: vi.fn(async () => undefined) };
  f.client.emit('interactionCreate', interaction); await f.service.flush();
  expect(order[0]).toBe('defer'); expect(interaction.deferReply).toHaveBeenCalledWith({ flags: 64 });
  expect(interaction.editReply.mock.calls[0][0]).toMatchObject({ content: expect.stringContaining('clocked in'), embeds: [{ title: 'Your recorded time' }], allowedMentions: { parse: [] } });
  expect(f.channel.send).not.toHaveBeenCalled();
  f.service.stop(); expect(f.client.listenerCount('interactionCreate')).toBe(0);
});

it('drains a pending panel write on shutdown and applies guarded guild retention', async () => {
  const f = await fixture();
  let release!: () => void, started!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; }), sending = new Promise<void>(resolve => { started = resolve; });
  f.channel.send.mockImplementationOnce(async () => {
    const saved = JSON.parse(await readFile(path.join(f.dir, 'time-clock.json'), 'utf8'));
    expect(saved.guilds[A].panels[0].delivery).toBe('pending'); started(); await hold; return f.message;
  });
  const post = f.service.publishPanel(f.guild, U, randomUUID()); await sending; f.service.stop();
  await expect(f.service.clockIn(f.guild, V, interactionId())).rejects.toThrow('stopping');
  let done = false; const drain = f.service.flush().then(() => { done = true; }); await Promise.resolve(); expect(done).toBe(false);
  release(); await post; await drain;
  await f.service.purgeGuild(A, () => false); expect(await f.service.guildIds()).toEqual([A]);
  await f.service.purgeGuild(A); expect(await f.service.guildIds()).toEqual([]);
});
