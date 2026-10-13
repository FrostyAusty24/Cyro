import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { StreamAnalytics } from '../src/streaming/analytics.js';
import type { LiveSnapshot, StreamerRecord } from '../src/types.js';

const directories: string[] = [];
const start = Date.parse('2026-10-12T12:00:00.000Z');
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(start); });
afterEach(async () => { vi.useRealTimers(); await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true }))); });
async function file() { const directory = await mkdtemp(join(tmpdir(), 'stream-analytics-')); directories.push(directory); return join(directory, 'analytics.json'); }
function record(id = 'streamer', guildId = 'guild-one'): StreamerRecord {
  return { id, guildId, platform: 'twitch', username: 'creator', displayName: 'Creator', alertChannelId: 'channel',
    alertMessageChannelId: 'channel', alertMessageId: 'announcement', alertedSessionId: 'broadcast', currentSessionId: 'broadcast',
    enabled: true, state: 'live', cooldownSeconds: 300, messageTemplate: '{url}', cleanupMode: 'offline',
    createdAt: new Date(start).toISOString(), updatedAt: new Date(start).toISOString() };
}
function live(viewerCount?: number, followerCount?: number): LiveSnapshot & { followerCount?: number } {
  return { sessionId: 'broadcast', title: 'Live', url: 'https://twitch.tv/creator', startedAt: '2020-01-01T00:00:00.000Z', viewerCount, followerCount };
}

it('tracks only measured announcement intervals with time-weighted viewer samples and one session', async () => {
  const analytics = new StreamAnalytics(await file()); await analytics.init();
  await analytics.observe(record(), live(20), start);
  expect((await analytics.snapshot('guild-one', start)).leaderboards.all).toEqual([]);
  await analytics.observe(record(), live(40), start + 60_000);
  await analytics.observe(record(), live(10), start + 180_000);
  const snapshot = await analytics.snapshot('guild-one', start + 180_000);
  expect(snapshot.retentionDays).toBe(90);
  expect(snapshot.leaderboards.all).toEqual([expect.objectContaining({ streamerId: 'streamer', trackedMilliseconds: 180_000,
    averageViewers: (30 * 60_000 + 25 * 120_000) / 180_000, peakViewers: 40, viewerTrackedMilliseconds: 180_000,
    followersGained: null, followerTrackedMilliseconds: 0, sessions: 1, active: true })]);
  expect((await analytics.snapshot('guild-one', start + 240_000)).leaderboards.all[0]?.trackedMilliseconds).toBe(180_000);
});

it('does not write repeated pauses when there is no observation to clear', async () => {
  const writer = vi.fn(async () => undefined), analytics = new StreamAnalytics(await file(), 180_000, writer);
  await analytics.init(); await analytics.pause('missing'); await analytics.pauseAll();
  expect(writer).not.toHaveBeenCalled();
  await analytics.observe(record(), live(), start);
  await analytics.pause('streamer');
  expect(writer).toHaveBeenCalledTimes(2);
  await analytics.pause('streamer'); await analytics.pauseAll();
  expect(writer).toHaveBeenCalledTimes(2);
});

it('retains an observed viewer peak while leaving average coverage unknown across a missing sample', async () => {
  const analytics = new StreamAnalytics(await file()); await analytics.init();
  await analytics.observe(record(), live(50), start); await analytics.observe(record(), live(), start + 60_000);
  expect((await analytics.snapshot('guild-one', start + 60_000)).leaderboards.all[0]).toMatchObject({
    trackedMilliseconds: 60_000, averageViewers: null, peakViewers: 50, viewerTrackedMilliseconds: 0 });
});

it('assigns sampled peaks to their actual UTC day across the seven-day cutoff', async () => {
  const analytics = new StreamAnalytics(await file()); await analytics.init();
  const cutoff = Date.parse('2026-10-06T00:00:00.000Z');
  await analytics.observe(record(), live(1000), cutoff - 60_000);
  await analytics.observe(record(), live(0), cutoff + 60_000);
  const stats = await analytics.snapshot('guild-one', start);
  expect(stats.leaderboards['7d'][0]).toMatchObject({
    trackedMilliseconds: 60_000, averageViewers: 250, peakViewers: 0, viewerTrackedMilliseconds: 60_000 });
  expect(stats.leaderboards.all[0]).toMatchObject({ trackedMilliseconds: 120_000, averageViewers: 500, peakViewers: 1000 });
});

it('preserves committed data after a failed write and breaks continuity before storage recovers', async () => {
  const target = await file(); let fail = false;
  const writer = async (name: string, contents: string) => { if (fail) throw new Error('Disk unavailable'); await writeFile(name, contents); };
  const analytics = new StreamAnalytics(target, 180_000, writer); await analytics.init();
  await analytics.observe(record(), live(10, 100), start); await analytics.observe(record(), live(20, 110), start + 60_000);
  const persisted = await readFile(target, 'utf8'); fail = true;
  await expect(analytics.observe(record(), live(500, 500), start + 120_000)).rejects.toThrow('Disk unavailable');
  expect(await readFile(target, 'utf8')).toBe(persisted);
  expect((await analytics.snapshot('guild-one', start + 120_000)).leaderboards.all[0]).toMatchObject({
    trackedMilliseconds: 60_000, averageViewers: 15, followersGained: 10, active: false });
  fail = false; await analytics.observe(record(), live(30, 120), start + 180_000);
  expect((await analytics.snapshot('guild-one', start + 180_000)).leaderboards.all[0]?.trackedMilliseconds).toBe(60_000);
  await analytics.observe(record(), live(40, 130), start + 240_000);
  expect((await analytics.snapshot('guild-one', start + 240_000)).leaderboards.all[0]).toMatchObject({ trackedMilliseconds: 120_000, averageViewers: 25, followersGained: 20 });
});

it('rejects unsafe storage keys and invalid timestamps before they can change state', async () => {
  const writer = vi.fn(async () => undefined), analytics = new StreamAnalytics(await file(), 180_000, writer); await analytics.init();
  await expect(analytics.observe(record('constructor'), live(), start)).rejects.toThrow(/invalid.*analytics/i);
  await expect(analytics.observe(record('streamer', '__proto__'), live(), start)).rejects.toThrow(/invalid.*analytics/i);
  await expect(analytics.observe(record(), live(), Number.NaN)).rejects.toThrow(/invalid.*analytics/i);
  await expect(analytics.observe(record(), live(), start + 0.5)).rejects.toThrow(/invalid.*analytics/i);
  await expect(analytics.snapshot('__proto__')).rejects.toThrow(/invalid.*analytics/i);
  expect(writer).not.toHaveBeenCalled();
  expect(await analytics.guildIds()).toEqual([]);
});

it('ignores stale and repeated observations without replacing the accepted metric baseline', async () => {
  const analytics = new StreamAnalytics(await file()); await analytics.init();
  await analytics.observe(record(), live(10, 100), start);
  await analytics.observe(record(), live(20, 110), start + 60_000);
  await analytics.observe(record(), live(500, 500), start + 30_000);
  await analytics.observe(record(), live(600, 600), start + 60_000);
  await analytics.observe(record(), live(30, 120), start + 120_000);
  expect((await analytics.snapshot('guild-one', start + 120_000)).leaderboards.all[0]).toMatchObject({
    trackedMilliseconds: 120_000, averageViewers: 20, peakViewers: 30, followersGained: 20 });
});

it('orders a guild interruption ahead of later samples even while a previous write is pending', async () => {
  let release: (() => void) | undefined, hold = false;
  const writer = async () => { if (hold) { hold = false; await new Promise<void>(resolve => { release = resolve; }); } };
  const analytics = new StreamAnalytics(await file(), 180_000, writer); await analytics.init();
  await analytics.observe(record(), live(10), start);
  await analytics.observe(record('other', 'guild-two'), live(10), start);
  hold = true;
  const pending = analytics.observe(record(), live(10), start + 60_000);
  await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  const pause = analytics.pauseGuild('guild-one');
  const later = analytics.observe(record(), live(10), start + 120_000);
  release!(); await Promise.all([pending, pause, later]);
  await analytics.observe(record('other', 'guild-two'), live(10), start + 120_000);
  expect((await analytics.snapshot('guild-one', start + 120_000)).leaderboards.all[0]?.trackedMilliseconds).toBe(60_000);
  expect((await analytics.snapshot('guild-two', start + 120_000)).leaderboards.all[0]?.trackedMilliseconds).toBe(120_000);
});

it('rejects semantically corrupt persisted analytics without replacing the original file', async () => {
  const target = await file(), analytics = new StreamAnalytics(target); await analytics.init();
  await analytics.observe(record(), live(10), start); await analytics.observe(record(), live(20), start + 60_000);
  const data = JSON.parse(await readFile(target, 'utf8'));
  data.guilds['guild-one'].records.streamer.days['2026-10-12'].tracked = 'not-a-duration';
  const corrupt = JSON.stringify(data); await writeFile(target, corrupt);
  const reopened = new StreamAnalytics(target);
  await expect(reopened.init()).rejects.toThrow(/invalid.*analytics/i);
  expect(await readFile(target, 'utf8')).toBe(corrupt);
});

it('splits measured time at UTC midnight, uses calendar windows and prunes retained disk history', async () => {
  const target = await file(), analytics = new StreamAnalytics(target); await analytics.init();
  const before = Date.parse('2026-10-05T23:59:30.000Z');
  await analytics.observe(record(), live(0, 100), before);
  await analytics.observe(record(), live(60, 103), before + 60_000);
  const stats = await analytics.snapshot('guild-one', start);
  expect(stats.leaderboards.all[0]?.trackedMilliseconds).toBe(60_000);
  expect(stats.leaderboards['7d'][0]).toMatchObject({ trackedMilliseconds: 30_000, averageViewers: 45, viewerTrackedMilliseconds: 30_000,
    followersGained: 3, followerTrackedMilliseconds: 30_000, sessions: 1 });
  expect(stats.leaderboards['30d'][0]?.trackedMilliseconds).toBe(60_000);
  const later = start + 90 * 86_400_000;
  await analytics.observe(record(), live(10), later);
  expect((await analytics.snapshot('guild-one', later)).leaderboards.all).toEqual([]);
  expect(await readFile(target, 'utf8')).not.toContain('2026-10-05');
  expect(await readFile(target, 'utf8')).not.toContain('2026-10-06');
});

it('serializes isolated guild writes, returns detached snapshots and guards a queued guild purge', async () => {
  const analytics = new StreamAnalytics(await file()); await analytics.init();
  const one = record('shared', 'guild-one'), two = { ...record('shared', 'guild-two'), displayName: 'Other guild' };
  await Promise.all([analytics.observe(one, live(1), start), analytics.observe(two, live(2), start)]);
  await Promise.all([analytics.observe(one, live(1), start + 60_000), analytics.observe(two, live(2), start + 120_000)]);
  expect((await analytics.snapshot('guild-one', start + 120_000)).leaderboards.all[0]?.trackedMilliseconds).toBe(60_000);
  const other = await analytics.snapshot('guild-two', start + 120_000);
  expect(other.leaderboards.all[0]?.trackedMilliseconds).toBe(120_000);
  other.leaderboards.all[0]!.trackedMilliseconds = 1;
  expect((await analytics.snapshot('guild-two', start + 120_000)).leaderboards.all[0]?.trackedMilliseconds).toBe(120_000);
  expect(await analytics.guildIds()).toEqual(['guild-one', 'guild-two']);
  let removed = true;
  const purge = analytics.purgeGuild('guild-one', () => removed); removed = false;
  await purge;
  expect((await analytics.snapshot('guild-one', start + 120_000)).leaderboards.all).toHaveLength(1);
  await analytics.purgeGuild('guild-one');
  expect(await analytics.guildIds()).toEqual(['guild-two']);
  expect((await analytics.snapshot('guild-two', start + 120_000)).leaderboards.all).toHaveLength(1);
});

it('keeps unsupported metrics null and measures signed net followers only across covered intervals', async () => {
  const analytics = new StreamAnalytics(await file()); await analytics.init();
  await analytics.observe(record(), live(0, 100), start);
  await analytics.observe(record(), live(20, 97), start + 60_000);
  await analytics.observe(record(), live(undefined, 110), start + 120_000);
  await analytics.observe(record(), live(5), start + 180_000);
  await analytics.observe(record(), live(15, 120), start + 240_000);
  const stats = (await analytics.snapshot('guild-one', start + 240_000)).leaderboards.all[0];
  expect(stats).toMatchObject({ trackedMilliseconds: 240_000, averageViewers: 10, peakViewers: 20,
    viewerTrackedMilliseconds: 120_000, followersGained: 10, followerTrackedMilliseconds: 120_000 });
  const unsupported = { ...record('unsupported'), platform: 'tiktok' as const };
  await analytics.observe(unsupported, live(), start); await analytics.observe(unsupported, live(), start + 60_000);
  expect((await analytics.snapshot('guild-one', start + 240_000)).leaderboards.all.find(entry => entry.streamerId === 'unsupported')).toMatchObject({
    averageViewers: null, peakViewers: null, followersGained: null, viewerTrackedMilliseconds: 0, followerTrackedMilliseconds: 0 });
});

it('requires a real enabled announcement and never bridges different messages, channels or broadcasts', async () => {
  const analytics = new StreamAnalytics(await file()); await analytics.init();
  await analytics.observe(record(), live(), start);
  await analytics.observe({ ...record(), enabled: false }, live(), start + 60_000);
  await analytics.observe(record(), live(), start + 120_000);
  await analytics.observe({ ...record(), alertMessageId: undefined }, live(), start + 180_000);
  await analytics.observe(record(), live(), start + 240_000);
  const moved = { ...record(), alertMessageId: 'different-announcement' };
  await analytics.observe(moved, live(), start + 300_000);
  const channel = { ...moved, alertMessageChannelId: 'different-channel' };
  await analytics.observe(channel, live(), start + 360_000);
  const broadcast = { ...channel, alertedSessionId: 'second', currentSessionId: 'second' };
  await analytics.observe(broadcast, { ...live(), sessionId: 'second' }, start + 420_000);
  await analytics.observe(broadcast, { ...live(), sessionId: 'second' }, start + 480_000);
  expect((await analytics.snapshot('guild-one', start + 480_000)).leaderboards.all[0]).toMatchObject({ trackedMilliseconds: 60_000, sessions: 1 });
  await analytics.observe({ ...broadcast, alertedSessionId: 'test:one', currentSessionId: 'test:one' }, { ...live(), sessionId: 'test:one' }, start + 540_000);
  expect((await analytics.snapshot('guild-one', start + 540_000)).leaderboards.all[0]?.active).toBe(false);
});

it('does not bridge explicit errors, pauses or gaps beyond the observation limit', async () => {
  const analytics = new StreamAnalytics(await file()); await analytics.init();
  await analytics.observe(record(), live(10), start); await analytics.observe(record(), live(10), start + 60_000);
  await analytics.pause('streamer');
  expect((await analytics.snapshot('guild-one', start + 90_000)).leaderboards.all[0]?.active).toBe(false);
  await analytics.observe(record(), live(10), start + 120_000); await analytics.observe(record(), live(10), start + 180_000);
  await analytics.observe(record(), live(10), start + 600_000); await analytics.observe(record(), live(10), start + 660_000);
  expect((await analytics.snapshot('guild-one', start + 660_000)).leaderboards.all[0]).toMatchObject({ trackedMilliseconds: 180_000, sessions: 1 });
  await analytics.pauseAll();
  expect((await analytics.snapshot('guild-one', start + 660_000)).leaderboards.all[0]?.active).toBe(false);
});

it('preserves totals after restart while breaking persisted observation continuity', async () => {
  const target = await file(); const first = new StreamAnalytics(target); await first.init();
  await first.observe(record(), live(10), start); await first.observe(record(), live(20), start + 60_000);
  const reopened = new StreamAnalytics(target); await reopened.init();
  expect((await reopened.snapshot('guild-one', start + 90_000)).leaderboards.all[0]?.active).toBe(false);
  await reopened.observe(record(), live(30), start + 120_000);
  expect((await reopened.snapshot('guild-one', start + 120_000)).leaderboards.all[0]?.trackedMilliseconds).toBe(60_000);
  await reopened.observe(record(), live(40), start + 180_000);
  expect((await reopened.snapshot('guild-one', start + 180_000)).leaderboards.all[0]).toMatchObject({ trackedMilliseconds: 120_000, sessions: 1 });
});
