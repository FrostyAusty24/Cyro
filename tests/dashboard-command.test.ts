import { EventEmitter } from 'node:events';
import { ButtonStyle, Events, MessageFlags, PermissionFlagsBits, type Client } from 'discord.js';
import { expect, it, vi } from 'vitest';
import { CommandHandler } from '../src/commands/handler.js';
import { createRegistrationPlan } from '../src/commands/register.js';

function setup(dashboard = { dashboardEnabled: true, dashboardUrl: 'https://cyro.example' }) {
  const client = new EventEmitter();
  const handler = new CommandHandler(client as Client, {} as never, {} as never, {} as never, {} as never,
    { error: vi.fn() } as never, undefined, dashboard);
  handler.attach();
  const invoke = async (guildId: string, canManage = true, inGuild = true) => {
    const interaction = {
      commandName: 'dashboard', guildId,
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
