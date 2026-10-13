import { expect, it } from 'vitest';
import { commandRegistrationConfig } from '../src/config.js';
import { createRegistrationPlan } from '../src/commands/register.js';

it('offers suggestions to members in server installs without requiring management permissions', () => {
  const plan = createRegistrationPlan({ discordClientId: '123456789012345678' });
  const command = plan.body.find(value => value.name === 'suggestion');
  expect(command).toBeDefined();
  expect(command?.contexts).toEqual([0]);
  expect(command?.integration_types).toEqual([0]);
  expect(command?.default_member_permissions).toBeUndefined();
  expect(command?.options ?? []).toHaveLength(0);
});

it('publishes every command globally for server installs by default', () => {
  const plan = createRegistrationPlan({ discordClientId: '123456789012345678' });
  expect(plan.route).toBe('/applications/123456789012345678/commands');
  expect(plan.scope).toBe('global');
  expect(plan.body.length).toBeGreaterThan(5);
  for (const command of plan.body) {
    expect(command.contexts).toEqual([0]);
    expect(command.integration_types).toEqual([0]);
    expect(command).not.toHaveProperty('dm_permission');
  }
});

it('uses a guild route only in explicit development mode and omits global-only fields', () => {
  const plan = createRegistrationPlan({discordClientId:'123456789012345678',commandScope:'development',developmentGuildId:'223456789012345678'});
  expect(plan.route).toBe('/applications/123456789012345678/guilds/223456789012345678/commands');
  for (const command of plan.body) {
    expect(command).not.toHaveProperty('contexts');
    expect(command).not.toHaveProperty('integration_types');
    expect(command).not.toHaveProperty('dm_permission');
  }
  expect(()=>createRegistrationPlan({discordClientId:'123456789012345678',commandScope:'development'})).toThrow('DISCORD_DEV_GUILD_ID');
});

it('defaults to global commands even when the legacy guild setting is present', () => {
  expect(commandRegistrationConfig({DISCORD_GUILD_ID:'123456789012345678'})).toEqual({commandScope:'global',developmentGuildId:undefined});
});

it('requires an explicit development scope and valid separate test guild ID', () => {
  expect(commandRegistrationConfig({DISCORD_COMMAND_SCOPE:'development',DISCORD_DEV_GUILD_ID:'123456789012345678'})).toEqual({commandScope:'development',developmentGuildId:'123456789012345678'});
  expect(commandRegistrationConfig({DISCORD_DEV_GUILD_ID:'123456789012345678'}).commandScope).toBe('global');
  expect(()=>commandRegistrationConfig({DISCORD_COMMAND_SCOPE:'development'})).toThrow('DISCORD_DEV_GUILD_ID');
  expect(()=>commandRegistrationConfig({DISCORD_COMMAND_SCOPE:'development',DISCORD_DEV_GUILD_ID:'invalid'})).toThrow('DISCORD_DEV_GUILD_ID');
  expect(()=>commandRegistrationConfig({DISCORD_COMMAND_SCOPE:'typo'})).toThrow('DISCORD_COMMAND_SCOPE');
});
