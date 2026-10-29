import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Collection, PermissionsBitField, type Client } from 'discord.js';
import { afterEach, expect, it, vi } from 'vitest';
import { DashboardServer } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { ControlStore, defaultAccess } from '../src/control/store.js';
import { AccessService } from '../src/control/access.js';
import { Logger } from '../src/logger.js';
import { PublishingError } from '../src/control/publishing.js';
const servers:DashboardServer[]=[],dirs:string[]=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(s=>s.stop()));await Promise.all(dirs.splice(0).map(d=>rm(d,{recursive:true,force:true})));});
const guildId='123456789012345678',roleId='223456789012345678';
async function setup(){
  const dir=await mkdtemp(path.join(os.tmpdir(),'cyro-access-http-'));dirs.push(dir);
  const store=new ControlStore(dir);await store.init();await store.mutate(guildId,g=>g.access.dashboardRoleIds=[roleId]);
  const access=new AccessService(store);const sessions=new SessionStore();const sid=sessions.create({id:'delegate',username:'test',avatar:null},'private',3600);
  const member:any={id:'delegate',pending:false,permissions:new PermissionsBitField(),roles:{cache:new Collection([[roleId,{id:roleId}]])}};
  const guild:any={id:guildId,ownerId:'owner',members:{fetch:vi.fn(async()=>member)},roles:{fetch:vi.fn(),cache:new Collection([[roleId,{id:roleId,managed:false}]])},fetch:vi.fn(async()=>guild)};member.guild=guild;
  const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:vi.fn(async()=>({}))};
  const publishing={publish:vi.fn(async()=>({id:'posted'})),list:()=>[],endPoll:vi.fn(async()=>({ok:true}))};
  const server=new DashboardServer({client:{isReady:()=>true,guilds:{cache:new Collection([[guildId,guild]])}} as unknown as Client,access,publishing:publishing as never,sessions,oauth:{guilds:async()=>[{id:guildId,name:'Test',permissions:'0',owner:false}]} as never,config:{discordClientId:'1',discordToken:'',dataDir:dir,logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:'http://localhost:3000'},logger:new Logger('error'),community:module,moderation:module,streams:{list:async()=>[]} as never,publicDir:'public'});
  servers.push(server);const port=await server.start(0,'127.0.0.1');const base=`http://127.0.0.1:${port}`;
  const headers={Cookie:`dashboard_session=${sid}`,Origin:'http://localhost:3000','X-CSRF-Token':sessions.get(sid)!.csrfToken,'Content-Type':'application/json'};
  return {base,headers,member,guild,module,store,publishing};
}
it('lists delegated servers without Manage Server and immediately removes them when the role is revoked',async()=>{
  const f=await setup();let response=await fetch(f.base+'/api/guilds',{headers:f.headers});expect((await response.json()).guilds).toHaveLength(1);
  f.member.roles.cache.clear();response=await fetch(f.base+'/api/guilds',{headers:f.headers});expect((await response.json()).guilds).toHaveLength(0);
  expect((await fetch(`${f.base}/api/guilds/${guildId}/community`,{method:'PATCH',headers:f.headers,body:'{}'})).status).toBe(403);expect(f.module.updateConfig).not.toHaveBeenCalled();
});
it('rejects delegated access edits, CSRF forgery and cross-guild publishing before side effects',async()=>{
  const f=await setup();const base=`${f.base}/api/guilds/${guildId}`;
  expect((await fetch(base+'/access',{method:'PATCH',headers:f.headers,body:JSON.stringify(defaultAccess())})).status).toBe(403);
  expect((await fetch(base+'/messages',{method:'POST',headers:{...f.headers,'X-CSRF-Token':'wrong'},body:'{}'})).status).toBe(403);
  expect((await fetch(`${f.base}/api/guilds/999999999999999999/messages`,{method:'POST',headers:f.headers,body:'{}'})).status).toBe(404);
  expect(f.publishing.publish).not.toHaveBeenCalled();
  expect((await fetch(base+'/messages',{method:'POST',headers:f.headers,body:'{}'})).status).toBe(201);expect(f.publishing.publish).toHaveBeenCalledOnce();
});
it('lets the owner disable manager access without locking the owner out',async()=>{
  const f=await setup();f.guild.ownerId='delegate';const config={...defaultAccess(),managerAccess:false};
  expect((await fetch(`${f.base}/api/guilds/${guildId}/access`,{method:'PATCH',headers:f.headers,body:JSON.stringify(config)})).status).toBe(200);
  f.member.roles.cache.clear();expect((await (await fetch(f.base+'/api/guilds',{headers:f.headers})).json()).guilds).toHaveLength(1);
  expect(f.store.get(guildId).access.managerAccess).toBe(false);
});

it('preserves definite and unknown publishing outcomes without returning internal errors',async()=>{
  const f=await setup();const url=`${f.base}/api/guilds/${guildId}/messages`;
  f.publishing.publish.mockRejectedValueOnce(new PublishingError('not_sent',new Error('Add a message or embed before publishing.')));
  let response=await fetch(url,{method:'POST',headers:f.headers,body:'{}'});
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({publishOutcome:'not_sent',i18n:{key:'Add a message or embed before publishing.'}});
  f.publishing.publish.mockRejectedValueOnce(new PublishingError('unknown',new Error('Private provider diagnostic')));
  response=await fetch(url,{method:'POST',headers:f.headers,body:'{}'});
  expect(response.status).toBe(409);
  const body=await response.json();expect(body.publishOutcome).toBe('unknown');
  expect(JSON.stringify(body)).not.toContain('Private provider diagnostic');
  expect(Object.keys(body).sort()).toEqual(['error','i18n','publishOutcome']);
});
