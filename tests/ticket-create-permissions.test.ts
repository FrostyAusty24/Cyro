import { Collection, DiscordAPIError, PermissionFlagsBits as P, PermissionsBitField } from 'discord.js';
import { expect, it, vi } from 'vitest';
import { ModerationService } from '../src/moderation/index.js';
import { ModerationStore } from '../src/moderation/store.js';
import { botError, setBotLocaleResolver } from '../src/i18n/index.js';

const guildId = '123456789012345678', categoryId = '223456789012345678', logId = '323456789012345678';
const staffId = '423456789012345678', ownerId = '523456789012345678', botId = '623456789012345678';
// Top.gg's documented baseline plus the two permissions requested for tickets.
const minimum = P.ViewChannel | P.SendMessages | P.ReadMessageHistory | P.AttachFiles | P.EmbedLinks
  | P.AddReactions | P.CreatePublicThreads | P.CreatePrivateThreads | P.SendMessagesInThreads
  | P.ManageChannels | P.ManageRoles;
const denied = (code = 50013) => new DiscordAPIError({ code, message: 'Missing Permissions' }, code, 403, 'POST', `https://discord.com/api/v10/guilds/${guildId}/channels`, {});

async function fixture(visibility: 'private' | 'inherit' = 'private') {
  const store = new ModerationStore('unused.json', async () => {});
  const bot = { id: botId, permissions: new PermissionsBitField(minimum) };
  const actor = { id: ownerId, user: { username: 'reviewer' }, permissions: new PermissionsBitField(), roles: { cache: new Map() } };
  const category: any = { id: categoryId, name: 'Support', type: 4, guild: { id: guildId }, permissionsFor: () => bot.permissions, permissionOverwrites: { cache: new Collection() } };
  const log: any = { id: logId, name: 'ticket-log', type: 0, guild: { id: guildId }, permissionsFor: () => bot.permissions };
  const channels = new Map([[categoryId, category], [logId, log]]);
  const create = vi.fn(async (payload: any) => {
    // Discord Create Guild Channel rejects *any* overwrite bit the bot lacks,
    // including denies; Manage Roles overwrites additionally require Admin.
    for (const row of payload.permissionOverwrites) {
      const requested = new PermissionsBitField(row.allow).bitfield | new PermissionsBitField(row.deny).bitfield;
      if (!bot.permissions.has(requested) || (requested & P.ManageRoles)) throw denied();
    }
    return { id: '723456789012345678', send: vi.fn(async () => {}) };
  });
  const guild: any = { id: guildId, members: { fetchMe: async () => bot, fetch: async () => actor }, channels: { fetch: async (id?: string) => id ? channels.get(id) : channels, create }, roles: { fetch: async (id: string) => ({ id, managed: false, guild: { id: guildId } }) } };
  const logger = { warn: vi.fn(), error: vi.fn() };
  const service = new ModerationService({} as never, '.', logger);
  (service as any).store = store;
  await store.update(guildId, state => { state.config.tickets = { enabled: true, categoryId, logChannelId: logId, archiveCategoryId: null, staffRoleIds: [staffId], maxOpenPerUser: 2, closeAction: 'archive', visibility }; });
  const interaction: any = { guildId, guild, user: { id: ownerId }, channelId: logId, editReply: vi.fn() };
  const open = () => (service as any).ticket(interaction, 'open');
  return { store, bot, category, create, logger, open, interaction };
}

it.each(['private', 'inherit'] as const)('opens a %s ticket with the documented minimum and no Manage Messages', async visibility => {
  const f = await fixture(visibility);
  expect(f.bot.permissions.has(P.Administrator | P.ManageMessages)).toBe(false);
  await f.open();
  expect(f.create).toHaveBeenCalledOnce();
  expect(f.store.read(guildId).tickets[0]).toMatchObject({ channelId: '723456789012345678', status: 'open' });
  expect(f.store.read(guildId).tickets[0]?.operation).toBeUndefined();
});

it.each([50013, 50001])('a confirmed Discord %s rejection leaves no phantom ticket or retry lock', async code => {
  const f = await fixture();
  f.create.mockRejectedValueOnce(denied(code));
  await expect(f.open()).rejects.toThrow('No channel was created');
  expect(f.store.read(guildId).tickets).toHaveLength(0);
  await f.open();
  expect(f.create).toHaveBeenCalledTimes(2);
  expect(f.store.read(guildId).tickets).toHaveLength(1);
});

it.each([new Error('Connection reset'), new DiscordAPIError({ message: 'Unavailable', code: 0 }, 0, 503, 'POST', `https://discord.com/api/v10/guilds/${guildId}/channels`, {})])('an uncertain create keeps its durable recovery record and cannot be replayed', async error => {
  const f = await fixture();
  f.create.mockRejectedValueOnce(error);
  await expect(f.open()).rejects.toThrow();
  expect(f.store.read(guildId).tickets[0]?.operation?.stage).toBe('needs-review');
  await expect(f.open()).rejects.toThrow('earlier ticket creation was interrupted');
  expect(f.create).toHaveBeenCalledOnce();
});

it.each([P.ManageMessages, P.ManageRoles])('refuses an uncopyable inherited rule before creating anything, without removing it', async permission => {
  const f = await fixture('inherit');
  const rule = { id: staffId, type: 0, allow: new PermissionsBitField(), deny: new PermissionsBitField(permission) };
  f.category.permissionOverwrites.cache.set(staffId, rule);
  await expect(f.open()).rejects.toThrow(/permissions|Manage Roles/);
  expect(f.create).not.toHaveBeenCalled();
  expect(f.store.read(guildId).tickets).toHaveLength(0);
  expect(f.category.permissionOverwrites.cache.get(staffId)).toBe(rule);
});

it('reports only the missing category permission', async () => {
  const f = await fixture();
  f.category.permissionsFor = () => new PermissionsBitField(minimum & ~P.ManageRoles);
  await expect(f.open()).rejects.toThrow('ticket category: Manage Roles.');
  expect(f.create).not.toHaveBeenCalled();
});

it('gives a safe, translated creation-rejection response in every supported language', async () => {
  const f = await fixture();
  f.create.mockRejectedValueOnce(denied());
  const error = await f.open().catch((error: unknown) => error);
  try {
    for (const locale of ['en', 'fr', 'es', 'de', 'pt']) {
      setBotLocaleResolver(() => locale);
      const message = botError(guildId, error, undefined, 'UNKNOWN');
      expect(message).not.toBe('UNKNOWN');
      expect(message).not.toContain('discord.com/api');
      if (locale !== 'en') expect(message).not.toContain('No channel was created');
    }
  } finally { setBotLocaleResolver(() => 'en'); }
});
