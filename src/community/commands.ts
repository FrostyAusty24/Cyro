import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const communityCommands = [
  new SlashCommandBuilder().setName('counting').setDescription('See the community count, record, and rules.').setDMPermission(false),
  new SlashCommandBuilder().setName('invites').setDescription('See your unique referrals and the invite challenge.').setDMPermission(false),
  new SlashCommandBuilder().setName('rank').setDescription('See your chat activity level and XP.').setDMPermission(false),
  new SlashCommandBuilder().setName('leaderboard').setDescription('See the server chat activity leaderboard.').setDMPermission(false),
  new SlashCommandBuilder().setName('roles-panel').setDescription('Publish buttons for the configured self-assignable roles.').setDMPermission(false).setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
];
