import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync, inflateRawSync } from 'node:zlib';
import { ModerationService } from '../src/moderation/index.js';
import { TicketTranscriptArchive, renderTranscript } from '../src/moderation/transcript.js';
import { transcriptDownload, transcriptPost } from '../src/moderation/transcript-view.js';
import { DashboardServer } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';
const guildId='123456789012345678',userId='223456789012345678',logId='323456789012345678',otherId='423456789012345678';
const roots:string[]=[],servers:DashboardServer[]=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(s=>s.stop()));await Promise.all(roots.splice(0).map(p=>rm(p,{recursive:true,force:true})));});
async function fixture(){
  const directory=await mkdtemp(path.join(tmpdir(),'transcript-view-'));roots.push(directory);
  let allowed=true,memberPresent=true,ready=true;
  const member={id:userId},guild:any={id:guildId,preferredLocale:'en-US',roles:{fetch:vi.fn(async()=>undefined)},members:{fetch:vi.fn(async()=>{if(!memberPresent)throw Error('Not a member');return member;})}};
  const channel={id:logId,guild,permissionsFor:vi.fn(()=>({has:()=>allowed}))};guild.channels={fetch:vi.fn(async()=>channel)};
  const client:any={isReady:()=>ready,guilds:{cache:new Map([[guildId,guild]])}};
  const service=new ModerationService(client,directory,new Logger('error'));await service.init();
  const archive=new TicketTranscriptArchive(path.join(directory,'ticket-transcripts'));
  const saved=await archive.save(guildId,'saved-op','Support conversation',{entries:[{author:'Member',createdAt:new Date(0).toISOString(),content:'Private conversation marker',attachments:[]}],newestMessageId:null,sourceSha256:'snapshot'});
  await (service as any).store.update(guildId,(data:any)=>data.tickets.push({id:'ticket-id',ownerId:userId,channelId:'523456789012345678',status:'closed',createdAt:new Date(0).toISOString(),claimedBy:null,claimedAt:null,closedBy:userId,closedAt:new Date(0).toISOString(),transcript:{...saved.receipt,channelId:logId,messageId:'623456789012345678'}}));
  const sessions=new SessionStore(),sid=sessions.create({id:userId,username:'member',avatar:null},'test-only',3600);
  const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:async()=>({})};
  const oauth={exchange:vi.fn(async()=>({access_token:'test-only',expires_in:3600})),user:async()=>({id:userId,username:'member',avatar:null}),guilds:async()=>[],revoke:async()=>undefined};
  const server=new DashboardServer({client,config:{discordClientId:'1',discordClientSecret:'test-only',dashboardUrl:'https://cyro.example'} as never,logger:new Logger('error'),community:module,moderation:service,streams:{list:async()=>[]} as never,publicDir:'public',sessions,oauth});
  servers.push(server);const port=await server.start(0,'127.0.0.1');
  return {directory,archive,saved,service,guild,channel,sessions,sid,client,base:`http://127.0.0.1:${port}`,route:`/transcripts/${guildId}/ticket-id`,headers:{Cookie:`dashboard_session=${sid}`},revoke:()=>{allowed=false;},leave:()=>{memberPresent=false;},offline:()=>{ready=false;}};
}
it('redirects anonymous readers through a browser-bound login and returns to the exact transcript',async()=>{
  const f=await fixture();const read=await fetch(f.base+f.route,{redirect:'manual'});expect(read.status).toBe(302);
  const login=await fetch(f.base+read.headers.get('location'),{redirect:'manual'});const location=new URL(login.headers.get('location')!);const state=location.searchParams.get('state')!;
  const callback=await fetch(`${f.base}/auth/callback?state=${state}&code=fixture`,{headers:{Cookie:`dashboard_oauth=${state}`},redirect:'manual'});
  expect(callback.headers.get('location')).toBe(f.route);
});
it.each(['https://evil.example/transcripts/'+guildId+'/ticket-id','//evil.example/connections','javascript:alert(1)','https://[invalid'])('does not accept unsafe login return destinations: %s',async requested=>{
  const f=await fixture(),r=await fetch(`${f.base}/auth/login?returnTo=${encodeURIComponent(requested)}`,{redirect:'manual'});
  expect(r.status).toBe(302);const state=new URL(r.headers.get('location')!).searchParams.get('state')!;
  expect(f.sessions.consumeLoginDestination(state,state)).toBe('/');
});
it('renders HTML with no-cache and a script-free sandbox for channel readers without requiring editor access',async()=>{
  const f=await fixture(),r=await fetch(f.base+f.route,{headers:f.headers});expect(r.status).toBe(200);
  expect(r.headers.get('content-type')).toContain('text/html');expect(r.headers.get('cache-control')).toBe('no-store');
  expect(r.headers.get('content-security-policy')).toContain("default-src 'none'");expect(r.headers.get('content-security-policy')).toContain('sandbox');
  expect(r.headers.get('x-robots-tag')).toContain('noindex');const html=await r.text();expect(html).toContain('Private conversation marker');expect(html).toContain('Download transcript');
  expect(f.guild.members.fetch).toHaveBeenCalledWith({user:userId,force:true});expect(f.guild.channels.fetch).toHaveBeenCalledWith(logId,{force:true});
});
it.each(['revoked','departed','foreign-channel','other-guild','missing-file','tampered','revoked-during-read','session-expired','offline'])('denies %s without leaking conversation content',async reason=>{
  const f=await fixture();let route=f.route;
  if(reason==='revoked')f.revoke();if(reason==='departed')f.leave();if(reason==='foreign-channel')f.guild.channels.fetch.mockResolvedValue({...f.channel,guild:{id:otherId}});
  if(reason==='other-guild')route=route.replace(guildId,otherId);
  if(reason==='missing-file')await rm(path.join(f.directory,'ticket-transcripts',guildId,f.saved.receipt.filename));
  if(reason==='tampered')await writeFile(path.join(f.directory,'ticket-transcripts',guildId,f.saved.receipt.filename),'changed');
  if(reason==='offline')f.offline();
  if(['revoked-during-read','session-expired'].includes(reason)) {const a=(f.service as any).transcripts,read=a.read.bind(a);a.read=async(...args:any[])=>{const result=await read(...args);if(reason==='session-expired')f.sessions.delete(f.sid);else f.revoke();return result;};}
  const r=await fetch(f.base+route,{headers:f.headers,redirect:'manual'});expect(r.status).toBeGreaterThanOrEqual(400);expect(await r.text()).not.toContain('Private conversation marker');
});
it('protects downloads with the same permissions and produces a portable HTML ZIP',async()=>{
  const f=await fixture(),r=await fetch(f.base+f.route+'?download=1',{headers:f.headers});expect(r.status).toBe(200);expect(r.headers.get('content-type')).toBe('application/zip');
  const data=Buffer.from(await r.arrayBuffer()),size=data.readUInt32LE(18),offset=30+data.readUInt16LE(26);expect(inflateRawSync(data.subarray(offset,offset+size)).toString()).toContain('Private conversation marker');
  f.revoke();expect((await fetch(f.base+f.route+'?download=1',{headers:f.headers})).status).toBe(403);
});
it('opens legacy compressed HTML and packages it as HTML rather than nesting gzip',async()=>{
  const html=Buffer.from('<!doctype html><body>Saved legacy messages</body>');const zip=transcriptDownload(gzipSync(html),{filename:'ticket-legacy.html.gz'});
  expect(zip.filename).toBe('ticket-legacy.zip');const nameLength=zip.data.readUInt16LE(26);expect(zip.data.subarray(30,30+nameLength).toString()).toBe('ticket-legacy.html');
  expect(inflateRawSync(zip.data.subarray(30+nameLength,30+nameLength+zip.data.readUInt32LE(18)))).toEqual(html);
});
it('escapes message text, author names and attachment labels without executing or embedding remote content',()=>{
  const html=renderTranscript('<img src=x onerror=alert(1)>',[{id:'123',author:'<script>bad</script>',createdAt:'invalid',content:'<script>alert(1)</script>',attachments:['javascript:alert(1)','https://example.com/%3Cimg%3E.png']}]);
  expect(html).not.toContain('<script>');expect(html).not.toContain('<img');expect(html).not.toContain('javascript:');expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');expect(html).toContain('&lt;img&gt;.png');
});
it('posts a compact embed with a reader button and ZIP, with a durable recovery marker and no pings',()=>{
  const download=transcriptDownload(Buffer.from('<body>Message</body>'),{filename:'ticket-operation.html'});
  const payload=transcriptPost(guildId,{id:'ticket-id',ownerId:userId} as never,{id:'operation',actorId:userId,transcript:{messageCount:1,savedAt:new Date(0).toISOString()}} as never,download,'https://cyro.example');
  expect(payload.files[0]!.name).toBe('ticket-operation.zip');expect(payload.embeds[0]!.toJSON().footer?.text).toBe('Ticket export operation');
  expect(payload.components[0]!.toJSON().components[0]).toMatchObject({label:'Open transcript',url:`https://cyro.example/transcripts/${guildId}/ticket-id`});expect(payload.allowedMentions.parse).toEqual([]);expect(payload).not.toHaveProperty('content');
});
