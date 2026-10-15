import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Collection, PermissionFlagsBits, PermissionsBitField, type Client, type Guild } from 'discord.js';
import { afterEach, expect, it } from 'vitest';
import { ControlStore, defaultAccess } from '../src/control/store.js';
import { AccessService } from '../src/control/access.js';
import { parseLanguageSettings } from '../src/control/language.js';
import { DashboardServer } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';

const A='123456789012345678', B='223456789012345678', U='323456789012345678';
const folders:string[]=[], servers:DashboardServer[]=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(s=>s.stop()));await Promise.all(folders.splice(0).map(f=>rm(f,{recursive:true,force:true})));});
async function fixture() {
  const dir=await mkdtemp(path.join(os.tmpdir(),'cyro-language-'));folders.push(dir);
  const store=new ControlStore(dir);await store.init();const access=new AccessService(store);
  let allowed=true;
  const guild:any={id:A,name:'Server',ownerId:'owner',roles:{cache:new Collection(),fetch:async()=>undefined},channels:{fetch:async()=>new Map()}};
  guild.members={cache:new Map(),fetch:async()=>({id:U,guild,pending:false,permissions:new PermissionsBitField(allowed?PermissionFlagsBits.ManageGuild:0n),roles:{cache:new Collection()}})};
  return {dir,store,access,guild:guild as Guild,revoke:()=>{allowed=false;}};
}
it('migrates legacy settings to English and persists isolated server language choices',async()=>{
  const f=await fixture();
  await writeFile(path.join(f.dir,'control.json'),JSON.stringify({version:1,guilds:{[A]:{access:defaultAccess(),posts:[]}}}));
  const legacy=new ControlStore(f.dir);await legacy.init();expect(legacy.get(A).locale).toBe('en');
  await f.access.updateLanguage(f.guild,U,{locale:'fr'});
  expect(f.access.language(B).locale).toBe('en');
  const restored=new ControlStore(f.dir);await restored.init();expect(restored.get(A).locale).toBe('fr');
  expect(restored.get(A).access).toEqual(defaultAccess());
  expect(JSON.parse(await readFile(path.join(f.dir,'control.json'),'utf8')).version).toBe(1);
});
it('rejects unsupported locales, extra fields, and unauthorized updates',async()=>{
  for(const input of [null,[],{}, {locale:'ja'}, {locale:'fr',guildId:B}, {locale:7}])expect(()=>parseLanguageSettings(input)).toThrow();
  for(const locale of ['en','fr','es','de','pt','auto'])expect(parseLanguageSettings({locale})).toEqual({locale});
  const f=await fixture();f.revoke();await expect(f.access.updateLanguage(f.guild,U,{locale:'es'})).rejects.toThrow('not granted');
  expect(f.store.get(A).locale).toBe('en');
});
it('rechecks access after a queued write and aborts an expired request without changing settings',async()=>{
  const f=await fixture();let release!:()=>void;const blocker=new Promise<void>(resolve=>{release=resolve;});
  const first=f.store.mutate(A,async()=>{await blocker;});
  const queued=f.access.updateLanguage(f.guild,U,{locale:'fr'});f.revoke();release();await first;
  await expect(queued).rejects.toThrow('not granted');expect(f.store.get(A).locale).toBe('en');
  await expect(f.access.updateLanguage(f.guild,U,{locale:'es'},()=>{throw new Error('expired');})).rejects.toThrow('expired');
});
it('protects language HTTP writes with session, CSRF, current access and guild identity',async()=>{
  const f=await fixture();const sessions=new SessionStore();const sid=sessions.create({id:U,username:'tester',avatar:null},'unused',3600);
  const origin='https://cyro.example';const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:async()=>({})};
  const server=new DashboardServer({client:{isReady:()=>true,guilds:{cache:new Map([[A,f.guild]])}} as unknown as Client,
    config:{discordClientId:'1',discordToken:'',dataDir:f.dir,logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:origin},logger:new Logger('error'),
    community:module,moderation:module,streams:{list:async()=>[]} as never,access:f.access,sessions,publicDir:'public'});
  servers.push(server);const port=await server.start(0,'127.0.0.1');const base=`http://127.0.0.1:${port}/api/guilds/`;
  const headers={Cookie:`dashboard_session=${sid}`,Origin:origin,'X-CSRF-Token':sessions.peek(sid)!.csrfToken,'Content-Type':'application/json'};
  expect((await fetch(`${base}${A}/language`)).status).toBe(401);
  expect((await fetch(`${base}${B}/language`,{headers})).status).toBe(404);
  expect((await fetch(`${base}${A}/language`,{method:'PATCH',headers:{...headers,'X-CSRF-Token':'bad'},body:'{"locale":"fr"}'})).status).toBe(403);
  const saved=await fetch(`${base}${A}/language`,{method:'PATCH',headers,body:'{"locale":"es"}'});
  expect(saved.status).toBe(200);expect(await saved.json()).toMatchObject({locale:'es'});
  for(const locale of ['de','pt']){
    const result=await fetch(`${base}${A}/language`,{method:'PATCH',headers,body:JSON.stringify({locale})});
    expect(result.status).toBe(200);expect(await result.json()).toMatchObject({locale});
    const restored=new ControlStore(f.dir);await restored.init();expect(restored.get(A).locale).toBe(locale);expect(restored.get(B).locale).toBe('en');
  }
  expect((await fetch(`${base}${A}/language`,{method:'PATCH',headers,body:'{"locale":"ja"}'})).status).toBe(400);
  f.revoke();expect((await fetch(`${base}${A}/language`,{method:'PATCH',headers,body:'{"locale":"fr"}'})).status).toBe(403);
  expect(f.store.get(A).locale).toBe('pt');
});
