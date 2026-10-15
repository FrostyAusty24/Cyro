import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';

export const timeClockCommands = [new SlashCommandBuilder().setName('time').setDescription('Clock in, clock out, and check time recorded in this server.')
  .setContexts(InteractionContextType.Guild).setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
  .addSubcommand(command => command.setName('in').setDescription('Start recording your time.'))
  .addSubcommand(command => command.setName('out').setDescription('Finish your shift and see your session and total time.'))
  .addSubcommand(command => command.setName('me').setDescription('See your own recorded time and current shift.'))
  .addSubcommand(command => command.setName('clock').setDescription('See your time, or everyone’s totals if you have dashboard access.').addIntegerOption(option => option.setName('page').setDescription('Page of member totals').setMinValue(1).setMaxValue(100000)))
  .addSubcommand(command => command.setName('member').setDescription('Check a member’s recorded time; checking others requires dashboard access.').addUserOption(option => option.setName('user').setDescription('Member whose time to check').setRequired(true)))
  .addSubcommand(command => command.setName('panel').setDescription('Publish the clock-in buttons in the configured channel (managers only).'))];
