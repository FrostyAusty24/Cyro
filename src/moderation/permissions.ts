import { assertNotAccessRole } from '../control/access.js';
import { PermissionFlagsBits, type CategoryChannel, type GuildMember, type OverwriteData, type Role } from 'discord.js';
import type { TicketVisibility } from './core.js';
export function assertCanModerate(actor: GuildMember, target: GuildMember, bot: GuildMember, permission: bigint, ownerId: string): void {
  if (!actor.permissions.has(permission)) throw new Error('You do not have permission for this action.');
  if (!bot.permissions.has(permission)) throw new Error('The bot is missing permission for this action.');
  if (target.id === actor.id || target.id === bot.id || target.id === ownerId) throw new Error('You cannot moderate yourself, this bot, or the server owner.');
  if (actor.id !== ownerId && actor.roles.highest.comparePositionTo(target.roles.highest) <= 0) throw new Error('Your highest role must be above the member’s role.');
  if (bot.roles.highest.comparePositionTo(target.roles.highest) <= 0) throw new Error('The bot’s highest role must be above the member’s role.');
}
export function isStaff(member: GuildMember, roles: string[]): boolean {
  return member.permissions.has(PermissionFlagsBits.ManageGuild) || roles.some(id => member.roles.cache.has(id));
}
export function assertSafeRole(role: Role, bot: GuildMember): void {
  assertNotAccessRole(role.guild.id, role.id);
  const dangerous = PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild | PermissionFlagsBits.ManageRoles | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers | PermissionFlagsBits.ModerateMembers | PermissionFlagsBits.ManageWebhooks | PermissionFlagsBits.ManageMessages | PermissionFlagsBits.MentionEveryone | PermissionFlagsBits.ManageNicknames | PermissionFlagsBits.ManageThreads | PermissionFlagsBits.ManageEvents | PermissionFlagsBits.ManageGuildExpressions | PermissionFlagsBits.ViewAuditLog | PermissionFlagsBits.MuteMembers | PermissionFlagsBits.DeafenMembers | PermissionFlagsBits.MoveMembers;
  if (role.id === role.guild.id || role.managed || role.permissions.any(dangerous) || !bot.permissions.has(PermissionFlagsBits.ManageRoles) || bot.roles.highest.comparePositionTo(role) <= 0) throw new Error('The acceptance role must be a regular role below the bot, without management or moderation permissions.');
}

export function ticketPermissionOverwrites(category: CategoryChannel, botId: string, ownerId: string, staffRoles: string[], visibility: TicketVisibility = 'private'): OverwriteData[] {
  const memberAccess = PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.ReadMessageHistory | PermissionFlagsBits.AttachFiles;
  // Discord restricts MANAGE_ROLES overwrites on channel creation to guild
  // administrators. Use the bot's existing role permission instead of adding
  // a redundant override that makes ordinary bot installations fail with 50013.
  const botAccess = memberAccess | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageMessages;
  if (visibility === 'private') return [
    { id: category.guild.id, type: 0, deny: PermissionFlagsBits.ViewChannel },
    { id: botId, type: 1, allow: botAccess },
    { id: ownerId, type: 1, allow: memberAccess },
    ...staffRoles.map(id => ({ id, type: 0 as const, allow: memberAccess })),
  ];
  // Copy the category audience without broadening any role's visibility. Only the
  // ticket owner and bot receive the access necessary to use this new ticket.
  const overwrites = [...category.permissionOverwrites.cache.values()].map(overwrite => ({
    id: overwrite.id, type: overwrite.type, allow: overwrite.allow.bitfield, deny: overwrite.deny.bitfield,
  }));
  for (const [id, permissions] of [[botId, botAccess], [ownerId, memberAccess]] as const) {
    const existing = overwrites.find(overwrite => overwrite.id === id && overwrite.type === 1);
    if (existing) { existing.allow |= permissions; existing.deny &= ~permissions; }
    else overwrites.push({ id, type: 1, allow: permissions, deny: 0n });
  }
  return overwrites;
}

