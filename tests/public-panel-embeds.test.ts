import { PermissionsBitField, PermissionFlagsBits } from 'discord.js';
import { expect, it, vi } from 'vitest';
import { CommunityService } from '../src/community/service.js';
import { defaultGuild } from '../src/community/types.js';
import { ModerationService } from '../src/moderation/index.js';
import { ModerationStore } from '../src/moderation/store.js';

const guildId = '123456789012345678', channelId = '223456789012345678', roleId = '323456789012345678';
const logger = { warn() {}, error() {} };

function rolesPanel(embedLinks = true) {
  const state = defaultGuild();
  state.config.selfRoles.roles = [{ roleId, label: 'Viewer' }];
  const role = { id: roleId, guild: { id: guildId }, managed: false, editable: true, permissions: new PermissionsBitField() };
  const channel = { id: channelId, guildId, permissionsFor: () => new PermissionsBitField(embedLinks ? PermissionFlagsBits.EmbedLinks : 0n) };
  const guild = { id: guildId, channels: { fetch: async () => channel }, members: { fetchMe: async () => ({}) }, roles: { fetch: async () => new Map([[roleId, role]]) } };
  const interaction = { commandName: 'roles-panel', guildId, channelId, guild, user: { id: 'owner' }, memberPermissions: new PermissionsBitField(PermissionFlagsBits.ManageGuild), deferReply: vi.fn(async () => {}), editReply: vi.fn(async (_payload: any) => {}) };
  const service = new CommunityService({} as never, '.', logger as never);
  (service as any).store = { get: () => state };
  return { service, interaction };
}

it('publishes the self-role embed with the existing guild-scoped role button and no mentions', async () => {
  const { service, interaction } = rolesPanel();
  await (service as any).command(interaction);
  const payload = interaction.editReply.mock.calls[0]![0];
  expect(payload.content).toBeUndefined();
  expect(payload.embeds[0].toJSON()).toMatchObject({ title: 'Choose your roles', description: 'Click a button to add its role. Click it again to remove the role.', color: 0x82d9f7 });
  expect(payload.components[0].toJSON().components).toEqual([expect.objectContaining({ custom_id: `community:role:${guildId}:${roleId}`, label: 'Viewer' })]);
  expect(payload.allowedMentions).toEqual({ parse: [] });
});

it('explains the missing Embed Links permission instead of publishing a broken self-role panel', async () => {
  const { service, interaction } = rolesPanel(false);
  await (service as any).command(interaction);
  expect(interaction.editReply).toHaveBeenCalledExactlyOnceWith({ content: 'The bot needs Embed Links in this channel to publish a roles panel.' });
});

async function ticketPanel(embedLinks = true) {
  const store = new ModerationStore('unused.json', async () => {});
  await store.update(guildId, state => { state.config.tickets.enabled = true; });
  const permissions = new PermissionsBitField([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, ...(embedLinks ? [PermissionFlagsBits.EmbedLinks] : [])]);
  const channel = { id: channelId, guild: { id: guildId }, type: 0, permissionsFor: () => permissions, send: vi.fn(async (_payload: any) => ({})) };
  const guild = { id: guildId, channels: { fetch: async () => channel }, members: { fetchMe: async () => ({}), fetch: async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.ManageGuild) }) } };
  const interaction = { guildId, channelId, guild, user: { id: 'owner' }, editReply: vi.fn(async () => {}) };
  const service = new ModerationService({} as never, '.', logger as never);
  (service as any).store = store;
  return { service, interaction, channel };
}

it('publishes the legacy ticket embed while preserving its category dropdown and disabled mentions', async () => {
  const { service, interaction, channel } = await ticketPanel();
  await (service as any).ticket(interaction, 'panel');
  const payload = channel.send.mock.calls[0]![0];
  expect(payload.content).toBeUndefined();
  expect(payload.embeds[0].toJSON()).toMatchObject({ title: 'Need a hand?', description: 'Choose a category to open a ticket.', color: 0x82d9f7 });
  expect(payload.components[0].toJSON().components[0]).toMatchObject({ custom_id: 'mod:ticket:choose', options: [expect.objectContaining({ value: 'default' })] });
  expect(payload.allowedMentions).toEqual({ parse: [] });
  expect(interaction.editReply).toHaveBeenCalledExactlyOnceWith('Ticket panel posted.');
});

it('refuses to send a legacy ticket panel when Embed Links is denied in its channel', async () => {
  const { service, interaction, channel } = await ticketPanel(false);
  await expect((service as any).ticket(interaction, 'panel')).rejects.toThrow('The bot needs Embed Links in the panel channel.');
  expect(channel.send).not.toHaveBeenCalled();
  expect(interaction.editReply).not.toHaveBeenCalled();
});
