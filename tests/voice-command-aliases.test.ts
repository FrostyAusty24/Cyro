import { afterEach, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ApplicationIntegrationType, Events, InteractionContextType } from 'discord.js';
import { createRegistrationPlan } from '../src/commands/register.js';
import { VoiceService } from '../src/voice/service.js';
import { VoiceStore } from '../src/voice/store.js';

const guildId = '123456789012345678';
const voiceNames = ['Daniel · British male', 'Michael · American male', 'Heart · American female', 'Bella · American female', 'Fenrir · American male', 'Puck · American male', 'George · British male', 'Fable · British male', 'Nicole · American female', 'Emma · British female', 'Aoede · American female', 'Sarah · American female'];
const folders: string[] = [], services: VoiceService[] = [];
afterEach(async () => {
  for (const service of services.splice(0)) { service.stop(); await service.flush(); }
  for (const folder of folders.splice(0)) await rm(folder, { recursive: true, force: true });
});

async function fixture() {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'cyro-voice-alias-')); folders.push(folder);
  const client = Object.assign(new EventEmitter(), { guilds: { cache: new Map() } });
  const access = { command: vi.fn(async () => {}) };
  const service = new VoiceService(client as never, folder, { warn: vi.fn() } as never, access as never);
  services.push(service); await service.init(); service.attach();
  const guild = { id: guildId };
  const invoke = async (commandName: string, userId: string, choice?: string) => {
    const interaction = {
      commandName, guild, guildId, user: { id: userId }, deferred: false,
      isChatInputCommand: () => true, inCachedGuild: () => true,
      options: { getString: vi.fn(() => choice) },
      deferReply: vi.fn(async () => { interaction.deferred = true; }), editReply: vi.fn(async () => {}),
    };
    client.emit(Events.InteractionCreate, interaction); await service.flush();
    return interaction;
  };
  return { folder, service, guild, access, invoke };
}

it('registers twelve choices and all numbered shortcuts with the same guild-only scope', () => {
  const plan = createRegistrationPlan({ discordClientId: guildId, commandScope: 'global' });
  const choose = plan.body.find(command => command.name === 'ttsvoice');
  expect(choose?.options?.[0]).toMatchObject({ choices: voiceNames.map((name, i) => ({ name, value: `voice${i + 1}` })) });
  for (let i = 1; i <= 12; i++) {
    const command = plan.body.find(item => item.name === `ttsvoice${i}`);
    expect(command).toMatchObject({ contexts: [InteractionContextType.Guild], integration_types: [ApplicationIntegrationType.GuildInstall] });
    expect(command?.default_member_permissions).toBeUndefined();
  }
  expect(plan.body.some(command => command.name === 'ttsvoice13')).toBe(false);
});

it('routes all numbered shortcuts including 10–12 to their full stable voice ID', async () => {
  const f = await fixture();
  const preferences: Record<string, string> = {};
  for (let i = 1; i <= 12; i++) {
    const userId = (223456789012345678n + BigInt(i)).toString();
    const interaction = await f.invoke(`ttsvoice${i}`, userId);
    expect(interaction.editReply).toHaveBeenLastCalledWith(expect.objectContaining({ embeds: [expect.objectContaining({ description: `Your voice for this server is now ${voiceNames[i - 1]}.` })] }));
    expect(f.access.command).toHaveBeenLastCalledWith(f.guild, userId, 'ttsvoice', true);
    preferences[userId] = `voice${i}`;
  }
  const stored = new VoiceStore(f.folder); await stored.init();
  expect(stored.get(guildId).voices).toEqual(preferences);
  expect(f.service.snapshot(guildId).voices).toHaveLength(12);
});

it('uses the shared voice permission for choices and new aliases without changing a denied preference', async () => {
  const f = await fixture(), userId = '323456789012345678';
  await f.invoke('ttsvoice', userId, 'voice10');
  f.access.command.mockRejectedValue(new Error('Your roles cannot use this command.'));
  const denied = await f.invoke('ttsvoice12', userId);
  expect(f.access.command).toHaveBeenLastCalledWith(f.guild, userId, 'ttsvoice', true);
  expect(denied.editReply).toHaveBeenLastCalledWith(expect.objectContaining({ content: 'Your roles cannot use this command.' }));
  const stored = new VoiceStore(f.folder); await stored.init();
  expect(stored.get(guildId).voices[userId]).toBe('voice10');
  const invalid = await f.invoke('ttsvoice13', userId);
  expect(invalid.deferReply).not.toHaveBeenCalled();
});
