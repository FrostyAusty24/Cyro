import { assertNotAccessRole } from '../control/access.js';
import { PermissionFlagsBits, type GuildMember, type Role, type TextChannel } from 'discord.js';
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

export async function assertPrivateAccess(channel: TextChannel, staffRoles: string[]): Promise<void> {
  const bot = await channel.guild.members.fetchMe();
  const roles = await channel.guild.roles.fetch();
  for (const role of roles.values()) {
    if (role.id === bot.roles.botRole?.id || staffRoles.includes(role.id) || role.permissions.has(PermissionFlagsBits.ManageGuild)) continue;
    if (channel.permissionsFor(role).has(PermissionFlagsBits.ViewChannel)) throw new Error('Transcript and application review channels must be private: only configured staff roles and server administrators may view them.');
  }
  for (const overwrite of channel.permissionOverwrites.cache.values()) {
    if (overwrite.type !== 1 || overwrite.id === bot.id || !overwrite.allow.has(PermissionFlagsBits.ViewChannel)) continue;
    const member = await channel.guild.members.fetch({ user: overwrite.id, force: true }).catch(() => null);
    if (!member || !isStaff(member, staffRoles)) throw new Error('This channel is not private: a member permission override allows someone outside the configured staff team to view it.');
  }
}

