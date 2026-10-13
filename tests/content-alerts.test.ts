import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { AlertService } from '../src/services/alert-service.js';
import { StreamMonitor } from '../src/services/monitor.js';
import { JsonStore } from '../src/storage/store.js';
import { Logger } from '../src/logger.js';
import { DEFAULT_UPLOAD_TEMPLATE } from '../src/services/content-alerts.js';
import type { StreamerRecord, UploadResult, UploadSnapshot } from '../src/types.js';
import { DashboardStreams } from '../src/dashboard/streams.js';

const directories:string[]=[];
const baseline='2026-10-12T12:00:00.000Z';
const later='2026-10-12T12:10:00.000Z';
const video=(id='new-video',title='Community update',publishedAt='2026-10-12T12:05:00.000Z'):UploadSnapshot=>({id,title,publishedAt,url:'https://www.youtube.com/watch?v=abcdefghijk'});
const result=(items:UploadSnapshot[],checkedAt=later):UploadResult=>({kind:'uploads',items,checkedAt});
const record=(id='creator-a',guildId='guild-a'):StreamerRecord=>({id,guildId,platform:'youtube',username:'UC_x5XG1OV2P6uZZ5FSM9Ttw',displayName:'Creator',alertChannelId:'live-channel',enabled:false,state:'unknown',cooldownSeconds:300,cleanupMode:'keep',messageTemplate:'{url}',createdAt:baseline,updatedAt:baseline,
  uploads:{enabled:true,channelId:`uploads-${guildId}`,titleFilter:'community',messageTemplate:DEFAULT_UPLOAD_TEMPLATE}});
async function setup(){
  const directory=await mkdtemp(path.join(process.cwd(),'work','test-temp','content-'));directories.push(directory);
  const file=path.join(directory,'streamers.json');const store=new JsonStore(file);await store.init();const saved=await store.add(record());
  const send=vi.fn(async()=>({id:'announcement'}));
  const client={guilds:{fetch:async(guildId:string)=>({channels:{fetch:async()=>({guildId,isSendable:()=>true,send})}})}};
  const service=new AlertService(client as never,store,new Logger('error'));
  return{store,saved,send,service,file,client};
}
afterEach(async()=>{vi.restoreAllMocks();await Promise.all(directories.splice(0).map(directory=>rm(directory,{recursive:true,force:true})));});

it('seeds existing uploads without posting and keeps live filters independent',async()=>{
  const{store,saved,send,service}=await setup();
  await service.applyUploads(saved,result([video('old','Community old','2026-10-11T00:00:00Z')],baseline));
  expect(send).not.toHaveBeenCalled();
  await store.update(saved.id,{titleFilter:'LIVE ONLY'});
  await service.applyUploads(saved,result([video()]));
  expect(send).toHaveBeenCalledOnce();
  expect(send.mock.calls[0]![0]).toMatchObject({allowedMentions:{parse:[]},enforceNonce:true});
  expect((await store.get(saved.id))?.uploadState).toMatchObject({baselineAt:baseline,deliveries:[{videoId:'new-video',status:'sent',messageId:'announcement'}]});
});

it('deduplicates concurrent notifications and restarts using saved state',async()=>{
  const{store,saved,send,service,file,client}=await setup();
  await service.applyUploads(saved,result([],baseline));
  await Promise.all([service.applyUploads(saved,result([video()])),service.applyUploads(saved,result([video()]))]);
  expect(send).toHaveBeenCalledOnce();
  const restarted=new JsonStore(file);await restarted.init();
  await new AlertService(client as never,restarted,new Logger('error')).applyUploads(saved,result([video()]));
  expect(send).toHaveBeenCalledOnce();expect((await store.get(saved.id))?.state).toBe('unknown');
});

it('saves its send claim before Discord and never repeats an uncertain mutation',async()=>{
  const{store,saved,send,service,file,client}=await setup();
  await service.applyUploads(saved,result([],baseline));
  send.mockImplementation(async()=>{
    const disk=JSON.parse(await readFile(file,'utf8'));
    expect(disk.streamers[0].uploadState.deliveries[0].status).toBe('pending');
    throw new Error('Socket closed after request reached Discord');
  });
  await service.applyUploads(saved,result([video()]));
  expect((await store.get(saved.id))?.uploadState?.deliveries[0]?.status).toBe('uncertain');
  const restarted=new JsonStore(file);await restarted.init();
  await new AlertService(client as never,restarted,new Logger('error')).applyUploads(saved,result([video()]));
  expect(send).toHaveBeenCalledOnce();
  expect((await restarted.get(saved.id))?.uploadState?.lastError).toContain('uncertain delivery outcome');
});

it('does not send if the durable claim cannot be written',async()=>{
  const{store,saved,send,service}=await setup();await service.applyUploads(saved,result([],baseline));
  const original=store.update.bind(store);vi.spyOn(store,'update').mockImplementation(async(id,patch)=>{
    if(patch.uploadState?.deliveries.some(delivery=>delivery.status==='pending'))throw new Error('Disk full');
    return original(id,patch);
  });
  await expect(service.applyUploads(saved,result([video()]))).rejects.toThrow('Disk full');
  expect(send).not.toHaveBeenCalled();
});

it('recovers a crash after the pending claim without attempting another send',async()=>{
  const{store,saved,send,service}=await setup();await service.applyUploads(saved,result([],baseline));
  const state=(await store.get(saved.id))!.uploadState!;
  state.seen.push({id:'new-video',publishedAt:video().publishedAt});
  state.deliveries.push({videoId:'new-video',channelId:saved.uploads!.channelId,attemptedAt:later,status:'pending'});
  await store.update(saved.id,{uploadState:state});
  await service.applyUploads(saved,result([video()]));
  expect(send).not.toHaveBeenCalled();expect((await store.get(saved.id))?.uploadState?.deliveries[0]?.status).toBe('uncertain');
});

it('retains a dedup claim when Discord succeeds but completion persistence fails',async()=>{
  const{store,saved,send,service}=await setup();await service.applyUploads(saved,result([],baseline));
  const original=store.update.bind(store);let rejectCompletion=true;
  vi.spyOn(store,'update').mockImplementation(async(id,patch)=>{
    if(rejectCompletion&&patch.uploadState?.deliveries.some(delivery=>delivery.status==='sent')){rejectCompletion=false;throw new Error('Disk failure');}
    return original(id,patch);
  });
  await service.applyUploads(saved,result([video(),video()]));
  await service.applyUploads(saved,result([video()]));
  expect(send).toHaveBeenCalledOnce();expect((await store.get(saved.id))?.uploadState?.deliveries[0]?.status).toBe('uncertain');
});

it('shows deleted or cross-guild destination errors without posting or consuming the video',async()=>{
  const{store,saved,send,service,client}=await setup();await service.applyUploads(saved,result([],baseline));
  client.guilds.fetch=async()=>({channels:{fetch:async()=>({guildId:'foreign-guild',isSendable:()=>true,send})}});
  await service.applyUploads(saved,result([video()]));
  expect(send).not.toHaveBeenCalled();expect((await store.get(saved.id))?.uploadState?.lastError).toContain('not sendable in this server');
  expect((await store.get(saved.id))?.uploadState?.seen).toEqual([]);
});

it('preserves the baseline on provider errors and does not backfill filtered titles',async()=>{
  const{store,saved,send,service}=await setup();await service.applyUploads(saved,result([],baseline));
  await service.applyUploads(saved,{kind:'error',error:'YouTube quotaExceeded'});
  expect((await store.get(saved.id))?.uploadState?.baselineAt).toBe(baseline);
  await service.applyUploads(saved,result([video('filtered','Other video')]));
  await store.update(saved.id,{uploads:{...saved.uploads!,titleFilter:undefined}});
  await service.applyUploads(saved,result([video('filtered','Other video'),video('next')]));
  expect(send).toHaveBeenCalledOnce();
  expect((await store.get(saved.id))?.uploadState?.lastError).toBeUndefined();
});

it('re-enabling or moving the upload channel establishes a new baseline',async()=>{
  const{store,saved,send,service}=await setup();await service.applyUploads(saved,result([],baseline));
  await store.update(saved.id,{uploads:{...saved.uploads!,enabled:false}});
  await service.applyUploads(saved,result([video()]));expect(send).not.toHaveBeenCalled();
  await store.update(saved.id,{uploads:saved.uploads});await service.applyUploads(saved,result([video()]));
  expect(send).not.toHaveBeenCalled();
  await store.update(saved.id,{uploads:{...saved.uploads!,channelId:'different'}});
  await service.applyUploads(saved,result([video('another')]));expect(send).not.toHaveBeenCalled();
});

it('keeps upload baselines separate between guilds and supports upload-only monitor passes',async()=>{
  const{store,saved,send,service}=await setup();const other=await store.add(record('creator-b','guild-b'));
  await service.applyUploads(saved,result([],baseline));
  const checkMany=vi.fn();const checkUploads=vi.fn(async()=>new Map([[saved.id,result([video()])],[other.id,result([video()])]]));
  const monitor=new StreamMonitor(store,{youtube:{checkMany,checkUploads}} as never,service,new Logger('error'),60);
  await monitor.check();expect(checkMany).not.toHaveBeenCalled();expect(checkUploads).toHaveBeenCalledOnce();
  expect(send).toHaveBeenCalledOnce();expect((await store.get(other.id))?.uploadState?.deliveries).toEqual([]);
});

it('preserves legacy streamer data with uploads disabled by default',async()=>{
  const{file}=await setup();const legacy=record();delete legacy.uploads;
  await writeFile(file,JSON.stringify({version:1,streamers:[legacy]}));
  const migrated=new JsonStore(file);await migrated.init();
  expect((await migrated.get(legacy.id))?.uploads).toBeUndefined();
  expect((await migrated.get(legacy.id))?.alertChannelId).toBe('live-channel');
});

it('rejects client attempts to overwrite upload dedup or delivery state',async()=>{
  const{store,saved}=await setup();
  const dashboard=new DashboardStreams(store,{} as never,{} as never,{withLock:async(fn:()=>unknown)=>fn()} as never);
  await expect(dashboard.update({id:saved.guildId} as never,saved.id,{uploadState:{seen:[]}})).rejects.toThrow('Unknown stream setting');
  await expect(dashboard.update({id:saved.guildId} as never,saved.id,{uploads:{enabled:true,accessToken:'private'}})).rejects.toThrow('Unknown upload setting');
});

it('exposes honest provider capability without secrets',async()=>{
  const{store,saved}=await setup();await store.update(saved.id,{uploads:{...saved.uploads!,enabled:false},platform:'tiktok',username:'creator'});
  const dashboard=new DashboardStreams(store,{tiktok:{isConfigured:()=>true}} as never,{} as never,{} as never);
  expect((await dashboard.list(saved.guildId))[0]).toMatchObject({liveCapability:{available:true,reason:expect.stringContaining('unofficial')},uploadsCapability:{available:false,reason:expect.stringContaining('OAuth')}});
});
