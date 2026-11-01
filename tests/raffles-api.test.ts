import { afterEach, expect, it, vi } from 'vitest';
import { DashboardServer } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';
const guildId='123456789012345678',otherId='223456789012345678',userId='323456789012345678',origin='https://cyro.example';
const servers:DashboardServer[]=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(s=>s.stop()));});
async function fixture(){
  const sessions=new SessionStore(),sid=sessions.create({id:userId,username:'staff',avatar:null},'unused',3600);
  let allowed=true,ready=true;
  const guild={id:guildId},other={id:otherId},cache=new Map([[guildId,guild],[otherId,other]]);
  const access={dashboard:vi.fn(async()=>{if(!allowed)throw Error('Revoked');})};
  const feature={snapshot:vi.fn((id:string)=>({items:[],scope:id})),change:vi.fn(async(g:any,actor:string,input:unknown,auth:()=>Promise<void>)=>{await auth();return {items:[],scope:g.id,actor};})};
  const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:async()=>({})};
  const server=new DashboardServer({client:{isReady:()=>ready,guilds:{cache}} as never,config:{discordClientId:'1',discordToken:'',dataDir:'.',logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:origin},logger:new Logger('error'),community:module,moderation:module,streams:{list:async()=>[]} as never,access:access as never,raffles:feature as never,sessions,publicDir:'public'});
  servers.push(server);const port=await server.start(0,'127.0.0.1');
  return {base:`http://127.0.0.1:${port}`,guild,cache,feature,sessions,sid,headers:{Cookie:`dashboard_session=${sid}`,Origin:origin,'X-CSRF-Token':sessions.peek(sid)!.csrfToken,'Content-Type':'application/json'},revoke:()=>{allowed=false;},disconnect:()=>{ready=false;}};
}
it('requires sign-in and current dashboard authority for each guild',async()=>{
  const f=await fixture();for(const id of [guildId,otherId]){const r=await fetch(`${f.base}/api/guilds/${id}/raffles`,{headers:f.headers});expect(r.status).toBe(200);expect(await r.json()).toMatchObject({scope:id});}
  const url=`${f.base}/api/guilds/${guildId}/raffles`;expect((await fetch(url)).status).toBe(401);f.revoke();expect((await fetch(url,{headers:f.headers})).status).toBe(403);
});
it('passes the authenticated actor and protects publication and spinning with CSRF',async()=>{
  const f=await fixture(),url=`${f.base}/api/guilds/${guildId}/raffles`,input={action:'spin',actorId:'forged'},request={method:'POST',headers:f.headers,body:JSON.stringify(input)};
  expect((await fetch(url,{...request,headers:{...f.headers,Origin:'https://other.example'}})).status).toBe(403);
  expect((await fetch(url,{...request,headers:{...f.headers,'X-CSRF-Token':''}})).status).toBe(403);expect(f.feature.change).not.toHaveBeenCalled();
  expect((await fetch(url,request)).status).toBe(200);expect(f.feature.change).toHaveBeenCalledExactlyOnceWith(f.guild,userId,input,expect.any(Function));
});
it.each(['roles','session','connection','guild'])('rechecks %s after a queued or rendered publication',async reason=>{
  const f=await fixture(),commit=vi.fn();f.feature.change.mockImplementation(async(g,actor,input,auth)=>{
    if(reason==='roles')f.revoke();if(reason==='session')f.sessions.delete(f.sid);if(reason==='connection')f.disconnect();if(reason==='guild')f.cache.delete(guildId);
    await auth();commit();return {items:[],scope:g.id,actor};
  });
  const r=await fetch(`${f.base}/api/guilds/${guildId}/raffles`,{method:'POST',headers:f.headers,body:JSON.stringify({action:'create'})});
  expect(r.status).toBe(({roles:403,session:401,connection:503,guild:404} as any)[reason]);expect(commit).not.toHaveBeenCalled();
});
