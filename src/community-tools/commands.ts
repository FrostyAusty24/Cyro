import { SlashCommandBuilder } from 'discord.js';
export const communityToolsCommands = [new SlashCommandBuilder().setName('bugreport').setDescription('Report a bot or server problem to this server’s team. Your name is included.').addStringOption(option => option.setName('category').setDescription('The kind of problem you want to report').setAutocomplete(true).setMaxLength(40))];
