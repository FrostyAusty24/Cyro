import { expect, it, vi } from 'vitest';
import { ticketChannelName } from '../src/moderation/ticket-names.js';
import { ModerationService } from '../src/moderation/index.js';
import { ModerationStore, type Ticket } from '../src/moderation/store.js';

it('keeps Unicode category/member labels within the channel limit without splitting surrogate pairs', () => {
  const name = ticketChannelName('𠮷'.repeat(80), { displayName: '𠮷'.repeat(80), user: { username: 'example' } });
  expect(name.isWellFormed()).toBe(true);
  expect(name.length).toBeLessThanOrEqual(93);
  expect(name).toContain('𠮷');
});

const guildId = '123456789012345678';
const type = { id: 'ticket-ecdef2c-96b', name: 'General support', enabled: true, categoryId: 'category', archiveCategoryId: null, logChannelId: 'log', staffRoleIds: ['staff'], maxOpenPerUser: 2 };
function record(id: string, channelId: string, overrides: Partial<Ticket> = {}): Ticket {
  return { id, channelId, ownerId: 'owner', status: 'open', createdAt: '2026-10-12T00:00:00Z', claimedBy: null, claimedAt: null, closedBy: null, closedAt: null, ticketType: type, ...overrides };
}
async function migrationFixture() {
  const channel = { id: 'channel', name: `${type.id}-example`, type: 0, guild: { id: guildId }, topic: 'community-ticket:ticket-id', permissionsFor: () => ({ has: () => true }), setName: vi.fn(async (_name: string, _reason: string) => {}) };
  channel.setName.mockImplementation(async (name: string) => { channel.name = name; });
  const channels = new Map<string, typeof channel>([[channel.id, channel]]);
  const guild = { id: guildId, available: true, channels: { fetch: vi.fn(async (id?: string) => id ? channels.get(id) : channels) }, members: { fetchMe: async () => ({ id: 'bot' }), fetch: vi.fn(async () => ({ displayName: 'Example', user: { username: 'example' } })) } };
  const store = new ModerationStore('unused.json', async () => {});
  await store.update(guildId, state => state.tickets.push(record('ticket-id', channel.id)));
  const service = new ModerationService({ isReady: () => true, guilds: { cache: new Map([[guildId, guild]]) } } as never, '.', { warn() {}, error() {} } as never);
  (service as any).store = store;
  return { service, store, guild, channel, channels };
}

it('preserves a staff rename that arrives while a legacy ticket is being checked', async () => {
  const { service, guild, channel, channels } = await migrationFixture();
  guild.channels.fetch.mockImplementation(async (id?: string) => {
    if (id) { channel.name = 'staff-escalated-ticket'; return channel; }
    return channels;
  });
  await service.reconcile();
  expect(channel.setName).not.toHaveBeenCalled();
});

it('uses readable type and display names, safe fallbacks, and the first available ordinal', () => {
  const member = { displayName: '❄️ Example / Member', user: { username: 'example_member' } };
  expect(ticketChannelName('🎫 General Support', member)).toBe('general-support-example-member');
  expect(ticketChannelName('Support', { displayName: '☃️', user: { username: 'Example_Member' } })).toBe('support-example-member');
  expect(ticketChannelName('🎫', { displayName: '☃️', user: { username: '☃️' } })).toBe('support-member');
  expect(ticketChannelName('Support', { user: { username: 'example' } }, ['support-example', 'support-example-2', 'support-example-4'])).toBe('support-example-3');
});

it('creates the friendly label while retaining the UUID recovery marker and private audience', async () => {
  let disk = '';
  const store = new ModerationStore('unused.json', async data => { disk = data; });
  await store.update(guildId, state => { state.config.tickets.enabled = true; state.config.tickets.types = [type]; });
  const actor = { id: 'owner', displayName: 'Example', user: { username: 'example_member' } };
  const category = { id: 'category', guild: { id: guildId }, type: 4, permissionsFor: () => ({ has: () => true }) };
  const create = vi.fn(async (options: any) => {
    const saved = JSON.parse(disk)[guildId].tickets[0];
    expect(saved.operation.kind).toBe('ticket-create');
    expect(options.topic).toBe(`community-ticket:${saved.id}`);
    expect(options.permissionOverwrites.map((entry: any) => entry.id)).toEqual([guildId, 'bot', 'owner', 'staff']);
    return { id: 'new-channel', send: async () => {} };
  });
  const guild = { id: guildId, members: { fetch: async () => actor, fetchMe: async () => ({ id: 'bot' }) }, roles: { fetch: async () => ({ id: 'staff', guild: { id: guildId }, managed: false }) }, channels: { fetch: async (id?: string) => id ? category : new Map([['other', { id: 'other', name: 'general-support-example' }]]), create } };
  const service = new ModerationService({} as never, '.', { warn() {}, error() {} } as never);
  (service as any).store = store; (service as any).privateChannel = async () => ({ id: 'log' });
  await (service as any).ticket({ guildId, guild, user: { id: actor.id }, editReply: async () => {} }, 'open');
  expect(create.mock.calls[0]?.[0].name).toBe('general-support-example-2');
  expect(store.read(guildId).tickets[0]?.channelId).toBe('new-channel');
  expect(store.read(guildId).tickets[0]?.operation).toBeUndefined();
});

it('renames only a tracked open legacy ticket and leaves records, markers, archives and custom names intact', async () => {
  const { service, store, channel, channels } = await migrationFixture();
  const skipped = [
    { id: 'custom', name: 'staff-escalated', topic: 'community-ticket:custom' },
    { id: 'foreign', guild: { id: '999999999999999999' }, topic: 'community-ticket:foreign' },
    { id: 'wrong-marker', topic: 'community-ticket:another-ticket' },
    { id: 'closed', topic: 'community-ticket:closed' },
    { id: 'unknown', topic: 'community-ticket:untracked' },
  ];
  for (const value of skipped) {
    const other = { ...channel, ...value, setName: vi.fn(async () => {}) };
    channels.set(other.id, other);
    if (value.id !== 'unknown') await store.update(guildId, state => state.tickets.push(record(value.id, value.id, value.id === 'closed' ? { status: 'closed' } : {})));
  }
  channels.set('occupied', { ...channel, id: 'occupied', name: 'general-support-example', topic: '', setName: vi.fn(async () => {}) });
  const before = store.read(guildId);
  await service.reconcile();
  expect(channel.setName).toHaveBeenCalledWith('general-support-example-2', 'Use the ticket category and member name');
  for (const value of skipped) expect(channels.get(value.id)!.setName).not.toHaveBeenCalled();
  expect(store.read(guildId)).toEqual(before);
  expect(channel.topic).toBe('community-ticket:ticket-id');
  await service.reconcile();
  expect(channel.setName).toHaveBeenCalledTimes(1);
});

it('does not rename an interrupted ticket or let a cosmetic rename failure block readiness', async () => {
  const { service, store, channel, guild } = await migrationFixture();
  await store.update(guildId, state => { state.tickets[0]!.operation = { id: 'close-op', kind: 'ticket-close', stage: 'needs-review', actorId: 'owner', startedAt: '2026-10-12T00:00:00Z' }; });
  await (service as any).renameLegacyTickets(guild);
  expect(channel.setName).not.toHaveBeenCalled();
  await store.update(guildId, state => { delete state.tickets[0]!.operation; });
  channel.setName.mockRejectedValue(new Error('Missing Permissions'));
  await expect(service.reconcile()).resolves.toBeUndefined();
  expect(channel.setName).toHaveBeenCalledTimes(1);
  expect(store.read(guildId).tickets[0]?.operation).toBeUndefined();
  expect(store.read(guildId).tickets[0]?.status).toBe('open');
});

it('skips an inaccessible legacy channel without preventing other eligible tickets from migrating', async () => {
  const { service, store, channel, channels } = await migrationFixture();
  const other = { ...channel, id: 'accessible', topic: 'community-ticket:accessible', setName: vi.fn(async () => {}) };
  channels.set(other.id, other);
  await store.update(guildId, state => state.tickets.push(record(other.id, other.id)));
  channel.permissionsFor = () => null as any;
  await service.reconcile();
  expect(channel.setName).not.toHaveBeenCalled();
  expect(other.setName).toHaveBeenCalledWith('general-support-example', 'Use the ticket category and member name');
});
