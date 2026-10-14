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

it('does not let application acceptance grant voice or nickname moderation capabilities', async () => {
  const { assertSafeRole } = await import('../src/moderation/permissions.js');
  const role = { id: 'member-role', guild: { id: 'guild' }, managed: false, position: 1, permissions: { any: (bits: bigint) => (bits & PermissionFlagsBits.ManageNicknames) !== 0n } };
  expect(() => assertSafeRole(role as never, member('bot', 8))).toThrow();
});
