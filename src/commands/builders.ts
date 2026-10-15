import {
  ChannelType,
  InteractionContextType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { PLATFORMS, type Platform } from '../types.js';

const cleanupChoices = [
  { name: 'Set the alert to offline', value: 'offline' },
  { name: 'Delete the alert', value: 'delete' },
  { name: 'Keep the live alert unchanged', value: 'keep' },
] as const;

function streamerAutocomplete(option: import('discord.js').SlashCommandStringOption) {
  return option
    .setName('streamer')
    .setDescription('Choose a configured streamer')
    .setRequired(true)
    .setAutocomplete(true);
}

function addSharedSettings(subcommand: import('discord.js').SlashCommandSubcommandBuilder, includeUsername: boolean) {
  if (includeUsername) {
    subcommand.addStringOption((option) => option
      .setName('username')
      .setDescription('Username or full channel URL')
      .setRequired(true)
      .setMaxLength(100));
  } else {
    subcommand.addStringOption(streamerAutocomplete);
  }
  return subcommand
    .addChannelOption((option) => option
      .setName('channel')
      .setDescription('Discord channel where live alerts are posted')
      .setRequired(includeUsername)
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    .addRoleOption((option) => option.setName('ping-role').setDescription('Role mentioned in the alert'))
    .addRoleOption((option) => option.setName('live-role').setDescription('Role added to the linked member while live'))
    .addUserOption((option) => option.setName('discord-member').setDescription('Discord member who receives the live role'))
    .addStringOption((option) => option
      .setName('title-filter')
      .setDescription('Only alert if the title contains this text')
      .setMaxLength(100))
    .addIntegerOption((option) => option
      .setName('cooldown-minutes')
      .setDescription('Minimum time between alerts for this streamer')
      .setMinValue(0)
      .setMaxValue(1440))
    .addStringOption((option) => option
      .setName('message')
      .setDescription('Custom message with placeholders such as {streamer}, {title}, and {url}')
      .setMaxLength(1800))
    .addStringOption((option) => option
      .setName('cleanup')
      .setDescription('What happens to the alert when the stream ends')
      .addChoices(...cleanupChoices))
    .addStringOption(option=>option.setName('creator').setDescription('Link this account to an existing creator profile').setAutocomplete(true));
}

export function buildPlatformCommand(platform: Platform): SlashCommandBuilder {
  const label = platform[0]!.toUpperCase() + platform.slice(1);
  const command = new SlashCommandBuilder()
    .setName(platform)
    .setDescription(`Manage ${label} live alerts`)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(InteractionContextType.Guild);

  command.addSubcommand((subcommand) => addSharedSettings(
    subcommand.setName('add').setDescription(`Add a ${label} streamer`),
    true,
  ));
  command.addSubcommand((subcommand) => addSharedSettings(
    subcommand.setName('edit').setDescription(`Edit a ${label} streamer`),
    false,
  ));
  command.addSubcommand((subcommand) => subcommand
    .setName('clear')
    .setDescription('Clear an optional setting')
    .addStringOption(streamerAutocomplete)
    .addStringOption((option) => option
      .setName('setting')
      .setDescription('Setting to clear')
      .setRequired(true)
      .addChoices(
        { name: 'Ping role', value: 'ping-role' },
        { name: 'Live role', value: 'live-role' },
        { name: 'Discord member', value: 'discord-member' },
        { name: 'Title filter', value: 'title-filter' },
        { name: 'Custom message (restore default)', value: 'message' },
      )));
  command.addSubcommand((subcommand) => subcommand
    .setName('toggle')
    .setDescription('Enable or pause monitoring for a streamer')
    .addStringOption(streamerAutocomplete)
    .addBooleanOption((option) => option.setName('enabled').setDescription('Whether alerts are enabled').setRequired(true)));
  command.addSubcommand((subcommand) => subcommand
    .setName('remove')
    .setDescription(`Remove a ${label} streamer`)
    .addStringOption(streamerAutocomplete));
  command.addSubcommand((subcommand) => subcommand.setName('list').setDescription(`List configured ${label} streamers`));
  command.addSubcommand((subcommand) => subcommand
    .setName('test')
    .setDescription('Post a test alert without pinging the role')
    .addStringOption(streamerAutocomplete));
  command.addSubcommand((subcommand) => subcommand
    .setName('check')
    .setDescription('Run a live-status check now')
    .addStringOption((option) => option
      .setName('streamer')
      .setDescription('Optional configured streamer; omit to check this entire platform')
      .setAutocomplete(true)));
  return command;
}

export const streamAlertsCommand = new SlashCommandBuilder()
  .setName('streamalerts')
  .setDescription('View bot status or check all streamers')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((subcommand) => subcommand.setName('status').setDescription('Show provider and streamer status'))
  .addSubcommand((subcommand) => subcommand.setName('check').setDescription('Check every configured streamer now'));

export const streamerLeaderboardCommand = new SlashCommandBuilder()
  .setName('streamer-leaderboard')
  .setDescription('Show this server’s announced-stream leaderboard')
  .setContexts(InteractionContextType.Guild)
  .addStringOption(option => option.setName('period').setDescription('Statistics window (UTC calendar days)').addChoices(
    {name:'Last 7 days',value:'7d'}, {name:'Last 30 days',value:'30d'}, {name:'Retained 90-day history',value:'all'}))
  .addStringOption(option => option.setName('sort').setDescription('Rank creators by').addChoices(
    {name:'Tracked time',value:'time'}, {name:'Average concurrent viewers',value:'viewers'}, {name:'Net follower growth',value:'followers'}));

export const dashboardCommand = new SlashCommandBuilder()
  .setName('dashboard')
  .setDescription('Open Cyro’s dashboard to edit this server’s settings')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setContexts(InteractionContextType.Guild);

export const commandBuilders = [
  ...PLATFORMS.map(buildPlatformCommand),
  streamAlertsCommand,
  streamerLeaderboardCommand,
  dashboardCommand,
  new SlashCommandBuilder().setName('help').setDescription('Learn Cyro’s commands and how to set up your server.').setContexts(InteractionContextType.Guild),
  new SlashCommandBuilder().setName('ping').setDescription('Check whether Cyro is connected to Discord.').setContexts(InteractionContextType.Guild),
];
