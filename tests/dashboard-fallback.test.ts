import { afterEach, expect, it, vi } from 'vitest';
import { request, Server as HttpsServer } from 'node:https';
import { readFile } from 'node:fs/promises';
import { generateKeyPairSync } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { Client } from 'discord.js';
import { DashboardServer } from '../src/dashboard/server.js';
import { fallbackTlsOptions, type DashboardFallbackConfig } from '../src/dashboard/fallback.js';
import * as fallbackHelpers from '../src/dashboard/fallback.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';

const fixtures='tests/fixtures/dashboard-fallback';
const directOrigin='https://localhost:3443';
const mainOrigin='http://localhost:3000';
const guildId='123456789012345678';
const running:DashboardServer[]=[];
const settings=():DashboardFallbackConfig=>({url:directOrigin,host:'127.0.0.1',port:0,certFile:`${fixtures}/test-server.pem`,keyFile:`${fixtures}/test-only-key.pem`});
const oauth=(username:string)=>({exchange:vi.fn(async()=>({access_token:`${username}-token`,expires_in:3600})),user:vi.fn(async()=>({id:username,username,avatar:null})),guilds:vi.fn(async()=>[]),revoke:vi.fn(async()=>{})});
afterEach(async()=>{await Promise.all(running.splice(0).map(server=>server.stop()));vi.restoreAllMocks();});

async function setup(overrides:Partial<DashboardFallbackConfig>={},injectFallback=true){
  const sessions=new SessionStore();
  const primaryId=sessions.create({id:'primary-user',username:'primary-user',avatar:null},'primary-token',3600);
  const mainOAuth=oauth('primary-user');const fallbackOAuth=oauth('fallback-user');
  const module={getConfig:vi.fn(async()=>({})),snapshot:vi.fn(async()=>({})),updateConfig:vi.fn(async()=>({saved:true}))};
  let allowed=true;
  const guild={id:guildId,members:{fetch:async()=>({permissions:{has:()=>allowed}})},roles:{fetch:async()=>undefined}};
  const tiktok={begin:vi.fn(async()=>({url:'https://www.tiktok.com'})),connections:vi.fn(async()=>[])};
  const config={discordClientId:'123',discordToken:'unused',discordClientSecret:'fake-secret',dataDir:'.',logLevel:'error' as const,autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:mainOrigin,dashboardTrustProxy:true,dashboardFallback:{...settings(),...overrides}};
  const server=new DashboardServer({client:{isReady:()=>true,guilds:{cache:new Map([[guildId,guild]])}} as unknown as Client,config,logger:new Logger('error'),community:module,moderation:module,sessions,streams:{} as never,publicDir:'public',oauth:mainOAuth,...(injectFallback?{fallbackOAuth}:{}),tiktok:tiktok as never});
  running.push(server);const primaryPort=await server.start(0,'127.0.0.1');
  return{server,primaryPort,sessions,primaryId,mainOAuth,fallbackOAuth,module,tiktok,config,revokeAccess:()=>{allowed=false;}};
}

async function direct(port:number,path:string,headers:Record<string,string>={},method='GET',body?:string):Promise<{status:number;headers:IncomingHttpHeaders;text:string;json:()=>any}>{
  const ca=await readFile(`${fixtures}/test-ca.pem`);
  return new Promise((resolve,reject)=>{
    const req=request({hostname:'127.0.0.1',port,path,method,ca,servername:'localhost',agent:false,headers:{Host:'localhost:3443',...headers}},res=>{
      let text='';res.setEncoding('utf8');res.on('data',chunk=>{text+=chunk;});res.on('end',()=>resolve({status:res.statusCode!,headers:res.headers,text,json:()=>JSON.parse(text)}));
    });req.once('error',reject);req.end(body);
  });
}
const cookie=(headers:IncomingHttpHeaders,name:string)=>headers['set-cookie']?.find(value=>value.startsWith(`${name}=`))?.split(';')[0]??'';
async function login(port:number){
  const begin=await direct(port,'/auth/login?returnTo=%2Fconnections');
  const state=new URL(begin.headers.location!).searchParams.get('state');
  const callback=await direct(port,`/auth/callback?code=example&state=${state}`,{Cookie:cookie(begin.headers,'dashboard_oauth')});
  expect(callback.status).toBe(302);
  const sessionCookie=cookie(callback.headers,'dashboard_session');
  const me=await direct(port,'/api/me',{Cookie:sessionCookie});
  return{begin,callback,sessionCookie,me,csrf:me.json().csrfToken};
}

it('serves trusted HTTPS, authenticates against its own callback, and never redirects through the primary',async()=>{
  const setupResult=await setup();const port=(await setupResult.server.startFallback())!;
  expect(setupResult.server.fallbackUrl).toBe(directOrigin);
  expect((await direct(port,'/healthz')).status).toBe(200);
  const result=await login(port);
  expect(new URL(result.begin.headers.location!).searchParams.get('redirect_uri')).toBe(`${directOrigin}/auth/callback`);
  expect(result.callback.headers.location).toBe('/connections');
  expect(result.callback.headers['set-cookie']?.every(value=>value.includes('; Secure')&&value.includes('HttpOnly')&&value.includes('SameSite=Lax'))).toBe(true);
  expect(result.me.json().user.username).toBe('fallback-user');
  expect(setupResult.fallbackOAuth.exchange).toHaveBeenCalledOnce();expect(setupResult.mainOAuth.exchange).not.toHaveBeenCalled();
});

it('isolates both OAuth state and authenticated sessions in both directions',async()=>{
  const s=await setup();const port=(await s.server.startFallback())!;
  expect((await direct(port,'/api/me',{Cookie:`dashboard_session=${s.primaryId}`})).status).toBe(401);
  const mainState=s.sessions.beginLogin();
  expect((await direct(port,`/auth/callback?code=example&state=${mainState}`,{Cookie:`dashboard_oauth=${mainState}`})).status).toBe(400);
  const result=await login(port);
  expect((await fetch(`http://127.0.0.1:${s.primaryPort}/api/me`,{headers:{Cookie:result.sessionCookie}})).status).toBe(401);
  expect(s.sessions.consumeLogin(mainState,mainState)).toBe(true);
  const directState=new URL(result.begin.headers.location!).searchParams.get('state')!;
  expect((await fetch(`http://127.0.0.1:${s.primaryPort}/auth/callback?code=example&state=${directState}`,{headers:{Cookie:`dashboard_oauth=${directState}`},redirect:'manual'})).status).toBe(400);
});

it('keeps the direct origin context during concurrent OAuth requests on the primary',async()=>{
  const s=await setup();const port=(await s.server.startFallback())!;
  let release!:()=>void;let entered!:()=>void;const busy=new Promise<void>(resolve=>{entered=resolve;});
  s.fallbackOAuth.user.mockImplementation(async()=>{entered();await new Promise<void>(resolve=>{release=resolve;});return{id:'fallback-user',username:'fallback-user',avatar:null};});
  const directLogin=login(port);await busy;
  const mainState=s.sessions.beginLogin();
  const primary=await fetch(`http://127.0.0.1:${s.primaryPort}/auth/callback?code=main&state=${mainState}`,{headers:{Cookie:`dashboard_oauth=${mainState}`},redirect:'manual'});
  expect(primary.status).toBe(302);expect(primary.headers.get('set-cookie')).not.toContain('; Secure');
  release();const result=await directLogin;
  expect(result.me.json().user.username).toBe('fallback-user');
  expect(result.callback.headers['set-cookie']?.join()).toContain('; Secure');
  expect(s.mainOAuth.exchange).toHaveBeenCalledExactlyOnceWith('main');
  expect(s.fallbackOAuth.exchange).toHaveBeenCalledExactlyOnceWith('example');
});

it('requires the direct origin and CSRF token for writes, then rechecks real guild permissions',async()=>{
  const s=await setup();const port=(await s.server.startFallback())!;const result=await login(port);
  const url=`/api/guilds/${guildId}/community`;
  const headers={Cookie:result.sessionCookie,'Content-Type':'application/json','X-CSRF-Token':result.csrf};
  for(const bad of [{Origin:mainOrigin},{Origin:'https://evil.test'},{Origin:directOrigin,'X-CSRF-Token':'bad'}])expect((await direct(port,url,{...headers,...bad},'PATCH','{}')).status).toBe(403);
  expect(s.module.updateConfig).not.toHaveBeenCalled();
  expect((await direct(port,url,{...headers,Origin:directOrigin},'PATCH','{}')).status).toBe(200);
  expect(s.module.updateConfig).toHaveBeenCalledOnce();s.revokeAccess();
  expect((await direct(port,url,{...headers,Origin:directOrigin},'PATCH','{}')).status).toBe(403);
  expect(s.module.updateConfig).toHaveBeenCalledOnce();
});

it('rejects forged Host and absolute request targets and ignores forwarded identity',async()=>{
  const s=await setup();const port=(await s.server.startFallback())!;
  expect((await direct(port,'/healthz',{Host:'evil.test','X-Forwarded-Host':'localhost:3443'})).status).toBe(421);
  expect((await direct(port,'https://evil.test/healthz')).status).toBe(421);
  for(let i=0;i<30;i++)expect((await direct(port,'/auth/login',{'X-Forwarded-For':`198.51.100.${i}`,'X-Forwarded-Host':'evil.test','X-Forwarded-Proto':'http'})).status).toBe(302);
  expect((await direct(port,'/auth/login',{'X-Forwarded-For':'203.0.113.2'})).status).toBe(429);
  // The primary has a separate rate bucket and keeps its configured proxy semantics.
  expect((await fetch(`http://127.0.0.1:${s.primaryPort}/auth/login`,{redirect:'manual'})).status).toBe(302);
});

it('blocks TikTok authorization on the direct origin while keeping existing connections readable',async()=>{
  const s=await setup();const port=(await s.server.startFallback())!;const result=await login(port);
  const rejected=await direct(port,'/api/tiktok/connect',{Cookie:result.sessionCookie,Origin:directOrigin,'X-CSRF-Token':result.csrf,'Content-Type':'application/json'},'POST','{}');
  expect(rejected.status).toBe(409);expect(rejected.json().error).toContain('main dashboard');expect(s.tiktok.begin).not.toHaveBeenCalled();
  expect((await direct(port,'/auth/tiktok/callback?state=x&code=x')).status).toBe(409);
  expect((await direct(port,'/api/tiktok/connections',{Cookie:result.sessionCookie})).status).toBe(200);
});

it('keeps the primary up after invalid fallback certificates and rejects self-signed, wrong-host, and expired certificates',async()=>{
  const s=await setup({certFile:`${fixtures}/test-expired.pem`});
  await expect(s.server.startFallback()).rejects.toThrow('expired');
  expect(s.server.fallbackUrl).toBeUndefined();
  expect((await fetch(`http://127.0.0.1:${s.primaryPort}/healthz`)).status).toBe(200);
  await expect(fallbackTlsOptions({...settings(),url:'https://unrelated.test'})).rejects.toThrow('does not cover');
  await expect(fallbackTlsOptions({...settings(),certFile:`${fixtures}/test-self-signed.pem`})).rejects.toThrow('self-signed');
  const original=await readFile(settings().keyFile);
  const key=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'});
  const fs=await import('node:fs/promises');const os=await import('node:os');const path=await import('node:path');
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cyro-fallback-test-'));
  const filename=path.join(temp,'test-mismatched-key.pem');
  try{await fs.writeFile(filename,key);await expect(fallbackTlsOptions({...settings(),keyFile:filename})).rejects.toThrow('do not match');}
  finally{await fs.unlink(filename);await fs.rmdir(temp);}
  expect(await readFile(settings().keyFile)).toEqual(original);
});

it('builds a separate fallback OAuth client when only the primary is injected',async()=>{
  const s=await setup({},false);const port=(await s.server.startFallback())!;
  const transport=vi.spyOn(globalThis,'fetch').mockImplementation(async(input,init)=>{
    if(String(input).endsWith('/oauth2/token')){expect(String(init?.body)).toContain(encodeURIComponent(`${directOrigin}/auth/callback`));return Response.json({access_token:'direct-token',expires_in:3600});}
    return Response.json({id:'real-fallback-client',username:'real-fallback-client',avatar:null});
  });
  // createOAuthApi captures fetch at listener construction, so recreate the listener with the spy installed.
  await s.server.stop();const next=await setup({},false);const nextPort=(await next.server.startFallback())!;
  const result=await login(nextPort);expect(result.me.json().user.username).toBe('real-fallback-client');
  expect(next.mainOAuth.exchange).not.toHaveBeenCalled();expect(transport).toHaveBeenCalledTimes(2);
});

it('stops both listeners and drains fallback logout work before resolving',async()=>{
  const s=await setup();const port=(await s.server.startFallback())!;const result=await login(port);
  let finish!:()=>void;s.fallbackOAuth.revoke.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve;}));
  expect((await direct(port,'/auth/logout',{Cookie:result.sessionCookie,Origin:directOrigin,'X-CSRF-Token':result.csrf},'POST')).status).toBe(200);
  let stopped=false;const shutdown=s.server.stop().then(()=>{stopped=true;});
  expect(s.server.fallbackUrl).toBeUndefined();
  await new Promise(resolve=>setTimeout(resolve,15));expect(stopped).toBe(false);finish();await shutdown;
  await expect(direct(port,'/healthz')).rejects.toThrow();
  await expect(fetch(`http://127.0.0.1:${s.primaryPort}/healthz`)).rejects.toThrow();
  expect(s.mainOAuth.revoke).not.toHaveBeenCalled();
});

it('joins a certificate read during shutdown and never starts a listener afterward',async()=>{
  const s=await setup();const actual=fallbackHelpers.fallbackTlsOptions;
  let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;});
  vi.spyOn(fallbackHelpers,'fallbackTlsOptions').mockImplementation(async config=>{await pending;return actual(config);});
  const startup=s.server.startFallback();const failure=expect(startup).rejects.toThrow('shutting down');
  let stopped=false;const shutdown=s.server.stop().then(()=>{stopped=true;});
  await new Promise(resolve=>setTimeout(resolve,10));expect(stopped).toBe(false);
  release();await failure;await shutdown;expect(s.server.fallbackUrl).toBeUndefined();
});

it('closes a fallback that is binding when shutdown starts',async()=>{
  const s=await setup();const listen=HttpsServer.prototype.listen;
  let started!:()=>void;const began=new Promise<void>(resolve=>{started=resolve;});
  let allowCallback!:()=>void;let actualPort=0;
  vi.spyOn(HttpsServer.prototype,'listen').mockImplementation(function(this:HttpsServer,...args:any[]){
    const callback=args[args.length-1];args[args.length-1]=()=>{
      const address=this.address();actualPort=typeof address==='object'&&address?address.port:0;
      allowCallback=callback;started();
    };
    return (listen as any).apply(this,args);
  } as typeof listen);
  const startup=s.server.startFallback();await began;
  const shutdown=s.server.stop();expect(s.server.fallbackUrl).toBeUndefined();
  allowCallback();await startup;await shutdown;
  await expect(direct(actualPort,'/healthz')).rejects.toThrow();
});
