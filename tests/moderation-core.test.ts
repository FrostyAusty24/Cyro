import { expect, it } from 'vitest';
import { mergeConfig } from '../src/moderation/core.js';

it('validates nested configuration and does not accept unknown settings', () => {
  const config = mergeConfig(undefined, { tickets: { enabled: true, staffRoleIds: ['123456789012345678'] } });
  expect(config.tickets.enabled).toBe(true);
  expect(config.antiSpam.enabled).toBe(false);
  expect(() => mergeConfig(config, { tickets: { staffRoleIds: ['../other-guild'] } })).toThrow();
  expect(() => mergeConfig(config, { antiSpam: { maxMessages: 0 } })).toThrow();
  expect(() => mergeConfig(config, { surprise: true })).toThrow();
});

it('rejects a submitted application when its questions changed after the modal opened', async () => {
  const { ModerationService } = await import('../src/moderation/index.js');
  const service = new ModerationService({} as never, '.', { warn() {}, error() {} } as never);
  const interaction = { customId: 'mod:application:submit:outdated', guildId: '123456789012345678' };
  await expect((service as any).submitApplication(interaction)).rejects.toThrow('changed');
});

it('rejects configuration references to channels outside the selected guild', async () => {
  const { ModerationService } = await import('../src/moderation/index.js');
  const guild = { id: '123456789012345678', members: { fetchMe: async () => ({}) }, channels: { fetch: async () => ({ guild: { id: '223456789012345678' }, type: 0 }) } };
  const service = new ModerationService({ guilds: { fetch: async () => guild } } as never, '.', { warn() {}, error() {} } as never);
  await expect(service.updateConfig(guild.id, { modLogChannelId: '323456789012345678' })).rejects.toThrow('this server');
  expect((await service.getConfig(guild.id)).modLogChannelId).toBeNull();
});
