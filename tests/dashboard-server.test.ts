import { afterEach, expect, it, vi } from 'vitest';
import type { Client } from 'discord.js';
import { DashboardServer, requireGuildManager, clientAddress } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';
import { setTimeout as delay } from 'node:timers/promises';
import { request as httpRequest } from 'node:http';

const running: DashboardServer[] = [];
it('serves only the authorized guild streamer statistics and rejects revoked managers', async () => {
  const guildId='123456789012345678';
  const sessions=new SessionStore(); const sessionId=sessions.create({id:'u',username:'manager',avatar:null},'token',3600);
  let allowed=true;
  const guild={id:guildId,members:{fetch:async()=>({permissions:{has:()=>allowed}})},roles:{fetch:async()=>undefined}};
  const snapshot=vi.fn(async(id:string)=>({guild:id,leaderboards:{'7d':[], '30d':[], all:[]},retentionDays:90,updatedAt:null}));
  const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:async()=>({})};
  const server=new DashboardServer({client:{isReady:()=>true,guilds:{cache:new Map([[guildId,guild]])}} as unknown as Client,
    config:{discordClientId:'123',discordToken:'unused',dataDir:'.',logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:'http://localhost:3000'},
    logger:new Logger('error'),community:module,moderation:module,sessions,streams:{} as never,streamStats:{snapshot},publicDir:'.'});
  running.push(server);const port=await server.start(0,'127.0.0.1');
  const headers={Cookie:`dashboard_session=${sessionId}`};
  const response=await fetch(`http://127.0.0.1:${port}/api/guilds/${guildId}/stream-stats`,{headers});
  expect(response.status).toBe(200);expect(await response.json()).toMatchObject({guild:guildId});
  expect(snapshot).toHaveBeenCalledExactlyOnceWith(guildId);
  const other=await fetch(`http://127.0.0.1:${port}/api/guilds/999999999999999999/stream-stats`,{headers});
  expect(other.status).toBe(404);
  allowed=false;
  const denied=await fetch(`http://127.0.0.1:${port}/api/guilds/${guildId}/stream-stats`,{headers});
  expect(denied.status).toBe(403);expect(snapshot).toHaveBeenCalledOnce();
});
it('trusts only the immediate proxy hop when explicitly configured',()=>{
  expect(clientAddress('127.0.0.1','203.0.113.4',false)).toBe('127.0.0.1');
  expect(clientAddress('127.0.0.1','spoofed, 203.0.113.4',true)).toBe('203.0.113.4');
  expect(clientAddress('127.0.0.1','not-an-ip',true)).toBe('127.0.0.1');
});
afterEach(async () => { await Promise.all(running.splice(0).map(server => server.stop())); });
it('rejects anonymous requests before reading any guild data', async () => {
  let reads = 0;
  const module = {getConfig:async()=>{reads++;return{};},snapshot:async()=>({}),updateConfig:async()=>({})};
  const server = new DashboardServer({client:{isReady:()=>false} as Client,config:{discordClientId:'123',discordToken:'unused',dataDir:'.',logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:'http://localhost:3000'},logger:new Logger('error'),community:module,moderation:module,sessions:new SessionStore(),streams:{} as never,publicDir:'.'});
  running.push(server); const port = await server.start(0,'127.0.0.1');
  const response = await fetch(`http://127.0.0.1:${port}/api/guilds/123`);
  expect(response.status).toBe(401); expect(reads).toBe(0);
});

it('rechecks live guild membership and denies revoked permissions', async () => {
  const fetch = vi.fn(async () => ({permissions:{has:()=>false}}));
  const guild = {members:{fetch},roles:{fetch:async()=>undefined}};
  const client = {guilds:{cache:new Map([['guild',guild]])}} as unknown as Client;
  await expect(requireGuildManager(client,'guild','user')).rejects.toThrow('Manage Server');
  expect(fetch).toHaveBeenCalledWith({user:'user',force:true});
  await expect(requireGuildManager(client,'other-guild','user')).rejects.toThrow('not installed');
});

it('rejects cross-origin and missing-CSRF writes before reaching server settings', async () => {
  const sessions = new SessionStore();
  const id=sessions.create({id:'u',username:'tester',avatar:null},'fake-token',3600);
  let writes=0;
  const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:async()=>{writes++;return{};}};
  const server=new DashboardServer({client:{isReady:()=>false} as Client,config:{discordClientId:'123',discordToken:'unused',dataDir:'.',logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:'http://localhost:3000'},logger:new Logger('error'),community:module,moderation:module,sessions,streams:{} as never,publicDir:'.'});
  running.push(server);const port=await server.start(0,'127.0.0.1');
  for(const headers of [{Origin:'http://localhost:3000'}, {Origin:'https://untrusted.example','X-CSRF-Token':sessions.get(id)!.csrfToken}]) {
    const response=await fetch(`http://127.0.0.1:${port}/api/guilds/123456789012345678/community`,{method:'PATCH',headers:{...headers,Cookie:`dashboard_session=${id}`,'Content-Type':'application/json'},body:'{}'});
    expect(response.status).toBe(403);
  }
  expect(writes).toBe(0);
});

it('keeps readiness false and blocks guild access until startup reconciliation finishes', async () => {
  const sessions = new SessionStore(); const id = sessions.create({id:'u',username:'tester',avatar:null},'token',3600);
  const fetchGuilds = vi.fn(async () => []);
  const module = {getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:async()=>({})};
  const server = new DashboardServer({ client:{isReady:()=>true} as Client, isOperational:()=>false, config:{discordClientId:'123',discordToken:'unused',dataDir:'.',logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:'http://localhost:3000'}, logger:new Logger('error'), community:module,moderation:module,sessions,streams:{} as never,publicDir:'.', oauth:{guilds:fetchGuilds} as never });
  running.push(server); const port = await server.start(0,'127.0.0.1');
  const ready = await fetch(`http://127.0.0.1:${port}/readyz`);
  expect(ready.status).toBe(503);
  const guilds = await fetch(`http://127.0.0.1:${port}/api/guilds`, {headers:{Cookie:`dashboard_session=${id}`}});
  expect(guilds.status).toBe(503); expect(fetchGuilds).not.toHaveBeenCalled();
});

it('drains token revocation work after logout before reporting shutdown complete', async () => {
  const sessions=new SessionStore(); const id=sessions.create({id:'u',username:'tester',avatar:null},'token',3600);
  let finish!:()=>void; const pending=new Promise<void>(resolve=>{finish=resolve;});
  const revoke=vi.fn(()=>pending);
  const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:async()=>({})};
  const server=new DashboardServer({client:{isReady:()=>false} as Client,config:{discordClientId:'123',discordToken:'unused',dataDir:'.',logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:'http://localhost:3000'},logger:new Logger('error'),community:module,moderation:module,sessions,streams:{} as never,publicDir:'.',oauth:{revoke} as never});
  running.push(server);const port=await server.start(0,'127.0.0.1');
  const response=await fetch(`http://127.0.0.1:${port}/auth/logout`,{method:'POST',headers:{Origin:'http://localhost:3000','X-CSRF-Token':sessions.get(id)!.csrfToken,Cookie:`dashboard_session=${id}`}});
  expect(response.status).toBe(200); expect(revoke).toHaveBeenCalledOnce();
  const stopping=server.stop();
  try { expect(await Promise.race([stopping.then(()=>true),delay(20,false)])).toBe(false); }
  finally { finish(); await stopping; }
});

it('does not extend inactivity expiry through public status polling', async () => {
  const sessions=new SessionStore(); const id=sessions.create({id:'u',username:'tester',avatar:null},'token',86400,0);
  const clock=vi.spyOn(Date,'now').mockReturnValue(29*60_000);
  const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:async()=>({})};
  const server=new DashboardServer({client:{isReady:()=>false} as Client,config:{discordClientId:'123',discordToken:'unused',dataDir:'.',logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:'http://localhost:3000'},logger:new Logger('error'),community:module,moderation:module,sessions,streams:{} as never,publicDir:'.'});
  running.push(server); const port=await server.start(0,'127.0.0.1');
  try { await fetch(`http://127.0.0.1:${port}/api/status`,{headers:{Cookie:`dashboard_session=${id}`}}); expect(sessions.get(id,31*60_000)).toBeUndefined(); }
  finally { clock.mockRestore(); }
});

it('returns a bounded 503 when an authenticated request exceeds its deadline', async () => {
  const sessions=new SessionStore();const id=sessions.create({id:'u',username:'tester',avatar:null},'token',3600);
  const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:async()=>({})};
  const server=new DashboardServer({client:{isReady:()=>true,guilds:{cache:new Map()}} as unknown as Client,requestTimeoutMs:10,config:{discordClientId:'123',discordToken:'unused',dataDir:'.',logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:'http://localhost:3000'},logger:new Logger('error'),community:module,moderation:module,sessions,streams:{} as never,publicDir:'.',oauth:{guilds:()=>delay(80,[])} as never});
  running.push(server);const port=await server.start(0,'127.0.0.1');
  const response=await fetch(`http://127.0.0.1:${port}/api/guilds`,{headers:{Cookie:`dashboard_session=${id}`}});
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({error:expect.stringContaining('timed out')});
});

it('rechecks permission after a delayed mutation body before committing settings', async () => {
  const sessions=new SessionStore();const id=sessions.create({id:'u',username:'tester',avatar:null},'token',3600);
  let allowed=true;const writes=vi.fn(async()=>({}));
  const guild={id:'123456789012345678',members:{fetch:async()=>({permissions:{has:()=>allowed}})},roles:{fetch:async()=>undefined}};
  const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:writes};
  const server=new DashboardServer({client:{isReady:()=>true,guilds:{cache:new Map([[guild.id,guild]])}} as unknown as Client,config:{discordClientId:'123',discordToken:'unused',dataDir:'.',logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:'http://localhost:3000'},logger:new Logger('error'),community:module,moderation:module,sessions,streams:{} as never,publicDir:'.'});
  running.push(server);const port=await server.start(0,'127.0.0.1');
  const response=new Promise<number>((resolve,reject)=>{
    const req=httpRequest({host:'127.0.0.1',port,path:`/api/guilds/${guild.id}/community`,method:'PATCH',headers:{Origin:'http://localhost:3000','X-CSRF-Token':sessions.get(id)!.csrfToken,Cookie:`dashboard_session=${id}`,'Content-Type':'application/json'}},res=>{res.resume();resolve(res.statusCode!);});
    req.on('error',reject);req.flushHeaders();
    void delay(25).then(()=>{allowed=false;req.end('{}');});
  });
  expect(await response).toBe(403);expect(writes).not.toHaveBeenCalled();
});

it('keeps readiness false during a Gateway disconnect even after initialization', async () => {
  const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:async()=>({})};
  const server=new DashboardServer({client:{isReady:()=>false} as Client,isOperational:()=>true,config:{discordClientId:'123',discordToken:'unused',dataDir:'.',logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:'http://localhost:3000'},logger:new Logger('error'),community:module,moderation:module,streams:{} as never,publicDir:'.'});
  running.push(server);const port=await server.start(0,'127.0.0.1');
  expect((await fetch(`http://127.0.0.1:${port}/readyz`)).status).toBe(503);
});

it('reports a drain timeout rather than claiming unfinished background work is flushed', async () => {
  const sessions=new SessionStore();const id=sessions.create({id:'u',username:'tester',avatar:null},'token',3600);
  let finish!:()=>void;const pending=new Promise<void>(resolve=>{finish=resolve;});
  const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:async()=>({})};
  const server=new DashboardServer({client:{isReady:()=>false} as Client,drainTimeoutMs:10,config:{discordClientId:'123',discordToken:'unused',dataDir:'.',logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:'http://localhost:3000'},logger:new Logger('error'),community:module,moderation:module,sessions,streams:{} as never,publicDir:'.',oauth:{revoke:()=>pending} as never});
  const port=await server.start(0,'127.0.0.1');
  try {
    await fetch(`http://127.0.0.1:${port}/auth/logout`,{method:'POST',headers:{Origin:'http://localhost:3000','X-CSRF-Token':sessions.get(id)!.csrfToken,Cookie:`dashboard_session=${id}`}});
    await expect(server.stop()).rejects.toThrow('1 unfinished operation');
  } finally {finish();await server.stop().catch(()=>undefined);}
});
it('authorizes creator mutations using the selected server and rejects revoked managers', async () => {
  const sessions=new SessionStore();const id=sessions.create({id:'u',username:'tester',avatar:null},'token',3600);
  let allowed=true;const add=vi.fn(async()=>({id:'creator',name:'One Creator'}));
  const guild={id:'123456789012345678',members:{fetch:async()=>({permissions:{has:()=>allowed}})},roles:{fetch:async()=>undefined}};
  const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:async()=>({})};
  const server=new DashboardServer({client:{isReady:()=>true,guilds:{cache:new Map([[guild.id,guild]])}} as unknown as Client,config:{discordClientId:'123',discordToken:'unused',dataDir:'.',logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:'http://localhost:3000'},logger:new Logger('error'),community:module,moderation:module,sessions,streams:{} as never,creators:{list:async()=>[],add,update:vi.fn(),remove:vi.fn()},publicDir:'.'});
  running.push(server);const port=await server.start(0,'127.0.0.1');
  const request={method:'POST',headers:{Origin:'http://localhost:3000','X-CSRF-Token':sessions.get(id)!.csrfToken,Cookie:`dashboard_session=${id}`,'Content-Type':'application/json'},body:JSON.stringify({name:'One Creator'})};
  expect((await fetch(`http://127.0.0.1:${port}/api/guilds/${guild.id}/creators`,request)).status).toBe(201);
  expect(add).toHaveBeenCalledExactlyOnceWith(guild,{name:'One Creator'});
  allowed=false;
  expect((await fetch(`http://127.0.0.1:${port}/api/guilds/${guild.id}/creators`,request)).status).toBe(403);
  expect((await fetch(`http://127.0.0.1:${port}/api/guilds/999999999999999999/creators`,request)).status).toBe(404);
  expect(add).toHaveBeenCalledTimes(1);
});
