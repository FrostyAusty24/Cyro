import type { CreatorProfile, Platform } from '../types.js';
import type { JsonStore } from '../storage/store.js';
import type { StreamAnalytics, StreamAnalyticsEntry, StreamAnalyticsSnapshot } from './analytics.js';

export interface CreatorAnalyticsEntry extends StreamAnalyticsEntry {
  creatorId: string;
  platforms: Platform[];
  accounts: StreamAnalyticsEntry[];
}
export interface CreatorAnalyticsSnapshot extends StreamAnalyticsSnapshot {
  creatorLeaderboards: Record<'7d' | '30d' | 'all', CreatorAnalyticsEntry[]>;
}

/** Combined time is account time, not the union of simultaneous broadcasts. */
export function groupCreatorStats(guildId: string, rows: StreamAnalyticsEntry[], profiles: CreatorProfile[]): CreatorAnalyticsEntry[] {
  const owners = new Map(profiles.filter(profile => profile.guildId === guildId).flatMap(profile => profile.accountIds.map(id => [id, profile] as const)));
  const groups = new Map<string, CreatorAnalyticsEntry>();
  for (const row of rows) {
    const profile = owners.get(row.streamerId);
    const key = profile?.id ?? `account-${row.streamerId}`;
    let group = groups.get(key);
    if (!group) {
      group = {...row, streamerId:key, creatorId:key, displayName:profile?.name ?? row.displayName,
        discordMemberId:profile ? profile.discordMemberId : row.discordMemberId, platforms:[], accounts:[],
        trackedMilliseconds:0,averageViewers:null,peakViewers:null,followersGained:null,viewerTrackedMilliseconds:0,followerTrackedMilliseconds:0,sessions:0,active:false};
      groups.set(key, group);
    }
    if (!group.platforms.includes(row.platform)) group.platforms.push(row.platform);
    group.accounts.push({...row});
    group.trackedMilliseconds += row.trackedMilliseconds;
    if (row.averageViewers !== null && row.viewerTrackedMilliseconds > 0) {
      const weight = group.viewerTrackedMilliseconds + row.viewerTrackedMilliseconds;
      group.averageViewers = ((group.averageViewers ?? 0) * group.viewerTrackedMilliseconds + row.averageViewers * row.viewerTrackedMilliseconds) / weight;
      group.viewerTrackedMilliseconds = weight;
    }
    if (row.peakViewers !== null) group.peakViewers = Math.max(group.peakViewers ?? 0, row.peakViewers);
    if (row.followersGained !== null && row.followerTrackedMilliseconds > 0) {
      group.followersGained = (group.followersGained ?? 0) + row.followersGained;
      group.followerTrackedMilliseconds += row.followerTrackedMilliseconds;
    }
    group.sessions += row.sessions;
    group.active ||= row.active;
    if (row.lastTrackedAt > group.lastTrackedAt) group.lastTrackedAt = row.lastTrackedAt;
  }
  return [...groups.values()].sort((a,b) => b.trackedMilliseconds-a.trackedMilliseconds || a.creatorId.localeCompare(b.creatorId));
}

export class CreatorStatistics {
  constructor(private readonly analytics: Pick<StreamAnalytics,'snapshot'>, private readonly store: Pick<JsonStore,'creatorsForGuild'>) {}
  async snapshot(guildId: string): Promise<CreatorAnalyticsSnapshot> {
    const [data, profiles] = await Promise.all([this.analytics.snapshot(guildId),this.store.creatorsForGuild(guildId)]);
    return {...data,creatorLeaderboards:{'7d':groupCreatorStats(guildId,data.leaderboards['7d'],profiles),'30d':groupCreatorStats(guildId,data.leaderboards['30d'],profiles),all:groupCreatorStats(guildId,data.leaderboards.all,profiles)}};
  }
}
