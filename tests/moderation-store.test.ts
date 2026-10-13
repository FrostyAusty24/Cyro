import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { ModerationStore, type SupportOperation } from '../src/moderation/store.js';

it('serializes guild writes, isolates guilds, and rolls back failed persistence', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'moderation-test-'));
  try {
    let rejectWrite = false;
    const store = new ModerationStore(path.join(dir, 'state.json'), async () => { if (rejectWrite) throw new Error('disk full'); });
    await store.init();
    await Promise.all([store.update('123456789012345678', s => { s.config.enabled = true; }), store.update('223456789012345678', s => { s.config.blockedWords = ['scam']; })]);
    expect(store.read('123456789012345678').config.blockedWords).toEqual([]);
    expect(store.read('223456789012345678').config.enabled).toBe(false);
    rejectWrite = true;
    await expect(store.update('123456789012345678', s => { s.config.enabled = false; })).rejects.toThrow('disk full');
    expect(store.read('123456789012345678').config.enabled).toBe(true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

it('restores successful guild writes from disk and purges only the requested guild', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'moderation-durable-'));
  try {
    const filename = path.join(dir, 'state.json');
    const first = new ModerationStore(filename);
    await first.init();
    await first.update('123456789012345678', s => { s.config.enabled = true; });
    await first.update('223456789012345678', s => { s.config.blockedWords = ['scam']; });
    const second = new ModerationStore(filename);
    await second.init();
    expect(second.read('123456789012345678').config.enabled).toBe(true);
    await second.purgeGuild('123456789012345678');
    const third = new ModerationStore(filename);
    await third.init();
    expect(third.guildIds()).toEqual(['223456789012345678']);
    expect(third.read('223456789012345678').config.blockedWords).toEqual(['scam']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

it('adds the optional archive category without losing older stored guild configuration', async () => {
  const { writeFile } = await import('node:fs/promises');
  const { DEFAULT_CONFIG } = await import('../src/moderation/core.js');
  const dir = await mkdtemp(path.join(tmpdir(), 'moderation-migration-'));
  try {
    const filename = path.join(dir, 'state.json');
    const legacy = structuredClone(DEFAULT_CONFIG) as any;
    delete legacy.tickets.archiveCategoryId;
    legacy.blockedWords = ['preserve me'];
    await writeFile(filename, JSON.stringify({ '123456789012345678': { config: legacy, cases: [], tickets: [], applications: [] } }));
    const store = new ModerationStore(filename); await store.init();
    expect(store.read('123456789012345678').config.tickets.archiveCategoryId).toBeNull();
    expect(store.read('123456789012345678').config.blockedWords).toEqual(['preserve me']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

it('does not allow caller-owned record references to change committed state outside a transaction', async () => {
  const store = new ModerationStore('unused.json', async () => {});
  const words = ['original'];
  const operation: SupportOperation = { id: 'original-operation', kind: 'ticket-close', stage: 'prepared', actorId: 'owner', startedAt: '2026-10-12T00:00:00Z' };
  const result = await store.update('123456789012345678', s => {
    s.config.blockedWords = words;
    s.tickets.push({ id: 'ticket', channelId: 'channel', ownerId: 'owner', status: 'open', createdAt: operation.startedAt, claimedBy: null, claimedAt: null, closedBy: null, closedAt: null, operation });
    return s.tickets[0]!;
  });
  words.push('uncommitted');
  operation.transcriptMessageId = 'uncommitted-transcript';
  result.operation!.id = 'uncommitted-operation';
  expect(store.read('123456789012345678').config.blockedWords).toEqual(['original']);
  expect(store.read('123456789012345678').tickets[0]?.operation).toEqual({ id: 'original-operation', kind: 'ticket-close', stage: 'prepared', actorId: 'owner', startedAt: '2026-10-12T00:00:00Z' });
});
