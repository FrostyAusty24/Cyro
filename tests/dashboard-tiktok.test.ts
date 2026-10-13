import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Client } from 'discord.js';
import { DashboardTikTok, TikTokCancellation, tiktokSelection } from '../src/dashboard/tiktok.js';
import type { JsonStore } from '../src/storage/store.js';
import type { StreamMonitor } from '../src/services/monitor.js';
import type { TikTokService } from '../src/tiktok/service.js';

const guildId = '123456789012345678';
const otherGuildId = '223456789012345678';
const ownerId = '323456789012345678';
const managerId = '423456789012345678';
const selection = { guildId, recordId: 'creator-tiktok' };

function fixture() {
  let record: Record<string, unknown> | undefined = { id: selection.recordId, guildId, platform: 'tiktok', discordMemberId: ownerId, displayName: 'Creator', username: 'creator-live' };
  let memberPresent = true;
  let grantOwner: string | undefined = ownerId;
  const memberFetch = vi.fn(async () => { if (!memberPresent) throw new Error('Unknown Member'); return { permissions: { has: () => false } }; });
  const guild = { id: guildId, name: 'Creator server', available: true, members: { fetch: memberFetch } };
  const store = { get: vi.fn(async () => record), all: vi.fn(async () => record ? [record] : []), update: vi.fn(async (_id: string, value: object) => { record = { ...record, ...value }; return record; }) };
  const committed = vi.fn();
  let beforeProviderCommit: (() => void) | undefined;
  const service = {
    configured: vi.fn(() => true),
    authorizationUrl: vi.fn((state: string) => `https://www.tiktok.com/v2/auth/authorize/?state=${state}`),
    status: vi.fn(() => ({ configured: true, connected: Boolean(grantOwner), connectedBy: grantOwner, needsReconnect: false, reason: 'Ready' })),
    ownConnections: vi.fn((userId: string) => grantOwner === userId ? [{ ...selection, connectedBy: grantOwner, connected: true }] : []),
    connect: vi.fn(async (guild: string, id: string, user: string, code: string, validate: () => Promise<void>) => { beforeProviderCommit?.(); await validate(); committed(guild, id, user, code); }),
    disconnect: vi.fn(async () => ({ revoked: true, remainingConnections: false })),
    videos: vi.fn(async () => ({ kind: 'uploads', items: [{ id: 'video-1', title: 'Creator upload', url: 'https://www.tiktok.com/@creator/video/123' }] })),
  };
  const monitor = { withLock: vi.fn(async <T>(work: () => Promise<T>) => work()) };
  const controller = new DashboardTikTok({ guilds: { cache: new Map([[guildId, guild]]) } } as unknown as Client, store as unknown as JsonStore, monitor as unknown as StreamMonitor, service as unknown as TikTokService);
  const begin = async () => new URL((await controller.begin(selection, ownerId, 'owner-session')).url).searchParams.get('state')!;
  return { controller, service, store, guild, memberFetch, committed, begin,
    setRecord: (value: Record<string, unknown> | undefined) => { record = value; },
    reassign: () => { record = { ...record, discordMemberId: managerId }; },
    leave: () => { memberPresent = false; },
    setGrantOwner: (value: string | undefined) => { grantOwner = value; },
    beforeCommit: (value: () => void) => { beforeProviderCommit = value; },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('creator-scoped TikTok dashboard authorization', () => {
  it('lets an ordinary linked guild member connect and rechecks membership before persisting', async () => {
    const f = fixture(); const state = await f.begin();
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const assertActive = vi.fn();
    await expect(f.controller.callback(state, 'provider-code', ownerId, 'owner-session', assertActive)).resolves.toBe(`/connections?guild=${guildId}&record=creator-tiktok&tiktok=connected`);
    expect(f.committed).toHaveBeenCalledExactlyOnceWith(guildId, selection.recordId, ownerId, 'provider-code');
    expect(f.memberFetch).toHaveBeenCalledWith({ user: ownerId, force: true });
    expect(f.memberFetch).toHaveBeenCalledTimes(3);
    expect(f.store.update).toHaveBeenCalledWith(selection.recordId, { uploadState: undefined });
  });

  it('does not grant a manager ownership of another member’s creator account', async () => {
    const f = fixture();
    await expect(f.controller.begin(selection, managerId, 'manager-session')).rejects.toMatchObject({ status: 403 });
    expect(f.service.authorizationUrl).not.toHaveBeenCalled();
    expect(f.service.connect).not.toHaveBeenCalled();
  });

  it('rejects a record ID belonging to a different requested guild', async () => {
    const f = fixture();
    await expect(f.controller.begin({ ...selection, guildId: otherGuildId }, ownerId, 'owner-session')).rejects.toMatchObject({ status: 404 });
    expect(f.memberFetch).not.toHaveBeenCalled();
  });

  it('requires current membership and excludes former-guild records from connection choices', async () => {
    const f = fixture(); f.leave();
    await expect(f.controller.begin(selection, ownerId, 'owner-session')).rejects.toMatchObject({ status: 403 });
    expect(await f.controller.records(ownerId)).toEqual({ configured: true, records: [] });
  });

  it('never offers another Discord user’s record to a connection chooser', async () => {
    const f = fixture();
    expect(await f.controller.records(managerId)).toEqual({ configured: true, records: [] });
    expect(f.memberFetch).not.toHaveBeenCalled();
  });

  it('binds callback state to both the original session and Discord user, then consumes it once', async () => {
    const f = fixture(); const state = await f.begin();
    await expect(f.controller.callback(state, 'code', ownerId, 'different-session', () => {})).rejects.toMatchObject({ status: 400 });
    await expect(f.controller.callback(state, 'code', managerId, 'owner-session', () => {})).rejects.toMatchObject({ status: 400 });
    expect(f.service.connect).not.toHaveBeenCalled();
    await f.controller.callback(state, 'code', ownerId, 'owner-session', () => {});
    await expect(f.controller.callback(state, 'second-code', ownerId, 'owner-session', () => {})).rejects.toMatchObject({ status: 400 });
    expect(f.committed).toHaveBeenCalledOnce();
  });

  it('expires pending authorization after ten minutes and rejects replay of expired state', async () => {
    const now = 1_800_000_000_000; const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const f = fixture(); const state = await f.begin(); clock.mockReturnValue(now + 600_000);
    await expect(f.controller.callback(state, 'code', ownerId, 'owner-session', () => {})).rejects.toMatchObject({ status: 400, message: expect.stringContaining('expired') });
    clock.mockReturnValue(now);
    await expect(f.controller.callback(state, 'code', ownerId, 'owner-session', () => {})).rejects.toMatchObject({ status: 400 });
    expect(f.service.connect).not.toHaveBeenCalled();
  });

  it('consumes cancelled callbacks so a cancelled state cannot later be exchanged', async () => {
    const f = fixture(); const state = await f.begin();
    await expect(f.controller.callback(state, null, ownerId, 'owner-session', () => {})).rejects.toBeInstanceOf(TikTokCancellation);
    await expect(f.controller.callback(state, 'late-code', ownerId, 'owner-session', () => {})).rejects.toMatchObject({ status: 400 });
    expect(f.service.connect).not.toHaveBeenCalled();
  });

  it('classifies cancellation only after validating the original browser and unexpired state', async () => {
    const now = 1_800_000_000_000; const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const f = fixture(); const state = await f.begin();
    const wrongSession = await f.controller.callback(state, null, ownerId, 'other-session', () => {}).catch(error => error);
    expect(wrongSession).toMatchObject({ status: 400 }); expect(wrongSession).not.toBeInstanceOf(TikTokCancellation);
    clock.mockReturnValue(now + 600_000);
    const expired = await f.controller.callback(state, null, ownerId, 'owner-session', () => {}).catch(error => error);
    expect(expired).toMatchObject({ status: 400, message: expect.stringContaining('expired') }); expect(expired).not.toBeInstanceOf(TikTokCancellation);
    expect(f.service.connect).not.toHaveBeenCalled(); expect(f.store.update).not.toHaveBeenCalled();
  });

  it('preserves the prior upload baseline and delivery receipts when a reconnect fails', async () => {
    const f = fixture();
    const uploadState = { baselineAt: '2026-10-12T10:00:00.000Z', ignorePublishedBefore: '2026-10-12T10:00:00.000Z',
      seen: [{ id: 'previous-video', publishedAt: '2026-10-12T11:00:00.000Z' }],
      deliveries: [{ videoId: 'previous-video', channelId: '523456789012345678', attemptedAt: '2026-10-12T11:02:00.000Z', status: 'uncertain' }],
      lastCheckedAt: '2026-10-12T11:05:00.000Z' };
    await f.store.update(selection.recordId, { uploadState: structuredClone(uploadState) });
    const state = await f.begin();
    f.service.connect.mockRejectedValueOnce(new Error('TikTok temporarily unavailable'));
    await expect(f.controller.callback(state, 'reconnect-code', ownerId, 'owner-session', () => {})).rejects.toThrow('TikTok temporarily unavailable');
    expect((await f.store.get(selection.recordId))?.uploadState).toEqual(uploadState);
    expect(f.service.status()).toMatchObject({ connected: true, connectedBy: ownerId });
    expect(f.committed).not.toHaveBeenCalled();
    await expect(f.controller.callback(state, 'retry-code', ownerId, 'owner-session', () => {})).rejects.toMatchObject({ status: 400 });
    expect(f.service.connect).toHaveBeenCalledOnce();
  });

  it('rejects a creator reassigned while the owner was on TikTok’s consent page', async () => {
    const f = fixture(); const state = await f.begin(); f.reassign();
    await expect(f.controller.callback(state, 'code', ownerId, 'owner-session', () => {})).rejects.toMatchObject({ status: 403 });
    expect(f.service.connect).not.toHaveBeenCalled(); expect(f.store.update).not.toHaveBeenCalled();
  });

  it('rejects reassignment during token exchange before a connection is committed', async () => {
    const f = fixture(); const state = await f.begin(); f.beforeCommit(f.reassign);
    await expect(f.controller.callback(state, 'code', ownerId, 'owner-session', () => {})).rejects.toMatchObject({ status: 403 });
    expect(f.committed).not.toHaveBeenCalled();
  });

  it('rejects membership loss during token exchange before a connection is committed', async () => {
    const f = fixture(); const state = await f.begin(); f.beforeCommit(f.leave);
    await expect(f.controller.callback(state, 'code', ownerId, 'owner-session', () => {})).rejects.toMatchObject({ status: 403 });
    expect(f.committed).not.toHaveBeenCalled();
  });

  it('checks request/session validity again immediately before the provider commit', async () => {
    const f = fixture(); const state = await f.begin(); let active = true; f.beforeCommit(() => { active = false; });
    await expect(f.controller.callback(state, 'code', ownerId, 'owner-session', () => { if (!active) throw new Error('Request or session ended'); })).rejects.toThrow('Request or session ended');
    expect(f.committed).not.toHaveBeenCalled();
  });

  it('allows the original grant owner to disconnect even after profile deletion and guild departure', async () => {
    const f = fixture(); f.setRecord(undefined); f.leave();
    expect(await f.controller.connections(ownerId)).toMatchObject({ connections: [{ creatorName: 'Former creator profile', connectedBy: ownerId }] });
    await expect(f.controller.disconnect(selection, ownerId)).resolves.toEqual({ revoked: true, remainingConnections: false });
    expect(f.service.disconnect).toHaveBeenCalledExactlyOnceWith(guildId, selection.recordId);
    expect(f.memberFetch).not.toHaveBeenCalled();
  });

  it('does not allow another member or manager to revoke the creator’s grant', async () => {
    const f = fixture();
    await expect(f.controller.disconnect(selection, managerId)).rejects.toMatchObject({ status: 403 });
    f.setGrantOwner(undefined);
    await expect(f.controller.disconnect(selection, ownerId)).rejects.toMatchObject({ status: 403 });
    expect(f.service.disconnect).not.toHaveBeenCalled();
  });

  it('requires current creator ownership to read public-video results through an account grant', async () => {
    const f = fixture();
    await expect(f.controller.videos(selection, managerId)).rejects.toMatchObject({ status: 403 });
    await expect(f.controller.videos(selection, ownerId)).resolves.toMatchObject({ videos: [{ id: 'video-1' }] });
    expect(f.service.videos).toHaveBeenCalledExactlyOnceWith(guildId, selection.recordId, ownerId);
  });

  it.each([null, [], {}, { ...selection, discordUserId: ownerId }, { ...selection, guildId: 'bad' }, { ...selection, recordId: '../record' }])('rejects malformed or overposted creator selections: %j', input => {
    expect(() => tiktokSelection(input)).toThrow();
  });
});
