import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Collection, PermissionFlagsBits as P, PermissionsBitField } from 'discord.js';
import { expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, mergeConfig, type TicketVisibility } from '../src/moderation/core.js';
import { ModerationService } from '../src/moderation/index.js';
import { ModerationStore } from '../src/moderation/store.js';
import { ticketPermissionOverwrites } from '../src/moderation/permissions.js';
import { archiveTicketChannel } from '../src/moderation/recovery.js';

const guildId = '123456789012345678', categoryId = '223456789012345678', logId = '323456789012345678';
const staffId = '423456789012345678', ownerId = '523456789012345678', botId = '623456789012345678';
const viewerId = '723456789012345678', outsiderId = '823456789012345678';
const overwrite = (id: string, type: 0 | 1, allow = 0n, deny = 0n) => ({ id, type, allow: new PermissionsBitField(allow), deny: new PermissionsBitField(deny) });
const ticketType = (visibility: TicketVisibility) => ({ id: 'support', name: 'Support', enabled: true, categoryId, logChannelId: logId, archiveCategoryId: null, staffRoleIds: [staffId], maxOpenPerUser: 2, closeAction: 'archive' as const, visibility });

function fixture() {
  const store = new ModerationStore('unused.json', async () => {});
  const actor = { id: ownerId, user: { username: 'member' }, roles: { cache: new Map() }, permissions: new PermissionsBitField() };
  const bot = { id: botId };
  const category: any = { id: categoryId, name: 'Support', type: 4, guild: { id: guildId }, permissionsFor: () => ({ has: () => true }), permissionOverwrites: { cache: new Collection([
    [guildId, overwrite(guildId, 0, P.ViewChannel | P.SendMessages)],
    [viewerId, overwrite(viewerId, 0, P.EmbedLinks, P.AttachFiles)],
    ['923456789012345678', overwrite('923456789012345678', 0, 0n, P.ViewChannel)],
    [ownerId, overwrite(ownerId, 1, P.EmbedLinks, P.SendMessages | P.MentionEveryone)],
  ]) } };
  const log: any = { id: logId, name: 'transcripts', type: 0, guild: { id: guildId }, permissionsFor: () => ({ has: () => true }), send: vi.fn(async () => ({ id: 'message' })) };
  const channels = new Map([[categoryId, category], [logId, log]]);
  const create = vi.fn(async (_options: unknown) => ({ id: 'new-ticket', send: vi.fn(async () => {}) }));
  const guild: any = { id: guildId, members: { fetchMe: async () => bot, fetch: async () => actor }, roles: { fetch: async (id: string) => ({ id, managed: false, guild: { id: guildId } }) }, channels: { fetch: async (id?: string) => id ? channels.get(id) : channels, create } };
  const service = new ModerationService({ guilds: { fetch: async () => guild } } as never, '.', { warn() {}, error() {} } as never);
  (service as any).store = store;
  return { store, actor, bot, category, log, channels, create, guild, service };
}

it('allows public transcript and application review destinations without inspecting their audience', async () => {
  const f = fixture();
  // No role enumeration or overwrite cache is available on this public log.
  await f.service.updateConfig(guildId, {
    tickets: { enabled: true, types: [ticketType('inherit')] },
    applications: { enabled: true, reviewChannelId: logId, reviewerRoleIds: [staffId] },
  });
  expect(f.store.read(guildId).config.tickets.types?.[0]?.visibility).toBe('inherit');
  let modal: any;
  await (f.service as any).showApplication({ guildId, user: { id: ownerId }, showModal: async (value: unknown) => { modal = value; } });
  await (f.service as any).submitApplication({ guildId, guild: f.guild, user: { id: ownerId }, customId: modal.data.custom_id, fields: { getTextInputValue: () => 'My answer' }, editReply: vi.fn() });
  expect(f.log.send).toHaveBeenCalledOnce();
  const record = f.store.read(guildId).applications[0]!;
  const review = { guildId, guild: f.guild, channelId: logId, customId: `mod:application:deny:${record.id}`, user: { id: outsiderId }, message: { id: record.messageId, edit: vi.fn(async () => {}) }, editReply: vi.fn() };
  await expect((f.service as any).reviewApplication(review)).rejects.toThrow('reviewers');
  expect(f.store.read(guildId).applications[0]?.status).toBe('pending');
  f.actor.id = outsiderId;
  f.actor.roles.cache.set(staffId, {});
  await (f.service as any).reviewApplication(review);
  expect(f.store.read(guildId).applications[0]?.status).toBe('denied');
});

it('still rejects a foreign, unsupported, or bot-inaccessible destination without changing settings', async () => {
  const f = fixture();
  for (const invalid of [{ guild: { id: '999999999999999999' } }, { type: 4 }, { permissionsFor: () => ({ has: () => false }) }]) {
    f.channels.set(logId, { ...f.log, ...invalid });
    await expect(f.service.updateConfig(guildId, { applications: { reviewChannelId: logId, reviewerRoleIds: [staffId] } })).rejects.toThrow();
    expect(f.store.read(guildId).config.applications.reviewChannelId).toBeNull();
  }
});

it.each(['inherit', 'private'] as const)('creates %s tickets using their saved visibility policy without modifying the category', async visibility => {
  const f = fixture();
  await f.store.update(guildId, state => { state.config.tickets.enabled = true; state.config.tickets.types = [ticketType(visibility)]; });
  const before = [...f.category.permissionOverwrites.cache.values()].map((row: any) => ({ id: row.id, allow: row.allow.bitfield, deny: row.deny.bitfield }));
  await (f.service as any).ticket({ guildId, guild: f.guild, user: { id: ownerId }, editReply: vi.fn() }, 'open');
  const payload: any = f.create.mock.calls[0]![0];
  const everyone = payload.permissionOverwrites.find((row: any) => row.id === guildId);
  if (visibility === 'inherit') {
    expect(everyone.allow & P.ViewChannel).toBe(P.ViewChannel);
    expect(everyone.deny & P.ViewChannel).toBe(0n);
    expect(payload.permissionOverwrites.find((row: any) => row.id === viewerId)).toMatchObject({ allow: P.EmbedLinks, deny: P.AttachFiles });
    expect(payload.permissionOverwrites.some((row: any) => row.id === staffId)).toBe(false);
    const owner = payload.permissionOverwrites.find((row: any) => row.id === ownerId);
    expect(owner.allow & P.SendMessages).toBe(P.SendMessages);
    expect(owner.allow & P.EmbedLinks).toBe(P.EmbedLinks);
    expect(owner.deny).toBe(P.MentionEveryone);
  } else {
    expect(everyone.deny & P.ViewChannel).toBe(P.ViewChannel);
    expect(payload.permissionOverwrites.map((row: any) => row.id)).toEqual([guildId, botId, ownerId, staffId]);
  }
  expect([...f.category.permissionOverwrites.cache.values()].map((row: any) => ({ id: row.id, allow: row.allow.bitfield, deny: row.deny.bitfield }))).toEqual(before);
  expect(f.store.read(guildId).tickets[0]?.ticketType?.visibility).toBe(visibility);
  f.actor.id = outsiderId;
  await expect((f.service as any).ticket({ guildId, guild: f.guild, user: { id: outsiderId }, channelId: 'new-ticket', editReply: vi.fn() }, 'claim')).rejects.toThrow('support staff');
  await expect((f.service as any).ticket({ guildId, guild: f.guild, user: { id: outsiderId }, channelId: 'new-ticket', editReply: vi.fn() }, 'close')).rejects.toThrow('ticket owner');
});

it('inherits a private category without granting the configured staff roles extra visibility', () => {
  const f = fixture();
  f.category.permissionOverwrites.cache.set(guildId, overwrite(guildId, 0, 0n, P.ViewChannel));
  const rows = ticketPermissionOverwrites(f.category, botId, ownerId, [staffId], 'inherit');
  expect(rows.find(row => row.id === guildId)).toMatchObject({ allow: 0n, deny: P.ViewChannel });
  expect(rows.some(row => row.id === staffId)).toBe(false);
});

it.each(['inherit', 'private'] as const)('retains %s ticket visibility when freezing and moving a closed archive', async visibility => {
  const f = fixture();
  const original = ticketPermissionOverwrites(f.category, botId, ownerId, [staffId], visibility);
  const rows = original.map(row => overwrite(row.id as string, row.type as 0 | 1, new PermissionsBitField(row.allow).bitfield, new PermissionsBitField(row.deny).bitfield));
  let frozen: any[] = [];
  const setParent = vi.fn(async () => {});
  const channel: any = { id: 'new-ticket', guild: f.guild, name: 'support-member', parentId: categoryId, permissionsFor: () => ({ has: () => true }), permissionOverwrites: { cache: new Collection(rows.map(row => [row.id, row])), set: async (value: any[]) => { frozen = value; } }, setName: vi.fn(), setParent };
  f.channels.set('archive', { id: 'archive', type: 4, permissionsFor: () => ({ has: () => true }) });
  await archiveTicketChannel(channel, f.bot as never, 'archive', 'Test close');
  for (const prior of rows) {
    const after = frozen.find(row => row.id === prior.id);
    expect(after.allow & P.ViewChannel).toBe(prior.allow.bitfield & P.ViewChannel);
    expect(after.deny & P.ViewChannel).toBe(prior.deny.bitfield & P.ViewChannel);
    if (prior.id !== botId) expect(after.deny & P.SendMessages).toBe(P.SendMessages);
  }
  expect(setParent).toHaveBeenCalledWith('archive', { lockPermissions: false, reason: 'Test close' });
});

it('defaults new setups to category access but preserves missing legacy visibility across load and edits', async () => {
  expect(mergeConfig(undefined, {}).tickets.visibility).toBe('inherit');
  expect(() => mergeConfig(undefined, { tickets: { visibility: 'public' } })).toThrow('visibility');
  const legacy = structuredClone(DEFAULT_CONFIG); delete legacy.tickets.visibility;
  const { visibility: _oldVisibility, ...oldType } = ticketType('private');
  legacy.tickets.types = [oldType];
  expect(mergeConfig(legacy, {}).tickets.visibility).toBe('private');
  expect(mergeConfig(legacy, {}).tickets.types?.[0]?.visibility).toBe('private');
  const directory = await mkdtemp(path.join(tmpdir(), 'ticket-visibility-'));
  try {
    const file = path.join(directory, 'moderation.json');
    await writeFile(file, JSON.stringify({ [guildId]: { config: legacy, cases: [], tickets: [{ id: 'old', status: 'open', ticketType: oldType }], applications: [] } }));
    const store = new ModerationStore(file); await store.init();
    await store.update(guildId, state => { state.config = mergeConfig(state.config, { tickets: { visibility: 'inherit', types: [ticketType('inherit')] } }); });
    const reopened = new ModerationStore(file); await reopened.init();
    expect(reopened.read(guildId).config.tickets.types?.[0]?.visibility).toBe('inherit');
    expect(reopened.read(guildId).tickets[0]?.ticketType?.visibility).toBe('private');
    expect(reopened.read('999999999999999999').tickets).toEqual([]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
