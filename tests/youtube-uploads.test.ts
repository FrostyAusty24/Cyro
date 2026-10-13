import { afterEach, expect, it, vi } from 'vitest';
import { YouTubeProvider } from '../src/providers/youtube.js';
import { Logger } from '../src/logger.js';
import type { AppConfig } from '../src/config.js';
import type { StreamerRecord } from '../src/types.js';

const channelId='UC_x5XG1OV2P6uZZ5FSM9Ttw';const now=Date.parse('2026-10-12T12:00:00Z');
const config={youtubeApiKey:'private-key'} as AppConfig;
const record=(id:string):StreamerRecord=>({id,guildId:id,platform:'youtube',username:channelId,platformUserId:channelId} as StreamerRecord);
const video=(id:string,other:object={})=>({id,snippet:{channelId,title:'Community video',publishedAt:'2026-10-12T11:00:00Z',liveBroadcastContent:'none',thumbnails:{high:{url:'https://i.ytimg.com/video.jpg'}}},status:{privacyStatus:'public',uploadStatus:'processed'},...other});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

it('uses the official uploads playlist once per broadcaster and skips live, upcoming, replay and private videos',async()=>{
  const videos=[video('normalVideo'),video('liveVideo01',{snippet:{channelId,liveBroadcastContent:'live'}}),video('upcoming001',{snippet:{channelId,liveBroadcastContent:'upcoming'}}),video('replayVideo',{liveStreamingDetails:{actualStartTime:'2026-10-12T10:00:00Z',actualEndTime:'2026-10-12T11:00:00Z'}}),video('privateVid1',{status:{privacyStatus:'private',uploadStatus:'processed'}})];
  const fetcher=vi.fn(async(url:URL,options:RequestInit)=>{
    expect(options.signal).toBeInstanceOf(AbortSignal);expect(url.hostname).toBe('www.googleapis.com');
    if(url.pathname.endsWith('/channels'))return Response.json({items:[{id:channelId,contentDetails:{relatedPlaylists:{uploads:'UU_x5XG1OV2P6uZZ5FSM9Ttw'}}}]});
    if(url.pathname.endsWith('/playlistItems'))return Response.json({items:videos.map(video=>({contentDetails:{videoId:video.id}}))});
    expect(url.pathname).toMatch(/\/videos$/);return Response.json({items:videos});
  });vi.stubGlobal('fetch',fetcher);
  const results=await new YouTubeProvider(config,new Logger('error'),()=>now).checkUploads([record('a'),record('b')]);
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(results.get('a')).toEqual(results.get('b'));
  expect(results.get('a')).toMatchObject({kind:'uploads',items:[{id:'normalVideo',title:'Community video',publishedAt:'2026-10-12T11:00:00Z',url:'https://www.youtube.com/watch?v=normalVideo',thumbnailUrl:'https://i.ytimg.com/video.jpg'}]});
});

it('paces uploads across manual requests, caches the playlist identity, and preserves errors without leaking keys',async()=>{
  let clock=now;let fail=false;
  const fetcher=vi.fn(async(url:URL)=>{
    if(fail)return Response.json({error:{message:'private-key',errors:[{reason:'quotaExceeded'}]}},{status:403});
    if(url.pathname.endsWith('/channels'))return Response.json({items:[{id:channelId,contentDetails:{relatedPlaylists:{uploads:'UU_x5XG1OV2P6uZZ5FSM9Ttw'}}}]});
    return Response.json({items:[]});
  });vi.stubGlobal('fetch',fetcher);const provider=new YouTubeProvider(config,new Logger('error'),()=>clock);
  await provider.checkUploads([record('a')]);expect(fetcher).toHaveBeenCalledTimes(2);
  clock+=60_000;expect((await provider.checkUploads([record('a')])).get('a')).toEqual({kind:'deferred'});expect(fetcher).toHaveBeenCalledTimes(2);
  clock+=240_000;fail=true;const failed=(await provider.checkUploads([record('a')])).get('a');
  expect(failed).toMatchObject({kind:'error',error:expect.stringContaining('quotaExceeded')});expect(JSON.stringify(failed)).not.toContain('private-key');expect(fetcher).toHaveBeenCalledTimes(3);
});

it('does not issue network requests without the required YouTube API key',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  const result=await new YouTubeProvider({} as AppConfig,new Logger('error')).checkUploads([record('a')]);
  expect(result.get('a')).toMatchObject({kind:'error',error:expect.stringContaining('YOUTUBE_API_KEY')});expect(fetcher).not.toHaveBeenCalled();
});
