import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { PLATFORMS, type LiveSnapshot, type Platform, type StreamerRecord } from '../types.js';

const DAY_MS = 86_400_000;
export const STREAM_ANALYTICS_RETENTION_DAYS = 90;
export interface StreamAnalyticsEntry {
  streamerId: string; platform: Platform; username: string; displayName: string; discordMemberId?: string;
  trackedMilliseconds: number; averageViewers: number | null; peakViewers: number | null;
  followersGained: number | null; viewerTrackedMilliseconds: number; followerTrackedMilliseconds: number;
  sessions: number; active: boolean; lastTrackedAt: string;
}
export interface StreamAnalyticsSnapshot {
  leaderboards: { '7d': StreamAnalyticsEntry[]; '30d': StreamAnalyticsEntry[]; all: StreamAnalyticsEntry[] };
  retentionDays: 90; updatedAt: string | null;
}
interface Observation { at: number; sessionId: string; messageId: string; channelId: string; viewers: number | null; followers: number | null }
interface Bucket {
  tracked: number; viewerMilliseconds: number; viewerWeighted: number; peak: number | null;
  followerMilliseconds: number; followerChange: number; sessions: string[]; lastTrackedAt: number;
}
interface TrackedStreamer {
  streamerId: string; platform: Platform; username: string; displayName: string; discordMemberId?: string;
  days: Record<string, Bucket>; observation: Observation | null;
}
interface GuildAnalytics { records: Record<string, TrackedStreamer>; updatedAt: number | null }
interface State { version: 1; guilds: Record<string, GuildAnalytics> }
export type AnalyticsWriter = (file: string, contents: string) => Promise<void>;

async function atomicWrite(filePath: string, contents: string): Promise<void> {
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  try {
    const file = await open(temporary, 'wx', 0o600);
    try { await file.writeFile(contents, 'utf8'); await file.sync(); } finally { await file.close(); }
    await rename(temporary, filePath);
  } finally { await rm(temporary, { force: true }); }
}
const day = (at: number) => new Date(at).toISOString().slice(0, 10);
const startOfDay = (at: number) => Math.floor(at / DAY_MS) * DAY_MS;
const metric = (value: number | undefined): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const bucket = (): Bucket => ({ tracked: 0, viewerMilliseconds: 0, viewerWeighted: 0, peak: null, followerMilliseconds: 0, followerChange: 0, sessions: [], lastTrackedAt: 0 });
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const timestamp = (value: unknown): value is number => integer(value) && value <= 253_402_300_799_999;
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 1000;
const safeKey = (value: unknown): value is string => text(value) && value !== 'prototype' && !Object.hasOwn(Object.prototype, value);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(safeKey);
function validateState(value: unknown): asserts value is State {
  const fail = (): never => { throw new Error('Invalid stream analytics data; the existing file was preserved.'); };
  if (!object(value) || value.version !== 1 || !object(value.guilds)) fail();
  const state = value as Record<string, unknown>;
  for (const guild of Object.values(state.guilds as Record<string, unknown>)) {
    if (!object(guild) || !object(guild.records) || (guild.updatedAt !== null && !timestamp(guild.updatedAt))) fail();
    const data = guild as Record<string, unknown>;
    for (const [recordId, raw] of Object.entries(data.records as Record<string, unknown>)) {
      if (!object(raw)) fail();
      const entry = raw as Record<string, unknown>;
      if (entry.streamerId !== recordId || !PLATFORMS.includes(entry.platform as Platform) || !text(entry.username) || !text(entry.displayName) || (entry.discordMemberId !== undefined && !text(entry.discordMemberId)) || !object(entry.days)) fail();
      if (entry.observation !== null) {
        if (!object(entry.observation)) fail();
        const current = entry.observation as Record<string, unknown>;
        if (!timestamp(current.at) || !text(current.sessionId) || !text(current.messageId) || !text(current.channelId) || (current.viewers !== null && !integer(current.viewers)) || (current.followers !== null && !integer(current.followers))) fail();
      }
      for (const [date, rawBucket] of Object.entries(entry.days as Record<string, unknown>)) {
        const dateAt = Date.parse(date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !timestamp(dateAt) || day(dateAt) !== date || !object(rawBucket)) fail();
        const stats = rawBucket as Record<string, unknown>;
        if (!integer(stats.tracked) || stats.tracked === 0 || !integer(stats.viewerMilliseconds) || !integer(stats.followerMilliseconds) || !timestamp(stats.lastTrackedAt)) fail();
        if ((stats.viewerMilliseconds as number) > (stats.tracked as number) || (stats.followerMilliseconds as number) > (stats.tracked as number)) fail();
        if (typeof stats.viewerWeighted !== 'number' || !Number.isFinite(stats.viewerWeighted) || stats.viewerWeighted < 0 || (stats.peak !== null && !integer(stats.peak))) fail();
        if (typeof stats.followerChange !== 'number' || !Number.isSafeInteger(stats.followerChange) || !Array.isArray(stats.sessions) || !stats.sessions.length || !stats.sessions.every(text) || new Set(stats.sessions).size !== stats.sessions.length) fail();
        if (stats.viewerMilliseconds === 0 && stats.viewerWeighted !== 0) fail();
        if (stats.followerMilliseconds === 0 && stats.followerChange !== 0) fail();
      }
    }
  }
}

/**
 * Single-process, observed-announcement analytics. Reads never extrapolate stream duration.
 * Windows include today and the preceding 6/29/89 UTC days; `all` is retained history, not lifetime.
 * Viewer averages integrate successive samples linearly only where both endpoints are available.
 * Follower totals are signed net count changes, credited to the final measured UTC segment.
 * Sessions count distinct provider broadcast IDs that contributed measured time in the window.
 */
export class StreamAnalytics {
  private state: State = { version: 1, guilds: {} };
  private tail: Promise<unknown> = Promise.resolve();
  // A failed commit must never leave a baseline eligible to bridge a storage outage.
  // This barrier does not alter committed aggregates and is persisted by the next successful mutation.
  private continuityBroken = false;
  constructor(private readonly filePath: string, private readonly maxGapMs = 180_000, private readonly writer: AnalyticsWriter = atomicWrite) {
    if (!Number.isSafeInteger(maxGapMs) || maxGapMs <= 0) throw new Error('Analytics maximum observation gap must be a positive integer.');
  }
  async init(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try { const value: unknown = JSON.parse(await readFile(this.filePath, 'utf8')); validateState(value); this.state = value; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    await this.pauseAll();
  }
  private prune(draft: State, now: number): boolean {
    let changed = false;
    const cutoff = startOfDay(now) - (STREAM_ANALYTICS_RETENTION_DAYS - 1) * DAY_MS;
    const minimum = day(cutoff);
    for (const [guildId, guild] of Object.entries(draft.guilds)) {
      for (const [recordId, entry] of Object.entries(guild.records)) {
        for (const date of Object.keys(entry.days)) if (date < minimum) { delete entry.days[date]; changed = true; }
        if (!Object.keys(entry.days).length && (!entry.observation || entry.observation.at < cutoff)) { delete guild.records[recordId]; changed = true; }
      }
      if (!Object.keys(guild.records).length) { delete draft.guilds[guildId]; changed = true; }
    }
    return changed;
  }
  private mutate(operation: (draft: State) => boolean | void, now = Date.now()): Promise<void> {
    const task = this.tail.then(async () => {
      const draft = structuredClone(this.state);
      const interrupted = this.continuityBroken;
      if (interrupted) for (const guild of Object.values(draft.guilds)) for (const entry of Object.values(guild.records)) entry.observation = null;
      const changed = operation(draft) !== false;
      const pruned = this.prune(draft, Math.max(now, Date.now()));
      if (!changed && !pruned && !interrupted) return;
      await this.writer(this.filePath, JSON.stringify(draft));
      this.state = draft;
      this.continuityBroken = false;
    }).catch(error => { this.continuityBroken = true; throw error; });
    this.tail = task.catch(() => undefined);
    return task;
  }
  pause(recordId: string): Promise<void> {
    return this.mutate(draft => {
      let changed = false;
      for (const guild of Object.values(draft.guilds)) if (Object.hasOwn(guild.records, recordId) && guild.records[recordId]!.observation) { guild.records[recordId]!.observation = null; changed = true; }
      return changed;
    });
  }
  pauseAll(): Promise<void> {
    return this.mutate(draft => {
      let changed = false;
      for (const guild of Object.values(draft.guilds)) for (const entry of Object.values(guild.records)) if (entry.observation) { entry.observation = null; changed = true; }
      return changed;
    });
  }
  pauseGuild(guildId: string): Promise<void> {
    return this.mutate(draft => {
      if (!Object.hasOwn(draft.guilds, guildId)) return false;
      let changed = false;
      for (const entry of Object.values(draft.guilds[guildId]!.records)) if (entry.observation) { entry.observation = null; changed = true; }
      return changed;
    });
  }
  async flush(): Promise<void> { await this.tail; }
  async guildIds(): Promise<string[]> { await this.tail; return Object.keys(this.state.guilds); }
  purgeGuild(guildId: string, shouldPurge: () => boolean = () => true): Promise<void> {
    return this.mutate(draft => { if (!shouldPurge() || !Object.hasOwn(draft.guilds, guildId)) return false; delete draft.guilds[guildId]; });
  }
  observe(record: StreamerRecord, snapshot: LiveSnapshot, at = Date.now()): Promise<void> {
    const input = structuredClone(record), live = structuredClone(snapshot);
    if (!safeKey(input.id) || !safeKey(input.guildId) || !timestamp(at) || !PLATFORMS.includes(input.platform) || !text(input.username) || !text(input.displayName) || (input.discordMemberId !== undefined && !text(input.discordMemberId))) {
      return Promise.reject(new Error('Invalid stream analytics observation.'));
    }
    return this.mutate(draft => {
      const existing = draft.guilds[input.guildId]?.records[input.id];
      const lastAccepted = existing?.observation?.at ?? Math.max(0, ...Object.values(existing?.days ?? {}).map(value => value.lastTrackedAt));
      if (existing && at <= lastAccepted) return false;
      if (input.enabled !== true || input.state !== 'live' || !text(input.alertMessageId) || !text(input.alertMessageChannelId) || !text(live.sessionId) || live.sessionId.startsWith('test:') || input.alertedSessionId !== live.sessionId) {
        if (!existing?.observation) return false;
        existing.observation = null;
        return true;
      }
      const guild = draft.guilds[input.guildId] ??= { records: {}, updatedAt: null };
      const entry = guild.records[input.id] ??= { streamerId: input.id, platform: input.platform, username: input.username, displayName: input.displayName, days: {}, observation: null };
      entry.platform = input.platform; entry.username = input.username; entry.displayName = input.displayName; entry.discordMemberId = input.discordMemberId;
      const current: Observation = { at, sessionId: live.sessionId, messageId: input.alertMessageId!, channelId: input.alertMessageChannelId!, viewers: metric(live.viewerCount), followers: metric(live.followerCount) };
      const before = entry.observation;
      if (before && at > before.at && at - before.at <= this.maxGapMs && before.sessionId === current.sessionId && before.messageId === current.messageId && before.channelId === current.channelId) {
        const elapsed = at - before.at;
        for (let cursor = before.at; cursor < at;) {
          const end = Math.min(at, startOfDay(cursor) + DAY_MS), duration = end - cursor;
          const date = day(cursor), stats = entry.days[date] ??= bucket();
          stats.tracked += duration; stats.lastTrackedAt = Math.max(stats.lastTrackedAt, end);
          if (!stats.sessions.includes(live.sessionId)) stats.sessions.push(live.sessionId);
          // Peaks are actual samples, not interpolated values or samples from an adjacent UTC day.
          for (const sample of [before, current]) if (sample.viewers !== null && day(sample.at) === date) stats.peak = Math.max(stats.peak ?? 0, sample.viewers);
          if (before.viewers !== null && current.viewers !== null) {
            const change = current.viewers - before.viewers;
            const left = before.viewers + change * (cursor - before.at) / elapsed;
            const right = before.viewers + change * (end - before.at) / elapsed;
            stats.viewerMilliseconds += duration;
            stats.viewerWeighted += (left + right) / 2 * duration;
          }
          if (before.followers !== null && current.followers !== null) {
            stats.followerMilliseconds += duration;
            // Net change is detected at the interval end; do not invent fractional followers.
            if (end === at) stats.followerChange += current.followers - before.followers;
          }
          cursor = end;
        }
      }
      entry.observation = current; guild.updatedAt = Math.max(guild.updatedAt ?? 0, at);
    }, at);
  }
  async snapshot(guildId: string, now = Date.now()): Promise<StreamAnalyticsSnapshot> {
    if (!safeKey(guildId) || !timestamp(now)) throw new Error('Invalid stream analytics snapshot request.');
    await this.tail;
    const guild = this.state.guilds[guildId];
    const collect = (days: number): StreamAnalyticsEntry[] => {
      const minimum = day(startOfDay(now) - (days - 1) * DAY_MS), maximum = day(now);
      return Object.values(guild?.records ?? {}).flatMap(entry => {
        const buckets = Object.entries(entry.days).filter(([date]) => date >= minimum && date <= maximum).map(([, value]) => value);
        const tracked = buckets.reduce((sum, value) => sum + value.tracked, 0);
        if (!tracked) return [];
        const viewerMilliseconds = buckets.reduce((sum, value) => sum + value.viewerMilliseconds, 0);
        const followerMilliseconds = buckets.reduce((sum, value) => sum + value.followerMilliseconds, 0);
        const peaks = buckets.flatMap(value => value.peak === null ? [] : [value.peak]);
        return [{ streamerId: entry.streamerId, platform: entry.platform, username: entry.username, displayName: entry.displayName,
          ...(entry.discordMemberId ? { discordMemberId: entry.discordMemberId } : {}), trackedMilliseconds: tracked,
          averageViewers: viewerMilliseconds ? buckets.reduce((sum, value) => sum + value.viewerWeighted, 0) / viewerMilliseconds : null,
          peakViewers: peaks.length ? Math.max(...peaks) : null,
          followersGained: followerMilliseconds ? buckets.reduce((sum, value) => sum + value.followerChange, 0) : null,
          viewerTrackedMilliseconds: viewerMilliseconds, followerTrackedMilliseconds: followerMilliseconds,
          sessions: new Set(buckets.flatMap(value => value.sessions)).size,
          active: !this.continuityBroken && !!entry.observation && now >= entry.observation.at && now - entry.observation.at <= this.maxGapMs,
          lastTrackedAt: new Date(Math.max(...buckets.map(value => value.lastTrackedAt))).toISOString() }];
      }).sort((a, b) => b.trackedMilliseconds - a.trackedMilliseconds || a.streamerId.localeCompare(b.streamerId));
    };
    return { leaderboards: { '7d': collect(7), '30d': collect(30), all: collect(90) }, retentionDays: 90, updatedAt: guild?.updatedAt === null || guild?.updatedAt === undefined ? null : new Date(guild.updatedAt).toISOString() };
  }
}
