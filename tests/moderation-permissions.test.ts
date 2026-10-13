import { expect, it } from 'vitest';
import { PermissionFlagsBits, type GuildMember } from 'discord.js';
import { assertCanModerate } from '../src/moderation/permissions.js';
const member = (id: string, rank: number, allowed = true) => ({ id, permissions: { has: () => allowed }, roles: { highest: { position: rank, comparePositionTo: (role: { position: number }) => rank - role.position } } }) as unknown as GuildMember;

it('requires both live actor/bot permissions and strictly higher roles', () => {
  const actor = member('actor', 5), bot = member('bot', 8), target = member('target', 3);
  expect(() => assertCanModerate(actor, target, bot, PermissionFlagsBits.BanMembers, 'owner')).not.toThrow();
  expect(() => assertCanModerate(member('actor', 2), target, bot, PermissionFlagsBits.BanMembers, 'owner')).toThrow();
  expect(() => assertCanModerate(actor, member('target', 8), bot, PermissionFlagsBits.BanMembers, 'owner')).toThrow();
  expect(() => assertCanModerate(member('actor', 5, false), target, bot, PermissionFlagsBits.BanMembers, 'owner')).toThrow();
  expect(() => assertCanModerate(actor, member('owner', 1), bot, PermissionFlagsBits.BanMembers, 'owner')).toThrow();
});

it('rejects private-channel access through ordinary managed roles and member overrides', async () => {
  const { assertPrivateAccess } = await import('../src/moderation/permissions.js');
  const ordinaryManaged = { id: 'booster', managed: true, permissions: { has: () => false } };
  const baseRole = { id: 'everyone', managed: false, permissions: { has: () => false } };
  const outsider = { ...member('outsider', 1, false), roles: { cache: new Map() } };
  const channel = {
    guild: { id: 'guild', roles: { fetch: async () => new Map([['everyone', baseRole], ['booster', ordinaryManaged]]) }, members: { fetchMe: async () => ({ id: 'bot', roles: { botRole: { id: 'bot-role' } } }), fetch: async () => outsider } },
    permissionsFor: (subject: { id: string }) => ({ has: () => subject.id === 'booster' }),
    permissionOverwrites: { cache: new Map() },
  };
  await expect(assertPrivateAccess(channel as never, ['staff'])).rejects.toThrow('private');
  channel.permissionsFor = subject => ({ has: () => subject.id === 'outsider' });
  channel.permissionOverwrites.cache = new Map([['outsider', { type: 1, id: 'outsider', allow: { has: () => true } }]]);
  await expect(assertPrivateAccess(channel as never, ['staff'])).rejects.toThrow('private');
});


it('does not let application acceptance grant voice or nickname moderation capabilities', async () => {
  const { assertSafeRole } = await import('../src/moderation/permissions.js');
  const role = { id: 'member-role', guild: { id: 'guild' }, managed: false, position: 1, permissions: { any: (bits: bigint) => (bits & PermissionFlagsBits.ManageNicknames) !== 0n } };
  expect(() => assertSafeRole(role as never, member('bot', 8))).toThrow();
});
