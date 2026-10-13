import { expect, it } from 'vitest';
import { assertCategoryCapacity } from '../src/moderation/recovery.js';

it('refuses a full category without deleting or moving any history and allows its existing child', async () => {
  const channels = new Map(Array.from({ length: 50 }, (_, i) => [String(i), { id: String(i), parentId: 'category' }]));
  const guild = { channels: { fetch: async () => channels } };
  await expect(assertCategoryCapacity(guild as never, 'category')).rejects.toThrow('50');
  await expect(assertCategoryCapacity(guild as never, 'category', '0')).resolves.toBeUndefined();
});

it('recovers an interrupted ticket creation by its durable topic marker without creating another channel', async () => {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { ModerationStore } = await import('../src/moderation/store.js');
  const { ModerationService } = await import('../src/moderation/index.js');
  const dir = await mkdtemp(path.join(tmpdir(), 'ticket-recover-'));
  try {
    const guildId = '123456789012345678';
    const store = new ModerationStore(path.join(dir, 'moderation.json')); await store.init();
    await store.update(guildId, s => s.tickets.push({ id: 'ticket-id', channelId: '', ownerId: 'owner', status: 'open', createdAt: '2026-10-12T00:00:00Z', claimedBy: null, claimedAt: null, closedBy: null, closedAt: null, operation: { id: 'operation-id', kind: 'ticket-create', stage: 'sending', actorId: 'owner', startedAt: '2026-10-12T00:00:00Z' } }));
    let creates = 0;
    const channel = { id: '223456789012345678', type: 0, topic: 'community-ticket:ticket-id' };
    const guild = { id: guildId, available: true, channels: { fetch: async () => new Map([[channel.id, channel]]), create: async () => { creates++; } } };
    const client = { isReady: () => true, guilds: { cache: new Map([[guildId, guild]]) } };
    const service = new ModerationService(client as never, dir, { warn() {}, error() {} } as never); await service.init();
    await service.reconcile();
    const snapshot = await service.snapshot(guildId);
    expect(snapshot.tickets[0]?.channelId).toBe(channel.id);
    expect(snapshot.tickets[0]?.operation).toBeUndefined();
    expect(creates).toBe(0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

it('moves archives without inheriting category permissions or deleting ticket history', async () => {
  const { archiveTicketChannel } = await import('../src/moderation/recovery.js');
  const { PermissionFlagsBits: p } = await import('discord.js');
  let result: any[] = [], parentOptions: any, deleted = false;
  const guild = { channels: { fetch: async (id?: string) => id ? { type: 4, permissionsFor: () => ({ has: () => true }) } : new Map() } };
  const channel = { id: 'ticket', name: 'ticket-user', parentId: 'active', guild, permissionsFor: () => ({ has: () => true }), permissionOverwrites: { cache: new Map([['owner', { id: 'owner', type: 1, allow: { bitfield: p.ViewChannel | p.SendMessages }, deny: { bitfield: 0n } }]]), set: async (rows: any[]) => { result = rows; } }, setName: async () => {}, setParent: async (_id: string, options: any) => { parentOptions = options; }, delete: async () => { deleted = true; } };
  await archiveTicketChannel(channel as never, { id: 'bot' } as never, 'archive', 'test');
  expect(parentOptions.lockPermissions).toBe(false);
  expect(result[0].allow & p.ViewChannel).toBe(p.ViewChannel);
  expect(result[0].deny & p.SendMessages).toBe(p.SendMessages);
  expect(deleted).toBe(false);
});

it('finalizes a verified acceptance but flags a missing role without replaying a role grant', async () => {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os'); const path = await import('node:path');
  const { ModerationStore } = await import('../src/moderation/store.js'); const { ModerationService } = await import('../src/moderation/index.js');
  const dir = await mkdtemp(path.join(tmpdir(), 'application-recover-'));
  try {
    const guildId = '123456789012345678';
    const store = new ModerationStore(path.join(dir, 'moderation.json')); await store.init();
    await store.update(guildId, s => { for (const userId of ['has-role', 'missing-role']) s.applications.push({ id: userId, userId, status: 'pending', createdAt: '2026-10-12T00:00:00Z', reviewedBy: null, reviewedAt: null, answers: ['private'], questions: ['why'], messageId: 'message', channelId: 'review', operation: { id: userId, kind: 'application-accept', stage: 'role-changing', actorId: 'reviewer', startedAt: '2026-10-12T00:00:00Z', roleId: 'accepted-role' } }); });
    let grants = 0;
    const guild = { id: guildId, available: true, channels: { fetch: async () => new Map() }, members: { fetch: async ({ user }: { user: string }) => ({ roles: { cache: new Map(user === 'has-role' ? [['accepted-role', {}]] : []), add: async () => { grants++; } } }) } };
    const service = new ModerationService({ isReady: () => true, guilds: { cache: new Map([[guildId, guild]]) } } as never, dir, { warn() {}, error() {} } as never); await service.init(); await service.reconcile();
    const snapshot = await service.snapshot(guildId);
    expect(snapshot.applications.find(a => a.id === 'has-role')?.status).toBe('accepted');
    expect(snapshot.applications.find(a => a.id === 'missing-role')?.operation?.stage).toBe('needs-review');
    expect(grants).toBe(0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

it('reattaches an already-posted application after restart without sending it twice', async () => {
  const { mkdtemp, rm } = await import('node:fs/promises'); const { tmpdir } = await import('node:os'); const path = await import('node:path');
  const { ModerationStore } = await import('../src/moderation/store.js'); const { ModerationService } = await import('../src/moderation/index.js');
  const dir = await mkdtemp(path.join(tmpdir(), 'application-post-'));
  try {
    const guildId = '123456789012345678';
    const store = new ModerationStore(path.join(dir, 'moderation.json')); await store.init();
    await store.update(guildId, s => s.applications.push({ id: 'application', userId: 'applicant', status: 'pending', createdAt: '2026-10-12T00:00:00Z', reviewedBy: null, reviewedAt: null, answers: ['private'], questions: ['why'], messageId: null, channelId: 'review', operation: { id: 'op', kind: 'application-submit', stage: 'sending', actorId: 'applicant', startedAt: '2026-10-12T00:00:00Z' } }));
    let sends = 0;
    const message = { id: 'message', author: { id: 'bot' }, embeds: [{ footer: { text: 'application' } }] };
    const channel = { id: 'review', type: 0, messages: { fetch: async () => new Map([['message', message]]) }, send: async () => { sends++; } };
    const guild = { id: guildId, available: true, channels: { fetch: async () => new Map([['review', channel]]) } };
    const service = new ModerationService({ isReady: () => true, user: { id: 'bot' }, guilds: { cache: new Map([[guildId, guild]]) } } as never, dir, { warn() {}, error() {} } as never); await service.init(); await service.reconcile();
    const application = (await service.snapshot(guildId)).applications[0];
    expect(application?.messageId).toBe('message');
    expect(application?.operation).toBeUndefined();
    expect(sends).toBe(0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

it('finishes a verified archived ticket from its transcript marker without repeating Discord mutations', async () => {
  const { mkdtemp, rm } = await import('node:fs/promises'); const { tmpdir } = await import('node:os'); const path = await import('node:path');
  const { ModerationStore } = await import('../src/moderation/store.js'); const { ModerationService } = await import('../src/moderation/index.js');
  const { ticketWritePermissions } = await import('../src/moderation/recovery.js');
  const dir = await mkdtemp(path.join(tmpdir(), 'ticket-close-'));
  try {
    const guildId = '123456789012345678';
    const store = new ModerationStore(path.join(dir, 'moderation.json')); await store.init();
    await store.update(guildId, s => s.tickets.push({ id: 'ticket-id', channelId: 'ticket', ownerId: 'owner', status: 'open', createdAt: '2026-10-12T00:00:00Z', claimedBy: null, claimedAt: null, closedBy: null, closedAt: null, operation: { id: 'close-op', kind: 'ticket-close', stage: 'archiving', actorId: 'staff', staffClose: true, startedAt: '2026-10-12T00:00:00Z', transcriptChannelId: 'log', transcriptMessageId: 'transcript', archiveCategoryId: 'archive', externalAttempted: true } }));
    const channel = { id: 'ticket', type: 0, name: 'closed-ticket', parentId: 'archive', guild: { id: guildId }, permissionOverwrites: { cache: new Map([[guildId, { id: guildId, allow: { bitfield: 0n }, deny: { bitfield: ticketWritePermissions } }]]), set: async () => { throw new Error('must not replay'); } } };
    const log = { id: 'log', type: 0, messages: { fetch: async () => ({ id: 'transcript', author: { id: 'bot' }, content: 'Ticket export close-op\nSaved' }) } };
    const guild = { id: guildId, available: true, channels: { fetch: async () => new Map([['ticket', channel], ['log', log]]) } };
    const service = new ModerationService({ isReady: () => true, user: { id: 'bot' }, guilds: { cache: new Map([[guildId, guild]]) } } as never, dir, { warn() {}, error() {} } as never); await service.init(); await service.reconcile();
    const record = (await service.snapshot(guildId)).tickets[0];
    expect(record?.status).toBe('closed'); expect(record?.closedBy).toBe('staff'); expect(record?.operation).toBeUndefined();
  } finally { await rm(dir, { recursive: true, force: true }); }
});

it('requires current server-manager permission to release any stalled operation', async () => {
  const { ModerationService } = await import('../src/moderation/index.js');
  const service = new ModerationService({} as never, '.', { warn() {}, error() {} } as never);
  const interaction = { guildId: '123456789012345678', user: { id: 'outsider' }, guild: { members: { fetch: async () => ({ permissions: { has: () => false } }) }, roles: { fetch: async () => new Map() } } };
  await expect((service as any).supportRecovery(interaction)).rejects.toThrow('Manage Server');
});

it('isolates Discord recovery failures to one guild while recovering another guild', async () => {
  const { mkdtemp, rm } = await import('node:fs/promises'); const { tmpdir } = await import('node:os'); const path = await import('node:path');
  const { ModerationStore } = await import('../src/moderation/store.js'); const { ModerationService } = await import('../src/moderation/index.js');
  const dir = await mkdtemp(path.join(tmpdir(), 'isolated-recovery-'));
  try {
    const ids = ['123456789012345678', '223456789012345678'];
    const store = new ModerationStore(path.join(dir, 'moderation.json')); await store.init();
    for (const id of ids) await store.update(id, s => s.tickets.push({ id, channelId: '', ownerId: 'owner', status: 'open', createdAt: '2026-10-12T00:00:00Z', claimedBy: null, claimedAt: null, closedBy: null, closedAt: null, operation: { id, kind: 'ticket-create', stage: 'sending', actorId: 'owner', startedAt: '2026-10-12T00:00:00Z' } }));
    const guilds = ids.map((id, index) => [id, { id, available: true, channels: { fetch: async () => { if (!index) throw new Error('Missing Access'); return new Map([['channel', { id: 'channel', type: 0, topic: `community-ticket:${id}` }]]); } } }] as const);
    const service = new ModerationService({ isReady: () => true, guilds: { cache: new Map(guilds) } } as never, dir, { warn() {}, error() {} } as never); await service.init();
    await expect(service.reconcile()).resolves.toBeUndefined();
    expect((await service.snapshot(ids[0]!)).tickets[0]?.operation?.stage).toBe('needs-review');
    expect((await service.snapshot(ids[1]!)).tickets[0]?.channelId).toBe('channel');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

it('does not hide a persistence failure while reconciling verified Discord state', async () => {
  const { ModerationStore, ModerationPersistenceError } = await import('../src/moderation/store.js'); const { ModerationService } = await import('../src/moderation/index.js');
  const guildId = '123456789012345678';
  let fail = false;
  const store = new ModerationStore('unused.json', async () => { if (fail) throw new Error('disk full'); });
  await store.update(guildId, s => s.tickets.push({ id: 'ticket', channelId: '', ownerId: 'owner', status: 'open', createdAt: '2026-10-12T00:00:00Z', claimedBy: null, claimedAt: null, closedBy: null, closedAt: null, operation: { id: 'operation', kind: 'ticket-create', stage: 'sending', actorId: 'owner', startedAt: '2026-10-12T00:00:00Z' } }));
  fail = true;
  const guild = { id: guildId, available: true, channels: { fetch: async () => new Map([['channel', { id: 'channel', type: 0, topic: 'community-ticket:ticket' }]]) } };
  const service = new ModerationService({ isReady: () => true, guilds: { cache: new Map([[guildId, guild]]) } } as never, '.', { warn() {}, error() {} } as never);
  (service as any).store = store;
  await expect(service.reconcile()).rejects.toBeInstanceOf(ModerationPersistenceError);
  expect((await service.snapshot(guildId)).tickets[0]?.operation?.id).toBe('operation');
});
