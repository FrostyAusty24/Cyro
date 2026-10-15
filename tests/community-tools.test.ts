import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { Collection, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { afterEach, expect, it, vi } from 'vitest';
import { CommunityToolsService } from '../src/community-tools/service.js';
import { CommunityToolsStore } from '../src/community-tools/store.js';
import { defaultCommunityToolsConfig, parseCommunityToolsConfig } from '../src/community-tools/types.js';
import { ControlStore } from '../src/control/store.js';
import { AccessService } from '../src/control/access.js';
import { Logger } from '../src/logger.js';
const G = '123456789012345678', OTHER = '223456789012345678', C = '323456789012345678', U = '423456789012345678', V = '523456789012345678', BOT = '623456789012345678', M = '723456789012345678', I = '823456789012345678';
const folders: string[] = [], services: CommunityToolsService[] = [];
afterEach(async () => { for (const service of services.splice(0)) { service.stop(); await service.flush(); } vi.restoreAllMocks(); await Promise.all(folders.splice(0).map(f => rm(f, { recursive: true, force: true }))); });
async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-community-tools-')); folders.push(dir);
  const control = new ControlStore(dir); await control.init(); const access = new AccessService(control);
  const guild: any = { id: G, ownerId: U, available: true, roles: { fetch: vi.fn(async () => guild.roles.cache), cache: new Collection() } };
  const members = new Map([U, V, BOT].map(id => [id, { id, guild, pending: false, displayName: id === U ? 'Example member' : 'Member', user: { id, bot: id === BOT }, roles: { cache: new Collection() }, permissions: new PermissionsBitField() }]));
  guild.members = { fetch: vi.fn(async (v: any) => members.get(typeof v === 'string' ? v : v.user)), fetchMe: vi.fn(async () => members.get(BOT)) };
  const messages = new Collection<string, any>(); let next = BigInt(M);
  const makeMessage = (id = String(next++)) => { const message: any = { id, channelId: C, guildId: G, author: { id: BOT }, type: 0, webhookId: null, embeds: [], nonce: null, edit: vi.fn(async () => message), delete: vi.fn(async () => { messages.delete(id); }) }; return message; };
  const channel: any = { id: C, guild, type: 0, permissionsFor: vi.fn(() => new PermissionsBitField(PermissionFlagsBits.Administrator)), send: vi.fn(async (payload: any) => { const message = makeMessage(); message.nonce = payload.nonce; message.embeds = payload.embeds; messages.set(message.id, message); return message; }), messages: { fetch: vi.fn(async (arg: any) => { if (typeof arg === 'object') { for (const message of messages.values()) message.nonce = null; return messages; } const m = messages.get(arg); if (!m) throw Object.assign(new Error('Unknown message'), { code: 10008 }); m.nonce = null; return m; }) } };
  guild.channels = { fetch: vi.fn(async () => channel) };
  const client: any = new EventEmitter(); client.user = { id: BOT }; client.guilds = { cache: new Collection([[G, guild]]), fetch: vi.fn(async () => guild) }; client.isReady = () => true;
  const logger = new Logger('error'); vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  const service = new CommunityToolsService(client, dir, logger, access); services.push(service); await service.init();
  const config = defaultCommunityToolsConfig(); config.bugs = { enabled: true, cooldownMinutes: 0, categories: [{ id: 'server', name: 'Server issues', channelId: C }] };
  await service.updateConfig(guild, config);
  const restart = async () => { const result = new CommunityToolsService(client, dir, logger, access); services.push(result); await result.init(); return result; };
  return { dir, control, access, guild, members, channel, messages, makeMessage, client, logger, service, config, restart };
}
const report = { title: 'Door will not open', details: 'The door stays closed after using the button.', steps: 'Press the button once.' };
const sticky = { id: 'rules', enabled: true, channelId: C, title: 'Please read the rules', body: 'Be kind. No @everyone notifications.', everyMessages: 2, delaySeconds: 30 };
function activity(guild: any, id = I, bot = false) { return { id, guild, channelId: C, author: { id: V, bot }, webhookId: null } as any; }
it('validates bounded settings, unique categories/channels, defaults off, and min sticky delay', () => {
  expect(defaultCommunityToolsConfig()).toEqual({ bugs: { enabled: false, cooldownMinutes: 5, categories: [] }, stickies: [] });
  expect(() => parseCommunityToolsConfig({ ...defaultCommunityToolsConfig(), stickies: [{ ...sticky, delaySeconds: 29 }] })).toThrow('30');
  expect(() => parseCommunityToolsConfig({ ...defaultCommunityToolsConfig(), stickies: [sticky, { ...sticky, id: 'other' }] })).toThrow('one sticky');
  expect(() => parseCommunityToolsConfig({ ...defaultCommunityToolsConfig(), admin: true })).toThrow('Unknown');
  expect(() => parseCommunityToolsConfig({ bugs: { enabled: true, cooldownMinutes: 5, categories: [] }, stickies: [] })).toThrow('category');
});
it('creates one durable report per interaction and isolates guilds without requiring access to staff channel', async () => {
  const f = await fixture(); f.channel.permissionsFor.mockImplementation((member: any) => new PermissionsBitField(member.id === BOT ? PermissionFlagsBits.Administrator : 0n));
  const [a, b] = await Promise.all([f.service.create(f.guild, V, 'server', report, I), f.service.create(f.guild, V, 'server', report, I)]);
  expect(a).toEqual(b); expect(a).toMatchObject({ number: 1, authorId: V, categoryName: 'Server issues', delivery: 'sent' }); expect(f.channel.send).toHaveBeenCalledOnce(); expect(f.service.snapshot(OTHER).reports).toEqual([]);
  expect(f.channel.send.mock.calls[0][0]).toMatchObject({ nonce: I, enforceNonce: true, allowedMentions: { parse: [] } });
  expect((await f.restart()).snapshot(G).reports).toEqual([a]);
});
it('enforces durable cooldowns and rechecks command roles after modal submission', async () => {
  const f = await fixture(); f.config.bugs.cooldownMinutes = 5; await f.service.updateConfig(f.guild, f.config); await f.service.create(f.guild, V, 'server', report, I);
  await expect((await f.restart()).create(f.guild, V, 'server', report, String(BigInt(I) + 1n))).rejects.toThrow('wait');
  await f.control.mutate(G, value => { value.access.commandRoles.bugreport = [OTHER]; });
  await expect(f.service.create(f.guild, V, 'server', report, String(BigInt(I) + 2n))).rejects.toThrow('roles');
});
it('rejects cross-guild channels and revoked management authorization before saving configuration', async () => {
  const f = await fixture(); f.channel.guild = { id: OTHER };
  await expect(f.service.updateConfig(f.guild, f.config)).rejects.toThrow('this server'); f.channel.guild = f.guild;
  await expect(f.service.updateConfig(f.guild, { ...f.config, stickies: [sticky] }, async () => { throw new Error('Access revoked'); })).rejects.toThrow('revoked');
  expect(f.service.getConfig(G).stickies).toEqual([]);
});
it('only authorized dashboard staff can triage the actual saved bot report', async () => {
  const f = await fixture(), saved = await f.service.create(f.guild, V, 'server', report, I), message = f.messages.get(saved.messageId!);
  await expect(f.service.decide(f.guild, V, I, { status: 'resolved' })).rejects.toThrow('not granted');
  await expect(f.service.decide(f.guild, U, I, { status: 'resolved' }, { ...message, channelId: OTHER })).rejects.toThrow('does not belong');
  expect(await f.service.decide(f.guild, U, I, { status: 'in_progress' }, message)).toMatchObject({ status: 'in_progress', syncPending: false, decision: { actorId: U } });
  expect(await f.service.decide(f.guild, U, I, { status: 'resolved' })).toMatchObject({ status: 'resolved' });
  expect(await f.service.decide(f.guild, U, I, { status: 'open' })).toMatchObject({ status: 'open' });
});
it('saves staff decisions even if Discord editing fails and repairs them after restart', async () => {
  const f = await fixture(), saved = await f.service.create(f.guild, V, 'server', report, I), message = f.messages.get(saved.messageId!); message.edit.mockRejectedValueOnce(new Error('Offline'));
  expect(await f.service.decide(f.guild, U, I, { status: 'resolved' })).toMatchObject({ syncPending: true });
  const restarted = await f.restart(); await restarted.reconcile(); expect(restarted.snapshot(G).reports[0]).toMatchObject({ syncPending: false, status: 'resolved' }); expect(f.channel.send).toHaveBeenCalledOnce();
});
it('does not replay reports whose send outcome is unknown', async () => {
  const f = await fixture(); f.channel.send.mockRejectedValueOnce(new Error('Lost connection'));
  await expect(f.service.create(f.guild, V, 'server', report, I)).rejects.toThrow('could not be confirmed');
  const restarted = await f.restart(); await restarted.reconcile(); await expect(restarted.create(f.guild, V, 'server', report, I)).rejects.toThrow('unknown outcome'); expect(f.channel.send).toHaveBeenCalledOnce();
});
it('opens report modals immediately and defers before asynchronous submission checks', async () => {
  const f = await fixture(); f.service.attach();
  const member = f.members.get(V)!, base: any = { guild: f.guild, guildId: G, member, user: member.user, commandName: 'bugreport', isChatInputCommand: () => true, isAutocomplete: () => false, isButton: () => false, isModalSubmit: () => false, inCachedGuild: () => true, isRepliable: () => true, options: { getString: () => 'server' }, showModal: vi.fn(async () => undefined), reply: vi.fn() };
  f.guild.members.fetch.mockRejectedValueOnce(new Error('No async lookup before modal')); f.client.emit('interactionCreate', base); await f.service.flush(); expect(base.showModal).toHaveBeenCalledOnce(); expect(f.guild.members.fetch).not.toHaveBeenCalled();
  const calls: string[] = []; f.guild.members.fetch.mockReset().mockImplementation(async () => { calls.push('member'); return member; });
  const modal: any = { ...base, id: I, customId: 'bug:create:server', isChatInputCommand: () => false, isModalSubmit: () => true, deferred: false, fields: { getTextInputValue: (k: keyof typeof report) => report[k] }, deferReply: vi.fn(async () => { modal.deferred = true; calls.push('defer'); }), editReply: vi.fn(async () => undefined) };
  f.client.emit('interactionCreate', modal); await f.service.flush(); expect(calls[0]).toBe('defer'); expect(modal.editReply.mock.calls[0][0].content).toContain('Report #1');
});
it('does not publish on save, ignores bots/duplicates, waits for threshold and delay, and replaces only its own prior sticky', async () => {
  const f = await fixture(); let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now);
  await f.service.updateConfig(f.guild, { ...f.config, stickies: [sticky] }); await f.service.reconcile(); expect(f.channel.send).not.toHaveBeenCalled();
  await f.service.noteActivity(activity(f.guild, I, true)); await f.service.noteActivity(activity(f.guild)); await f.service.noteActivity(activity(f.guild));
  expect(f.service.snapshot(G).stickyStates[0]).toMatchObject({ activity: 1 }); await f.service.noteActivity(activity(f.guild, String(BigInt(I) + 1n))); await f.service.reconcile(); expect(f.channel.send).not.toHaveBeenCalled();
  now += 30001; await f.service.reconcile(); expect(f.channel.send).toHaveBeenCalledOnce(); const old = [...f.messages.values()][0];
  await f.service.noteActivity(activity(f.guild, String(BigInt(I) + 2n))); await f.service.noteActivity(activity(f.guild, String(BigInt(I) + 3n))); now += 30001; await f.service.reconcile();
  expect(f.channel.send).toHaveBeenCalledTimes(2); expect(old.delete).toHaveBeenCalledOnce(); expect(f.messages.size).toBe(1); expect(f.channel.send.mock.calls[1][0].allowedMentions).toEqual({ parse: [] });
});
it('recovers a sticky receipt by exact embed reference when fetched messages have no nonce', async () => {
  const f = await fixture(); let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now);
  await f.service.updateConfig(f.guild, { ...f.config, stickies: [{ ...sticky, everyMessages: 1 }] });
  f.channel.send.mockImplementationOnce(async (payload: any) => { const message = f.makeMessage(); message.nonce = null; message.embeds = payload.embeds; f.messages.set(message.id, message); throw new Error('Reply lost'); });
  await f.service.noteActivity(activity(f.guild)); now += 30001; await f.service.reconcile(); expect(f.service.snapshot(G).stickyStates[0]).toMatchObject({ pending: true });
  const restarted = await f.restart(); await restarted.reconcile(); expect(restarted.snapshot(G).stickyStates[0]).toMatchObject({ pending: false, activity: 0 }); expect(f.channel.send).toHaveBeenCalledOnce();
});
it('rejects a copied sticky reference from another author during recovery', async () => {
  const f = await fixture(); let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now); await f.service.updateConfig(f.guild, { ...f.config, stickies: [{ ...sticky, everyMessages: 1 }] });
  f.channel.send.mockImplementationOnce(async (payload: any) => { const message = f.makeMessage(); message.author.id = V; message.embeds = payload.embeds; f.messages.set(message.id, message); throw new Error('Reply lost'); });
  await f.service.noteActivity(activity(f.guild)); now += 30001; await f.service.reconcile(); const restarted = await f.restart(); await restarted.reconcile(); expect(restarted.snapshot(G).stickyStates[0]).toMatchObject({ pending: true }); expect(f.channel.send).toHaveBeenCalledOnce();
});
it('rechecks report and staff permissions after asynchronous channel work', async () => {
  const f = await fixture(); const saved = await f.service.create(f.guild, V, 'server', report, I);
  await f.control.mutate(G, state => { state.access.dashboardRoleIds = [OTHER]; }); f.members.get(V)!.roles.cache.set(OTHER, { id: OTHER });
  f.guild.channels.fetch.mockImplementationOnce(async () => { f.members.get(V)!.roles.cache.delete(OTHER); return f.channel; });
  await expect(f.service.decide(f.guild, V, saved.id, { status: 'resolved' })).rejects.toThrow('not granted'); expect(f.service.snapshot(G).reports[0]).toMatchObject({ status: 'open' });
  f.guild.channels.fetch.mockImplementationOnce(async () => { await f.control.mutate(G, state => { state.access.commandRoles.bugreport = [OTHER]; }); return f.channel; });
  await expect(f.service.create(f.guild, V, 'server', report, String(BigInt(I) + 1n))).rejects.toThrow('roles'); expect(f.channel.send).toHaveBeenCalledOnce();
});
it('pauses ambiguous sticky sends across restart and blocks a new ID from duplicating the channel', async () => {
  const f = await fixture(); let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now); await f.service.updateConfig(f.guild, { ...f.config, stickies: [{ ...sticky, everyMessages: 1 }] });
  f.channel.send.mockRejectedValueOnce(new Error('Unknown outcome')); await f.service.noteActivity(activity(f.guild)); now += 30001; await f.service.reconcile();
  const restarted = await f.restart(); await restarted.reconcile(); await restarted.noteActivity(activity(f.guild, String(BigInt(I) + 1n))); now += 60001; await restarted.reconcile(); expect(f.channel.send).toHaveBeenCalledOnce();
  await expect(restarted.updateConfig(f.guild, { ...f.config, stickies: [{ ...sticky, id: 'other' }] })).rejects.toThrow('unconfirmed');
});
it('disabling a sticky deletes only its tracked own post; a foreign message blocks deletion', async () => {
  const f = await fixture(); let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now); const configured = { ...f.config, stickies: [{ ...sticky, everyMessages: 1 }] }; await f.service.updateConfig(f.guild, configured); await f.service.noteActivity(activity(f.guild)); now += 30001; await f.service.reconcile();
  const posted = [...f.messages.values()][0]; posted.author.id = V; await f.service.updateConfig(f.guild, { ...configured, stickies: [] }); expect(posted.delete).not.toHaveBeenCalled();
  posted.author.id = BOT; await f.service.reconcile(); expect(posted.delete).toHaveBeenCalledOnce(); expect(f.service.snapshot(G).stickyStates).toEqual([]);
});
it('validates stored reports instead of silently resetting corrupt data', async () => {
  const f = await fixture(); await f.service.create(f.guild, V, 'server', report, I); const file = path.join(f.dir, 'community-tools.json'), data = JSON.parse(await readFile(file, 'utf8')); data.guilds[G].reports[0].authorId = 'bad'; await writeFile(file, JSON.stringify(data));
  await expect(new CommunityToolsStore(f.dir).init()).rejects.toThrow('restore');
});
it('prunes only completed reports at its bound and leaves open reports intact', async () => {
  const f = await fixture(); await f.service.create(f.guild, V, 'server', report, I); const file = path.join(f.dir, 'community-tools.json'), data = JSON.parse(await readFile(file, 'utf8')), seed = data.guilds[G].reports[0];
  data.guilds[G].reports = Array.from({ length: 1000 }, (_, n) => ({ ...seed, id: String(BigInt(I) + BigInt(n)), number: n + 1 })); data.guilds[G].nextNumber = 1001; await writeFile(file, JSON.stringify(data));
  const full = await f.restart(); await expect(full.create(f.guild, U, 'server', report, String(BigInt(I) + 2000n))).rejects.toThrow('history is full');
  data.guilds[G].reports[0].status = 'resolved'; await writeFile(file, JSON.stringify(data)); const prunable = await f.restart(); await prunable.create(f.guild, U, 'server', report, String(BigInt(I) + 2000n));
  expect(prunable.snapshot(G).counts.open).toBe(1000); expect(prunable.snapshot(G).reports[0]?.number).toBe(1001);
});
it('purges one guild only and respects a canceled removal guard', async () => {
  const f = await fixture(); await f.service.create(f.guild, V, 'server', report, I); await f.service.purgeGuild(G, () => false); expect(f.service.snapshot(G).reports).toHaveLength(1); await f.service.purgeGuild(OTHER); expect(f.service.snapshot(G).reports).toHaveLength(1); await f.service.purgeGuild(G); expect(f.service.snapshot(G).reports).toHaveLength(0); expect(await f.service.guildIds()).toEqual([]);
});
