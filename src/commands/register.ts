import { ApplicationIntegrationType, InteractionContextType, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { commandRegistrationConfig, type AppConfig } from '../config.js';
import type { Logger } from '../logger.js';
import { commandBuilders } from './builders.js';
import { communityCommands } from '../community/commands.js';
import { moderationCommands } from '../moderation/index.js';
import { tempVoiceCommands } from '../temp-voice/commands.js';
import { communityToolsCommands } from '../community-tools/commands.js';
import { voiceCommands } from '../voice/commands.js';

export function createRegistrationPlan(config: Pick<AppConfig, 'discordClientId' | 'commandScope' | 'developmentGuildId'>) {
  const { commandScope, developmentGuildId } = commandRegistrationConfig({
    DISCORD_COMMAND_SCOPE: config.commandScope,
    DISCORD_DEV_GUILD_ID: config.developmentGuildId,
  });
  const allCommands = [...commandBuilders, ...communityCommands, ...moderationCommands, ...voiceCommands, ...tempVoiceCommands, ...communityToolsCommands,
    new SlashCommandBuilder().setName('confess').setDescription('Post an anonymous confession in this server’s configured channel.').addStringOption(o=>o.setName('confession').setDescription('Your confession (posted without your name)').setRequired(true).setMaxLength(1500)),
    new SlashCommandBuilder().setName('suggestion').setDescription('Share an idea for members of this server to vote on.'),
    ...['poll', 'embed'].map(name => new SlashCommandBuilder().setName(name).setDescription(`Open the dashboard ${name === 'poll' ? 'poll builder' : 'message composer'}.`))];
  const body = allCommands.map((builder) => {
    const { dm_permission: _dmPermission, ...command } = builder.toJSON();
    if (['dashboard','twitch','kick','youtube','tiktok','streamalerts','roles-panel'].includes(command.name)) delete command.default_member_permissions;
    return { ...command, contexts: [InteractionContextType.Guild], integration_types: [ApplicationIntegrationType.GuildInstall] };
  });
  if (commandScope === 'development' && developmentGuildId) {
    return {
      route: Routes.applicationGuildCommands(config.discordClientId, developmentGuildId),
      scope: 'development',
      body: body.map(({ contexts: _contexts, integration_types: _integrationTypes, ...command }) => command),
    };
  }
  return { route: Routes.applicationCommands(config.discordClientId), scope: 'global', body };
}

export async function registerCommands(config: AppConfig, logger: Logger): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.discordToken);
  const { route, scope, body } = createRegistrationPlan(config);
  await rest.put(route, { body });
  logger.info('Registered Discord slash commands.', {
    scope,
    commands: body.map((command) => command.name),
  });
}
