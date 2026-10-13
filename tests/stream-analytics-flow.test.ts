import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { AlertService } from '../src/services/alert-service.js';
import { StreamMonitor } from '../src/services/monitor.js';
import { StreamAnalytics } from '../src/streaming/analytics.js';
import { JsonStore } from '../src/storage/store.js';
import { Logger } from '../src/logger.js';
import type { LiveSnapshot, ProviderResult, StreamerRecord } from '../src/types.js';

it('persists real monitor-to-announcement measurements only for the guild that posted successfully', async () => {
  const directory=await mkdtemp(path.join(os.tmpdir(),'stream-flow-'));
  let now=Date.now();const clock=vi.spyOn(Date,'now').mockImplementation(()=>now);
  try {
    const store=new JsonStore(path.join(directory,'streamers.json'));await store.init();
    for(const guildId of ['guild-a','guild-b']) await store.add({id:`stream-${guildId}`,guildId,platform:'twitch',username:'creator',displayName:'Creator',alertChannelId:`channel-${guildId}`,
      cooldownSeconds:0,cleanupMode:'keep',messageTemplate:'{url}',enabled:true,state:'unknown',createdAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString()});
    const statsPath=path.join(directory,'stream-analytics.json');const analytics=new StreamAnalytics(statsPath);await analytics.init();
    let live:LiveSnapshot={sessionId:'broadcast',title:'Live now',viewerCount:10,followerCount:100,url:'https://twitch.tv/creator'};
    let messageExists=true;
    const client={user:{id:'bot'},guilds:{fetch:async(guildId:string)=>({id:guildId,channels:{fetch:async()=>({guildId,isSendable:()=>true,isTextBased:()=>true,
      send:async()=>{if(guildId==='guild-b')throw new Error('No send permission');return{id:'announcement',guildId,channelId:`channel-${guildId}`};},
      messages:{fetch:async()=>{if(!messageExists)throw new Error('Unknown message');return{id:'announcement',guildId,channelId:`channel-${guildId}`,author:{id:'bot'}};}}})}})}};
    const logger=new Logger('error');const alerts=new AlertService(client as never,store,logger,analytics);
    const providers={twitch:{checkMany:async(records:StreamerRecord[])=>new Map(records.map(record=>[record.id,{kind:'live',snapshot:live} as ProviderResult]))}};
    const monitor=new StreamMonitor(store,providers as never,alerts,logger,60,()=>true,analytics);
    await monitor.check();
    expect((await analytics.snapshot('guild-a')).leaderboards.all).toEqual([]);
    now+=60_000;live={...live,viewerCount:20,followerCount:110};await monitor.check();
    now+=60_000;live={...live,viewerCount:30,followerCount:115};await monitor.check();
    expect((await analytics.snapshot('guild-a')).leaderboards.all[0]).toMatchObject({trackedMilliseconds:120_000,averageViewers:20,peakViewers:30,followersGained:5,followerTrackedMilliseconds:60_000,sessions:1,active:true});
    expect((await analytics.snapshot('guild-b')).leaderboards.all).toEqual([]);
    messageExists=false;now+=60_000;await monitor.check();
    expect((await analytics.snapshot('guild-a')).leaderboards.all[0]).toMatchObject({trackedMilliseconds:120_000,active:false});
    await monitor.pauseTracking();await store.flush();await analytics.flush();
    const restarted=new StreamAnalytics(statsPath);await restarted.init();
    expect((await restarted.snapshot('guild-a')).leaderboards.all[0]).toMatchObject({trackedMilliseconds:120_000,followersGained:5,active:false});
    expect((await restarted.snapshot('guild-b')).leaderboards.all).toEqual([]);
  } finally {clock.mockRestore();await rm(directory,{recursive:true,force:true});}
});
