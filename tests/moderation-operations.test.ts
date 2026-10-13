import { expect, it } from 'vitest';
import { ModerationService } from '../src/moderation/index.js';
import { ModerationStore } from '../src/moderation/store.js';

it('journals a ticket before Discord creation and blocks another creation while its outcome is uncertain', async () => {
  const guildId = '123456789012345678';
  let disk = '', attempts = 0;
  const store = new ModerationStore('unused.json', async data => { disk = data; });
  await store.update(guildId, state => { state.config.tickets = { enabled: true, categoryId: 'category', archiveCategoryId: null, logChannelId: 'log', staffRoleIds: ['staff'], maxOpenPerUser: 2 }; });
  const actor = { id: 'owner', user: { username: 'owner' } };
  const category = { id: 'category', guild: { id: guildId }, type: 4, permissionsFor: () => ({ has: () => true }) };
  const guild = { id: guildId, members: { fetch: async () => actor, fetchMe: async () => ({ id: 'bot' }) }, roles: { fetch: async () => ({ id: 'staff', guild: { id: guildId }, managed: false }) }, channels: { fetch: async (id?: string) => id ? category : new Map(), create: async () => { attempts++; expect(JSON.parse(disk)[guildId].tickets[0].operation.kind).toBe('ticket-create'); throw new Error('Response lost after creation'); } } };
  const service = new ModerationService({} as never, '.', { warn() {}, error() {} } as never);
  (service as any).store = store; (service as any).privateChannel = async () => ({ id: 'log' });
  const interaction = { guildId, guild, user: { id: 'owner' } };
  await expect((service as any).ticket(interaction, 'open')).rejects.toThrow('Response lost');
  expect(store.read(guildId).tickets[0]?.operation?.stage).toBe('needs-review');
  await expect((service as any).ticket(interaction, 'open')).rejects.toThrow('interrupted');
  expect(attempts).toBe(1);
});

it('keeps the configured private audiences fixed while support operations need recovery', async () => {
  const guildId = '123456789012345678', originalRole = '223456789012345678', replacementRole = '323456789012345678';
  const store = new ModerationStore('unused.json', async () => {});
  await store.update(guildId, state => {
    state.config.tickets.staffRoleIds = [originalRole];
    state.config.applications.reviewerRoleIds = [originalRole];
    state.tickets.push({ id: 'ticket', channelId: '', ownerId: 'owner', status: 'open', createdAt: '2026-10-12T00:00:00Z', claimedBy: null, claimedAt: null, closedBy: null, closedAt: null, operation: { id: 'create', kind: 'ticket-create', stage: 'needs-review', actorId: 'owner', startedAt: '2026-10-12T00:00:00Z' } });
    state.applications.push({ id: 'application', userId: 'owner', status: 'pending', createdAt: '2026-10-12T00:00:00Z', reviewedBy: null, reviewedAt: null, answers: ['private'], questions: ['why'], messageId: null, channelId: 'review', operation: { id: 'submit', kind: 'application-submit', stage: 'needs-review', actorId: 'owner', startedAt: '2026-10-12T00:00:00Z' } });
  });
  const service = new ModerationService({} as never, '.', { warn() {}, error() {} } as never);
  (service as any).store = store;
  await expect(service.updateConfig(guildId, { tickets: { staffRoleIds: [replacementRole] } })).rejects.toThrow('Close existing tickets');
  await expect(service.updateConfig(guildId, { applications: { reviewerRoleIds: [replacementRole] } })).rejects.toThrow('Review all pending applications');
  expect(store.read(guildId).config.tickets.staffRoleIds).toEqual([originalRole]);
  expect(store.read(guildId).config.applications.reviewerRoleIds).toEqual([originalRole]);
});
