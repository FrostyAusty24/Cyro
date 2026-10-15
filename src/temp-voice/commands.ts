import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';

export const tempVoiceCommands = [new SlashCommandBuilder().setName('room').setDescription('Manage the temporary voice room you are in.')
  .setContexts(InteractionContextType.Guild).setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
  .addSubcommand(command => command.setName('info').setDescription('See who owns this room and how to manage it.'))
  .addSubcommand(command => command.setName('lock').setDescription('Stop new people joining, except permitted members and server administrators.'))
  .addSubcommand(command => command.setName('unlock').setDescription('Restore the room’s normal join permissions.'))
  .addSubcommand(command => command.setName('name').setDescription('Give your room a new name.').addStringOption(option => option.setName('name').setDescription('Room name').setMinLength(1).setMaxLength(80).setRequired(true)))
  .addSubcommand(command => command.setName('limit').setDescription('Set how many people can join your room.').addIntegerOption(option => option.setName('members').setDescription('1–99, or 0 for no limit').setMinValue(0).setMaxValue(99).setRequired(true)))
  .addSubcommand(command => command.setName('permit').setDescription('Let a server member join your locked room.').addUserOption(option => option.setName('member').setDescription('Member to allow').setRequired(true)))
  .addSubcommand(command => command.setName('revoke').setDescription('Stop a member joining your room; does not disconnect them.').addUserOption(option => option.setName('member').setDescription('Member to block from joining').setRequired(true)))];
