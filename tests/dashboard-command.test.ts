import { EventEmitter } from 'node:events';
import { ButtonStyle, Events, MessageFlags, PermissionFlagsBits, type Client } from 'discord.js';
import { expect, it, vi } from 'vitest';
import { CommandHandler } from '../src/commands/handler.js';
import { createRegistrationPlan } from '../src/commands/register.js';
import { setBotLocaleResolver } from '../src/i18n/index.js';

function setup(dashboard: { dashboardEnabled: boolean; dashboardUrl: string; getFallbackUrl?: () => string | undefined } = { dashboardEnabled: true, dashboardUrl: 'https://cyro.example' }) {
  const client = new EventEmitter();
  const handler = new CommandHandler(client as Client, {} as never, {} as never, {} as never, {} as never,
    { error: vi.fn() } as never, undefined, dashboard);
  handler.attach();
  const invoke = async (guildId: string, canManage = true, inGuild = true, commandName = 'dashboard', locale = 'en-US') => {
    const interaction = {
      commandName, guildId, locale,
      isAutocomplete: () => false, isChatInputCommand: () => true, inCachedGuild: () => inGuild,
      memberPermissions: { has: (permission: bigint) => canManage && permission === PermissionFlagsBits.ManageGuild },
      isRepliable: () => true, replied: false, deferred: false,
      deferReply: vi.fn(async () => { interaction.deferred = true; }),
      reply: vi.fn(async () => undefined), editReply: vi.fn(async (_value: any) => undefined),
    };
    client.emit(Events.InteractionCreate, interaction);
    await handler.flush();
    return interaction;
  };
  return { handler, invoke };
}

it('privately opens the invoking server settings without sharing links between guilds', async () => {
  const { handler, invoke } = setup();
  try {
    for (const guildId of ['100000000000000001', '200000000000000001']) {
      const interaction = await invoke(guildId);
      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
      const response = interaction.editReply.mock.calls[0]?.[0];
      expect(response).toBeDefined();
      expect(response.components[0].toJSON().components).toHaveLength(1);
      const button = response.components[0].toJSON().components[0];
      expect(button.style).toBe(ButtonStyle.Link);
      expect(new URL(button.url).origin).toBe('https://cyro.example');
      expect(new URL(button.url).searchParams.get('guild')).toBe(guildId);
      expect(response.allowedMentions).toEqual({ parse: [] });
    }
    const command = createRegistrationPlan({ discordClientId: '123456789012345678' }).body.find(item => item.name === 'dashboard');
    expect(command?.default_member_permissions).toBeUndefined(); // Custom role holders can discover it; handler authorizes every request.
    expect(command?.contexts).toEqual([0]);
    expect(command?.integration_types).toEqual([0]);
  } finally { handler.stop(); }
});

it('offers an active backup with the same server and destination, and hides it when unavailable', async () => {
  setBotLocaleResolver(() => 'auto');
  let backup: string | undefined = 'https://backup.cyro.example:1029';
  const { handler, invoke } = setup({ dashboardEnabled: true, dashboardUrl: 'https://cyro.example', getFallbackUrl: () => backup });
  try {
    for (const [command, hash] of [['dashboard', ''], ['poll', '#polls'], ['embed', '#messages']]) {
      const interaction = await invoke('100000000000000001', true, true, command, 'fr');
      const buttons = interaction.editReply.mock.calls[0]?.[0].components[0].toJSON().components;
      expect(buttons).toHaveLength(2);
      const link = new URL(buttons[1].url);
      expect(link.origin).toBe(backup);
      expect(link.searchParams.get('guild')).toBe('100000000000000001');
      expect(link.hash).toBe(hash);
      expect(buttons[1].label).toBe('Tableau de bord de secours');
    }
    backup = undefined;
    const interaction = await invoke('200000000000000001');
    expect(interaction.editReply.mock.calls[0]?.[0].components[0].toJSON().components).toHaveLength(1);
  } finally { handler.stop(); setBotLocaleResolver(() => 'en'); }
});

it('denies non-managers and direct messages, and gives a useful error when the dashboard is disabled', async () => {
  const { handler, invoke } = setup();
  try {
    for (const [canManage, inGuild, message] of [[false, true, 'Manage Server'], [true, false, 'Discord server']] as const) {
      const interaction = await invoke('100000000000000001', canManage, inGuild);
      expect(interaction.deferReply).not.toHaveBeenCalled();
      expect(interaction.editReply).not.toHaveBeenCalled();
      expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral, content: expect.stringContaining(message) }));
    }
  } finally { handler.stop(); }
  const disabled = setup({ dashboardEnabled: false, dashboardUrl: 'https://cyro.example' });
  try {
    const interaction = await disabled.invoke('100000000000000001');
    expect(interaction.editReply).toHaveBeenCalledWith({ content: expect.stringContaining('dashboard is not enabled') });
  } finally { disabled.handler.stop(); }
});
