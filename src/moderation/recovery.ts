import { ChannelType, PermissionFlagsBits, type Guild, type GuildMember, type TextChannel } from 'discord.js';
export const ticketTopic = (id: string) => `community-ticket:${id}`;
export const exportMarker = (id: string) => `Ticket export ${id}`;
export async function assertCategoryCapacity(guild: Guild, categoryId: string, existingChannelId?: string): Promise<void> {
  const channels = await guild.channels.fetch();
  const children = [...channels.values()].filter(channel => channel && channel.parentId === categoryId && channel.id !== existingChannelId);
  if (children.length >= 50) throw new Error('The selected ticket category already has 50 channels. An administrator must move existing archives or choose another category; the bot will not delete ticket history to make room.');
}
export const ticketWritePermissions = PermissionFlagsBits.SendMessages | PermissionFlagsBits.SendMessagesInThreads | PermissionFlagsBits.CreatePublicThreads | PermissionFlagsBits.CreatePrivateThreads | PermissionFlagsBits.AddReactions;
export async function freezeTicketChannel(channel: TextChannel, bot: GuildMember, reason: string): Promise<void> {
  const overwrites = [...channel.permissionOverwrites.cache.values()].map(overwrite => ({ id: overwrite.id, type: overwrite.type, allow: overwrite.id === bot.id ? overwrite.allow.bitfield : overwrite.allow.bitfield & ~ticketWritePermissions, deny: overwrite.id === bot.id ? overwrite.deny.bitfield : overwrite.deny.bitfield | ticketWritePermissions }));
  if (channel.guild.id && !overwrites.some(overwrite => overwrite.id === channel.guild.id)) overwrites.push({ id: channel.guild.id, type: 0, allow: 0n, deny: ticketWritePermissions });
  await channel.permissionOverwrites.set(overwrites, reason);
}
/** Parent-channel exports cannot prove the content of separate threads or active webhooks. */
export async function assertTicketCanBeDeleted(channel: TextChannel, bot: GuildMember): Promise<void> {
  if (!channel.permissionsFor(bot).has([PermissionFlagsBits.ManageThreads, PermissionFlagsBits.ManageWebhooks])) throw new Error('Delete-after-transcript requires Manage Threads and Manage Webhooks so Cyro can check for unsaved thread content and incoming webhooks. The ticket channel was retained.');
  const active = await channel.threads.fetchActive();
  const archivedPublic = await channel.threads.fetchArchived({ type: 'public', limit: 2 });
  const archivedPrivate = await channel.threads.fetchArchived({ type: 'private', fetchAll: true, limit: 2 });
  if (active.threads.size || archivedPublic.threads.size || archivedPrivate.threads.size) throw new Error('This ticket has separate threads, so Cyro retained the channel to protect their history. Staff can use /ticket close keep_channel:true to keep a read-only archive.');
  if ((await channel.fetchWebhooks()).size) throw new Error('This ticket has incoming webhooks that can keep posting during export. Remove them before retrying; the channel was retained.');
}
export function isTicketArchived(channel: TextChannel, botId: string, archiveCategoryId: string | null): boolean {
  return channel.name.startsWith('closed-') && (!archiveCategoryId || channel.parentId === archiveCategoryId)
    && channel.permissionOverwrites.cache.has(channel.guild.id)
    && [...channel.permissionOverwrites.cache.values()].filter(overwrite => overwrite.id !== botId).every(overwrite => (overwrite.deny.bitfield & ticketWritePermissions) === ticketWritePermissions && (overwrite.allow.bitfield & ticketWritePermissions) === 0n);
}
export async function archiveTicketChannel(channel: TextChannel, bot: GuildMember, archiveCategoryId: string | null, reason: string): Promise<void> {
  if (!channel.permissionsFor(bot).has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) throw new Error('The bot needs Manage Channels and Manage Roles to archive this ticket.');
  if (archiveCategoryId && channel.parentId !== archiveCategoryId) {
    const category = await channel.guild.channels.fetch(archiveCategoryId);
    if (!category || category.type !== ChannelType.GuildCategory || !category.permissionsFor(bot).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels])) throw new Error('The archive category is missing or the bot cannot manage it. Choose an accessible archive category in the dashboard.');
    await assertCategoryCapacity(channel.guild, archiveCategoryId, channel.id);
  }
  await freezeTicketChannel(channel, bot, reason);
  await channel.setName(`closed-${channel.name.replace(/^closed-/, '')}`.slice(0, 100), reason);
  if (archiveCategoryId && channel.parentId !== archiveCategoryId) await channel.setParent(archiveCategoryId, { lockPermissions: false, reason });
}

