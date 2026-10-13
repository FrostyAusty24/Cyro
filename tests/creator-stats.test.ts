import { expect, it } from 'vitest';
import { groupCreatorStats } from '../src/streaming/creators.js';
import type { StreamAnalyticsEntry } from '../src/streaming/analytics.js';

it('groups account history by the current guild profile with coverage-weighted metrics', () => {
  const row: StreamAnalyticsEntry = {streamerId:'a',platform:'twitch',username:'old',displayName:'Old',trackedMilliseconds:60000,averageViewers:20,peakViewers:40,followersGained:3,viewerTrackedMilliseconds:60000,followerTrackedMilliseconds:60000,sessions:1,active:false,lastTrackedAt:'2026-10-12T12:00:00Z'};
  const profiles = [{id:'creator',guildId:'g',name:'One Creator',accountIds:['a','b'],createdAt:'now',updatedAt:'now'}, {id:'foreign',guildId:'other',name:'Wrong',accountIds:['a'],createdAt:'now',updatedAt:'now'}];
  const data=groupCreatorStats('g',[row,{...row,streamerId:'b',platform:'kick',trackedMilliseconds:120000,averageViewers:50,viewerTrackedMilliseconds:120000,followersGained:null,followerTrackedMilliseconds:0,active:true}],profiles);
  expect(data).toHaveLength(1);
  expect(data[0]).toMatchObject({creatorId:'creator',displayName:'One Creator',platforms:['twitch','kick'],trackedMilliseconds:180000,averageViewers:40,peakViewers:40,followersGained:3,viewerTrackedMilliseconds:180000,followerTrackedMilliseconds:60000,sessions:2,active:true});
  expect(data[0]?.accounts).toHaveLength(2);
});

it('keeps ungrouped historical accounts visible after a profile is deleted without inventing missing metrics', () => {
  const row:StreamAnalyticsEntry={streamerId:'removed',platform:'youtube',username:'channel',displayName:'Original channel',trackedMilliseconds:60000,averageViewers:null,peakViewers:null,followersGained:null,viewerTrackedMilliseconds:0,followerTrackedMilliseconds:0,sessions:1,active:false,lastTrackedAt:'2026-10-12T12:00:00Z'};
  const [result]=groupCreatorStats('g',[row],[]);
  expect(result).toMatchObject({creatorId:'account-removed',displayName:'Original channel',trackedMilliseconds:60000,averageViewers:null,peakViewers:null,followersGained:null,accounts:[row]});
});
