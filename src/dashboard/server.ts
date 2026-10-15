import type { AccessService } from '../control/access.js';
import type { PublishingService } from '../control/publishing.js';
import { GuildIdentityService, IdentityError } from '../control/identity.js';
import { COMMAND_KEYS, parseAccess } from '../control/store.js';
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isIP } from 'node:net';
import { PermissionFlagsBits, type Client, type Guild } from 'discord.js';
import type { AppConfig } from '../config.js';
import type { Logger } from '../logger.js';
import { SessionStore, canManageGuild, safeEqual } from './auth.js';
import { createOAuthApi, inviteUrl, type OAuthApi } from './discord-api.js';
import { DashboardTikTok, TikTokDashboardError, TikTokCancellation } from './tiktok.js';

interface Module {
  getConfig(guildId:string):Promise<unknown>;
  updateConfig(guildId:string,input:unknown):Promise<unknown>;
  snapshot(guildId:string):Promise<unknown>;
  publishPanel?(guildId:string,input:unknown):Promise<unknown>;
  publishVerificationPanel?(guildId:string):Promise<unknown>;
}
interface Streams {
  list(guildId:string):Promise<unknown>;
  add(guild:Guild,input:unknown):Promise<unknown>;
  update(guild:Guild,id:string,input:unknown):Promise<unknown>;
  remove(guild:Guild,id:string):Promise<void>;
}
interface Suggestions {
  getConfig(guildId:string):unknown;
  snapshot(guildId:string,page?:number):unknown;
  updateConfig(guildId:string,input:unknown,authorize?:()=>Promise<void>):Promise<unknown>;
  decide(guild:Guild,actorId:string,id:string,input:unknown):Promise<unknown>;
}
interface StatusRoles {
  getConfig(guildId:string):unknown;
  automaticRoleIds(guildId:string):string[];
  snapshot(guildId:string):unknown;
  updateConfig(guildId:string,input:unknown,authorize?:()=>Promise<void>):Promise<unknown>;
}
interface CommunityFeature {
  snapshot(guildId:string):unknown;
  updateConfig(guildId:string,input:unknown,authorize?:()=>Promise<void>):Promise<unknown>;
}
interface ManagedCommunityFeature {
  snapshot(guildId:string,page?:number):unknown;
  updateConfig(guild:Guild,input:unknown,authorize?:()=>Promise<void>):Promise<unknown>;
}
interface CommunityTools extends ManagedCommunityFeature {
  decide(guild:Guild,actorId:string,id:string,input:unknown,source?:undefined,authorize?:()=>Promise<void>):Promise<unknown>;
}
interface Options {tempVoice?:ManagedCommunityFeature;communityTools?:CommunityTools;access?:AccessService;publishing?:PublishingService;suggestions?:Suggestions;statusRoles?:StatusRoles;voice?:CommunityFeature;confessions?:CommunityFeature;client:Client;config:AppConfig;logger:Logger;community:Module;moderation:Module;streams:Streams;creators?:Streams;tiktok?:DashboardTikTok;streamStats?:{snapshot(guildId:string):Promise<unknown>};publicDir:string;sessions?:SessionStore;oauth?:OAuthApi;isOperational?:()=>boolean;drainTimeoutMs?:number;requestTimeoutMs?:number}
export class HttpError extends Error { constructor(public status:number,message:string) {super(message);} }
export function clientAddress(remote:string, forwarded:string|undefined, trustProxy:boolean):string {
  if(!trustProxy||!forwarded)return remote;
  // Trust exactly the immediate proxy's appended hop, never the caller's leftmost entry.
  const last=forwarded.split(',').at(-1)?.trim();return last&&isIP(last)?last:remote;
}
export async function requireGuildManager(client:Client,guildId:string,userId:string):Promise<Guild> {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new HttpError(404,'The bot is not installed in this server.');
  // Refresh both role definitions and membership so permission revocation takes effect immediately.
  const member = await guild.members.fetch({user:userId,force:true}).catch(()=>undefined);
  if(!member) throw new HttpError(403,'You must be a member with Manage Server permission.');
  await guild.roles.fetch();
  if(!member.permissions.has(PermissionFlagsBits.ManageGuild)) throw new HttpError(403,'You need Manage Server permission.');
  return guild;
}
export class DashboardServer {
  private server?:Server;
  private sessions:SessionStore;
  private oauth:OAuthApi;
  private rates = new Map<string,{count:number;reset:number}>();
  private pending = new Set<Promise<unknown>>();
  private stopping = false;
  private stopPromise?: Promise<void>;
  private identity = new GuildIdentityService();
  private roleConfigQueues = new Map<string,Promise<unknown>>();
  constructor(private options:Options) {
    this.sessions = options.sessions ?? new SessionStore();
    this.oauth = options.oauth ?? createOAuthApi(options.config.discordClientId,options.config.discordClientSecret ?? '',`${this.origin}/auth/callback`);
  }
  private get origin():string { return this.options.config.dashboardUrl ?? 'http://localhost:3000'; }
  private get secure():boolean { return this.origin.startsWith('https://'); }
  private get operational():boolean { return !this.stopping && this.options.client.isReady() && (this.options.isOperational?.() ?? true); }
  private track<T>(operation:Promise<T>):Promise<T> {
    const tracked=operation.finally(()=>{this.pending.delete(tracked);});
    this.pending.add(tracked); return tracked;
  }
  /** Reward configuration and access grants must inspect each other's committed state. */
  private withRoleConfigLock<T>(guildId:string,operation:()=>Promise<T>):Promise<T> {
    const task=(this.roleConfigQueues.get(guildId)??Promise.resolve()).catch(()=>undefined).then(operation);
    this.roleConfigQueues.set(guildId,task);
    void task.finally(()=>{if(this.roleConfigQueues.get(guildId)===task)this.roleConfigQueues.delete(guildId);}).catch(()=>undefined);
    return task;
  }
  async start(port = this.options.config.dashboardPort ?? 3000,host = this.options.config.dashboardHost ?? '127.0.0.1'):Promise<number> {
    if(this.server || this.pending.size)throw new Error('Dashboard is already running or still draining.');
    this.stopping=false; this.stopPromise=undefined;
    this.server = createServer((req,res) => {
      const timer=setTimeout(()=>{
        if(!res.writableEnded&&!res.destroyed){this.json(res,503,{error:'The request timed out. Reload the server state before trying again.'});if(!req.complete)req.destroy();}
      },this.options.requestTimeoutMs??20_000);
      void this.track(this.handle(req,res).catch(error => {
      if(res.writableEnded||res.destroyed)return;
      if(res.headersSent) {res.destroy();return;}
      const status = error instanceof HttpError || error instanceof TikTokDashboardError || error instanceof IdentityError ? error.status : 500;
      if(status === 500) this.options.logger.error('Dashboard request failed.', {message:error instanceof Error?error.message:'Unknown error'});
      this.json(res,status,{error:status === 500?'The request could not be completed. Check the bot log and try again.':error.message});
    }).finally(()=>clearTimeout(timer))); });
    this.server.requestTimeout=20_000; this.server.headersTimeout=10_000; this.server.keepAliveTimeout=5000;
    await new Promise<void>((resolve,reject)=>{this.server!.once('error',reject);this.server!.listen(port,host,()=>{this.server!.off('error',reject);resolve();});});
    const address=this.server.address();
    return typeof address==='object' && address?address.port:port;
  }
  stop():Promise<void> {
    if(this.stopPromise)return this.stopPromise;
    if(!this.server)return Promise.resolve();
    const server=this.server; this.server=undefined; this.stopping=true;
    const closed=new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    server.closeIdleConnections();
    const drain=async()=>{while(this.pending.size)await Promise.allSettled([...this.pending]);await closed;};
    this.stopPromise=new Promise<void>((resolve,reject)=>{
      const timer=setTimeout(()=>{server.closeAllConnections();reject(new Error(`Dashboard drain deadline exceeded with ${this.pending.size} unfinished operation(s).`));},this.options.drainTimeoutMs??25_000);
      drain().then(()=>{clearTimeout(timer);resolve();},error=>{clearTimeout(timer);reject(error);});
    });
    return this.stopPromise;
  }
  private json(res:ServerResponse,status:number,data:unknown):void {if(res.writableEnded||res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
  private redirect(res:ServerResponse,url:string):void {if(res.writableEnded||res.destroyed)return;res.writeHead(302,{Location:url});res.end();}
  private assertActive(res:ServerResponse):void {if(res.writableEnded||res.destroyed)throw new HttpError(503,'The request is no longer active.');}
  private cookie(name:string,value:string,seconds:number):string {return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${this.secure?'; Secure':''}`;}
  private cookies(req:IncomingMessage):Record<string,string> {
    return Object.fromEntries((req.headers.cookie??'').split(';').map(item=>item.trim().split('=')).filter(parts=>parts.length===2) as [string,string][]);
  }
  private async body(req:IncomingMessage,limit=131_072):Promise<unknown> {
    if(!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415,'Send JSON with Content-Type: application/json.');
    let size=0;const parts:Buffer[]=[];
    for await(const part of req) {size+=part.length;if(size>limit) throw new HttpError(413,'Request is too large.');parts.push(Buffer.from(part));}
    try {return JSON.parse(Buffer.concat(parts).toString('utf8'));} catch {throw new HttpError(400,'Invalid JSON.');}
  }
  private rate(req:IncomingMessage,login:boolean):void {
    const now=Date.now();
    if(this.rates.size>5000) for(const[key,bucket]of this.rates) if(bucket.reset<=now)this.rates.delete(key);
    const forwarded=req.headers['x-forwarded-for'];
    const address=clientAddress(req.socket.remoteAddress??'unknown',typeof forwarded==='string'?forwarded:undefined,Boolean(this.options.config.dashboardTrustProxy));
    const cookie=this.cookies(req).dashboard_session;
    const identity=!login&&cookie&&this.sessions.peek(cookie)?`session:${cookie}`:address;
    const key=`${login?'login':'api'}:${identity}`;
    let bucket=this.rates.get(key);
    if(!bucket||bucket.reset<=now) {if(this.rates.size>=10000)throw new HttpError(429,'Dashboard is busy. Try again shortly.');bucket={count:0,reset:now+(login?600_000:60_000)};this.rates.set(key,bucket);}
    if(++bucket.count>(login?30:300))throw new HttpError(429,'Too many requests. Please wait before trying again.');
  }
  private async handle(req:IncomingMessage,res:ServerResponse):Promise<void> {
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://cdn.discordapp.com data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if(this.secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
    const url=new URL(req.url??'/',this.origin);const route=url.pathname;const method=req.method??'GET';
    const o=this.options;
    if(method==='GET' && route==='/healthz') {this.json(res,200,{ok:true});return;}
    if(method==='GET' && route==='/readyz') {const ready=this.operational;this.json(res,ready?200:503,{ready});return;}
    if(this.stopping)throw new HttpError(503,'The dashboard is shutting down. Please try again shortly.');
    this.rate(req,route.startsWith('/auth/'));
    if(method==='GET' && route==='/api/status') {this.json(res,200,{configured:Boolean(o.config.discordClientSecret),botReady:this.operational,inviteUrl:inviteUrl(o.config.discordClientId)});return;}
    // This installation runs one Gateway client. Expose only its current aggregate, never guild records.
    if(method==='GET' && route==='/api/public/stats') {this.json(res,200,{serverCount:this.operational?o.client.guilds.cache.size:null});return;}
    if(method==='GET' && route==='/invite') {const guildId=url.searchParams.get('guild_id');this.redirect(res,inviteUrl(o.config.discordClientId,guildId&&/^\d{17,20}$/.test(guildId)?guildId:undefined));return;}
    const cookies=this.cookies(req);
    if(method==='GET' && route==='/auth/login') {
      if(!o.config.discordClientSecret)throw new HttpError(503,'The bot owner must configure DISCORD_CLIENT_SECRET and DASHBOARD_URL to enable sign-in.');
      // Only the creator portal is a supported post-login destination; never accept an arbitrary URL.
      let returnTo='/';
      const requested=url.searchParams.get('returnTo');
      if(requested){const target=new URL(requested,this.origin);if(target.origin===this.origin&&target.pathname==='/connections'){
        const query=new URLSearchParams();const guild=target.searchParams.get('guild');const record=target.searchParams.get('record');
        if(guild&&/^\d{17,20}$/.test(guild))query.set('guild',guild);if(record&&/^[a-zA-Z0-9-]{1,64}$/.test(record))query.set('record',record);
        returnTo=`/connections${query.size?'?'+query:''}`;
      }}
      const state=this.sessions.beginLogin(Date.now(),returnTo);res.setHeader('Set-Cookie',this.cookie('dashboard_oauth',state,600));
      this.redirect(res,`https://discord.com/oauth2/authorize?${new URLSearchParams({client_id:o.config.discordClientId,response_type:'code',scope:'identify guilds',redirect_uri:`${this.origin}/auth/callback`,state})}`);return;
    }
    if(method==='GET' && route==='/auth/callback') {
      res.setHeader('Set-Cookie',this.cookie('dashboard_oauth','',0));
      const returnTo=this.sessions.consumeLoginDestination(url.searchParams.get('state')??'',cookies.dashboard_oauth??'');
      if(returnTo===undefined)throw new HttpError(400,'Your sign-in expired or did not match this browser. Start sign-in again.');
      const code=url.searchParams.get('code');if(!code||code.length>2048)throw new HttpError(400,'Discord sign-in was cancelled.');
      const token=await this.oauth.exchange(code);
      if(!token.access_token||!Number.isFinite(token.expires_in)||token.expires_in<=0)throw new HttpError(502,'Discord did not return a valid login.');
      const user=await this.oauth.user(token.access_token);
      this.assertActive(res);
      if(cookies.dashboard_session)this.sessions.delete(cookies.dashboard_session);
      const id=this.sessions.create(user,token.access_token,token.expires_in);
      res.setHeader('Set-Cookie',[this.cookie('dashboard_oauth','',0),this.cookie('dashboard_session',id,Math.min(token.expires_in,28800))]);this.redirect(res,returnTo);return;
    }
    if(method==='GET'&&route==='/auth/tiktok/callback') {
      const sessionId=cookies.dashboard_session??'';const session=this.sessions.peek(sessionId);
      if(!session){this.redirect(res,'/connections?tiktok=session-expired');return;}
      const assertActive=()=>{this.assertActive(res);if(!this.operational)throw new HttpError(503,'Cyro is reconnecting.');if(this.sessions.peek(sessionId)!==session)throw new HttpError(401,'Sign in again.');};
      try {
        assertActive();if(!o.tiktok)throw new HttpError(503,'TikTok is unavailable.');
        const destination=await o.tiktok.callback(url.searchParams.get('state')??'',url.searchParams.has('error')?null:url.searchParams.get('code'),session.user.id,sessionId,assertActive);
        this.redirect(res,destination);
      } catch(error) {this.redirect(res,`/connections?tiktok=${error instanceof TikTokCancellation?'cancelled':'connection-failed'}`);}
      return;
    }
    if(route.startsWith('/api/')||route==='/auth/logout') {
      const session=this.sessions.peek(cookies.dashboard_session??'');if(!session)throw new HttpError(401,'Sign in with Discord to continue.');
      if(!['GET','HEAD'].includes(method)) {
        const csrf=req.headers['x-csrf-token'];
        if(req.headers.origin!==this.origin || typeof csrf!=='string'||!safeEqual(csrf,session.csrfToken))throw new HttpError(403,'The security token is missing or expired. Refresh and try again.');
      }
      this.sessions.get(cookies.dashboard_session??'');
      if(method==='POST'&&route==='/auth/logout') {
        this.sessions.delete(cookies.dashboard_session!);res.setHeader('Set-Cookie',this.cookie('dashboard_session','',0));
        void this.track(this.oauth.revoke(session.accessToken).catch(()=>undefined));this.json(res,200,{ok:true});return;
      }
      if(method==='GET'&&route==='/api/me') {this.json(res,200,{user:session.user,csrfToken:session.csrfToken});return;}
      if(!this.operational)throw new HttpError(503,'The bot is starting up or reconnecting. Please try again shortly.');
      if(route.startsWith('/api/tiktok/')) {
        if(!o.tiktok)throw new HttpError(503,'TikTok connections are unavailable.');
        const input=method==='POST'?await this.body(req):undefined;
        this.assertActive(res);
        if(this.sessions.peek(cookies.dashboard_session??'')!==session)throw new HttpError(401,'Your session expired. Sign in again.');
        try {
          if(method==='GET'&&route==='/api/tiktok/records'){this.json(res,200,await o.tiktok.records(session.user.id,url.searchParams.get('guildId')??undefined));return;}
          if(method==='GET'&&route==='/api/tiktok/connections'){this.json(res,200,await o.tiktok.connections(session.user.id));return;}
          if(method==='GET'&&route==='/api/tiktok/videos'){this.json(res,200,await o.tiktok.videos({guildId:url.searchParams.get('guildId'),recordId:url.searchParams.get('recordId')},session.user.id));return;}
          if(method==='POST'&&route==='/api/tiktok/connect'){this.json(res,200,await o.tiktok.begin(input,session.user.id,cookies.dashboard_session!));return;}
          if(method==='POST'&&route==='/api/tiktok/disconnect'){this.json(res,200,await o.tiktok.disconnect(input,session.user.id));return;}
        } catch(error) {if(error instanceof HttpError||error instanceof TikTokDashboardError)throw error;throw new HttpError(400,'TikTok could not complete this request. Check your connection and try again.');}
        throw new HttpError(404,'Endpoint not found.');
      }
      if(method==='GET'&&route==='/api/guilds') {
        const guilds=await this.oauth.guilds(session.accessToken);
        const visible=[];
        for (const g of guilds) {
          const installed=o.client.guilds.cache.get(g.id);
          let allowed=canManageGuild(g.permissions,g.owner);
          if(installed && o.access) allowed=await o.access.dashboard(installed,session.user.id).then(()=>true,()=>false);
          if(allowed)visible.push({id:g.id,name:g.name,icon:g.icon,installed:Boolean(installed),inviteUrl:inviteUrl(o.config.discordClientId,g.id)});
        }
        this.json(res,200,{guilds:visible});return;
      }
      const match=route.match(/^\/api\/guilds\/(\d{17,20})(?:\/(community|moderation|streams|creators|stream-stats|access|messages|polls|identity|suggestions|status-roles|voice|confessions|temp-voice|community-tools|bug-reports)(?:\/([a-zA-Z0-9-]{1,64})(?:\/(status))?)?)?$/);
      if(match) {
        // Consume bounded request data before checking authority; an upload can outlast a role revocation.
        const input=['PATCH','POST'].includes(method)?await this.body(req,match[2]==='identity'&&!match[3]&&method==='PATCH'?3*1024*1024:131_072):undefined;
        this.assertActive(res);
        if(!this.sessions.peek(cookies.dashboard_session??''))throw new HttpError(401,'Your session expired. Sign in again.');
        if(!this.operational)throw new HttpError(503,'The bot is starting up or reconnecting. Please try again shortly.');
        let guild:Guild;
        if(o.access){
          const installed=o.client.guilds.cache.get(match[1]!);if(!installed)throw new HttpError(404,'The bot is not installed in this server.');
          try{await o.access.dashboard(installed,session.user.id);}catch{throw new HttpError(403,'The server owner has not granted your roles dashboard access.');}
          guild=installed;
        }else guild=await requireGuildManager(o.client,match[1]!,session.user.id);
        this.assertActive(res);
        const section=match[2];const id=match[3];
        if (match[4] && section !== 'bug-reports') throw new HttpError(404,'Endpoint not found.');
        if(section==='temp-voice'||section==='community-tools'||section==='bug-reports') {
          const feature=section==='temp-voice'?o.tempVoice:o.communityTools;
          if(!feature)throw new HttpError(503,'Community tools are not available.');
          const assertCurrent=()=>{
            this.assertActive(res);
            if(this.sessions.peek(cookies.dashboard_session??'')!==session)throw new HttpError(401,'Your session expired. Sign in again.');
            if(!this.operational)throw new HttpError(503,'Cyro is reconnecting. Reload before changing these settings.');
            if(o.client.guilds.cache.get(guild.id)!==guild)throw new HttpError(404,'The bot is not installed in this server.');
          };
          const authorize=async()=>{
            assertCurrent();
            if(o.access){try{await o.access.dashboard(guild,session.user.id);}catch{throw new HttpError(403,'The server owner has not granted your roles dashboard access.');}}
            else await requireGuildManager(o.client,guild.id,session.user.id);
            assertCurrent();
          };
          try {
            if(method==='GET'&&!id&&section!=='bug-reports') {
              const page=url.searchParams.get('page')??'1';
              if(!/^[1-9]\d{0,5}$/.test(page)||Number(page)>100000)throw new HttpError(400,'Choose a valid report page.');
              this.json(res,200,await feature.snapshot(guild.id,Number(page)));return;
            }
            if(method==='PATCH'&&!id&&section!=='bug-reports') { this.json(res,200,{config:await feature.updateConfig(guild,input,authorize)});return; }
            if(method==='POST'&&id&&section==='bug-reports'&&match[4]==='status') { this.json(res,200,{report:await o.communityTools!.decide(guild,session.user.id,id,input,undefined,authorize)});return; }
          }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,error instanceof Error?error.message:'The change could not be saved.');}
          throw new HttpError(405,'Use GET or PATCH for settings, or POST to update a bug report status.');
        }
        if(section==='voice'||section==='confessions'){
          const feature=o[section];
          if(!feature)throw new HttpError(503,`${section==='voice'?'Voice':'Confession'} settings are not available.`);
          if(method==='GET'&&!id){this.json(res,200,await feature.snapshot(guild.id));return;}
          if(method==='PATCH'&&!id){
            const assertCurrent=()=>{
              this.assertActive(res);
              if(this.sessions.peek(cookies.dashboard_session??'')!==session)throw new HttpError(401,'Your session expired. Sign in again.');
              if(!this.operational)throw new HttpError(503,`Cyro is reconnecting. Reload before changing ${section} settings.`);
              if(o.client.guilds.cache.get(guild.id)!==guild)throw new HttpError(404,'The bot is not installed in this server.');
            };
            const authorize=async()=>{
              assertCurrent();
              if(o.access){try{await o.access.dashboard(guild,session.user.id);}catch{throw new HttpError(403,'The server owner has not granted your roles dashboard access.');}}
              else await requireGuildManager(o.client,guild.id,session.user.id);
              assertCurrent();
            };
            try{this.json(res,200,{config:await feature.updateConfig(guild.id,input,authorize)});}
            catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,error instanceof Error?error.message:`Invalid ${section} configuration.`);}
            return;
          }
          throw new HttpError(405,`Use GET or PATCH for ${section} settings.`);
        }
        if(section==='status-roles'){
          if(!o.statusRoles)throw new HttpError(503,'Status roles are not available.');
          if(method==='GET'&&!id){this.json(res,200,await o.statusRoles.snapshot(guild.id));return;}
          if(method==='PATCH'&&!id){
            const authorize=async()=>{
              this.assertActive(res);
              if(this.sessions.peek(cookies.dashboard_session??'')!==session)throw new HttpError(401,'Your session expired. Sign in again.');
              if(!this.operational)throw new HttpError(503,'Cyro is reconnecting. Reload before changing status roles.');
              if(o.client.guilds.cache.get(guild.id)!==guild)throw new HttpError(404,'The bot is not installed in this server.');
              if(o.access){try{await o.access.dashboard(guild,session.user.id);}catch{throw new HttpError(403,'The server owner has not granted your roles dashboard access.');}}
              else await requireGuildManager(o.client,guild.id,session.user.id);
              this.assertActive(res);
              if(this.sessions.peek(cookies.dashboard_session??'')!==session)throw new HttpError(401,'Your session expired. Sign in again.');
              if(!this.operational)throw new HttpError(503,'Cyro is reconnecting. Reload before changing status roles.');
            };
            await this.withRoleConfigLock(guild.id,async()=>{
              try{this.json(res,200,{config:await o.statusRoles!.updateConfig(guild.id,input,authorize)});}
              catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,error instanceof Error?error.message:'Invalid status role configuration.');}
            });
            return;
          }
          throw new HttpError(405,'Use GET or PATCH for status role settings.');
        }
        if(section==='suggestions'){
          if(!o.suggestions)throw new HttpError(503,'Suggestions are not available.');
          if(method==='GET'&&!id){
            const page=url.searchParams.get('page')??'1';
            if(!/^[1-9]\d{0,5}$/.test(page)||Number(page)>100000)throw new HttpError(400,'Choose a page from 1 to 100,000.');
            this.json(res,200,await o.suggestions.snapshot(guild.id,Number(page)));return;
          }
          if(method==='PATCH'&&!id){
            const authorize=async()=>{
              this.assertActive(res);
              if(this.sessions.peek(cookies.dashboard_session??'')!==session)throw new HttpError(401,'Your session expired. Sign in again.');
              if(!this.operational)throw new HttpError(503,'Cyro is reconnecting. Reload before changing suggestions.');
              if(o.client.guilds.cache.get(guild.id)!==guild)throw new HttpError(404,'The bot is not installed in this server.');
              if(o.access){try{await o.access.dashboard(guild,session.user.id);}catch{throw new HttpError(403,'The server owner has not granted your roles dashboard access.');}}
              else await requireGuildManager(o.client,guild.id,session.user.id);
              this.assertActive(res);
              if(this.sessions.peek(cookies.dashboard_session??'')!==session)throw new HttpError(401,'Your session expired. Sign in again.');
              if(!this.operational)throw new HttpError(503,'Cyro is reconnecting. Reload before changing suggestions.');
            };
            try{this.json(res,200,{config:await o.suggestions.updateConfig(guild.id,input,authorize)});}
            catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,error instanceof Error?error.message:'Invalid suggestions configuration.');}
            return;
          }
          if(method==='POST'&&id){
            try{this.json(res,200,{suggestion:await o.suggestions.decide(guild,session.user.id,id,input)});}
            catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,error instanceof Error?error.message:'Could not update this suggestion.');}
            return;
          }
          throw new HttpError(405,'Use GET or PATCH for suggestions settings, or POST to review a suggestion.');
        }
        if(section==='identity'&&!id){
          if(method==='GET'){this.json(res,200,await this.identity.get(guild));return;}
          if(method==='PATCH'){
            const authorize=async()=>{
              this.assertActive(res);
              if(this.sessions.peek(cookies.dashboard_session??'')!==session)throw new HttpError(401,'Your session expired. Sign in again.');
              if(!this.operational)throw new HttpError(503,'Cyro is reconnecting. Reload before changing the profile.');
              if(o.client.guilds.cache.get(guild.id)!==guild)throw new HttpError(404,'The bot is not installed in this server.');
              if(o.access){try{await o.access.dashboard(guild,session.user.id);}catch{throw new HttpError(403,'The server owner has not granted your roles dashboard access.');}}
              else await requireGuildManager(o.client,guild.id,session.user.id);
              this.assertActive(res);
              if(this.sessions.peek(cookies.dashboard_session??'')!==session)throw new HttpError(401,'Your session expired. Sign in again.');
              if(!this.operational)throw new HttpError(503,'Cyro is reconnecting. Reload before changing the profile.');
            };
            this.json(res,200,await this.identity.update(guild,session.user.id,input,authorize));return;
          }
          throw new HttpError(405,'Use GET or PATCH for the server profile.');
        }
        if(section==='access' && method==='PATCH' && !id){
          if(!o.access)throw new HttpError(503,'Access settings unavailable.');
          await this.withRoleConfigLock(guild.id,async()=>{
            const active=()=>{
              this.assertActive(res);
              if(this.sessions.peek(cookies.dashboard_session??'')!==session)throw new HttpError(401,'Your session expired. Sign in again.');
              if(!this.operational)throw new HttpError(503,'Cyro is reconnecting. Reload before changing access settings.');
              if(o.client.guilds.cache.get(guild.id)!==guild)throw new HttpError(404,'The bot is not installed in this server.');
            };
            active();
            // Recheck ownership inside the queue. Automatic role sources cannot double as access roles.
            await guild.fetch();if(guild.ownerId!==session.user.id)throw new HttpError(403,'Only the server owner can change access settings.');
            try{
              const config=parseAccess(input);
              const protectedIds=new Set([...config.dashboardRoleIds,...Object.values(config.commandRoles).flat()]);
              const sources=await Promise.all([o.community.getConfig(guild.id),o.moderation.getConfig(guild.id),o.streams.list(guild.id),o.statusRoles?.getConfig(guild.id),{autoRoleIds:o.statusRoles?.automaticRoleIds(guild.id)??[]}]);
              const inspect=(value:unknown):void=>{if(!value||typeof value!=='object')return;for(const[key,v]of Object.entries(value)){
                if(['autoRoleIds'].includes(key)&&Array.isArray(v)&&v.some(id=>protectedIds.has(id)))throw new Error('An automatic role is selected for access. Remove its automatic assignment first.');
                if(['roleId','acceptedRoleId','liveRoleId'].includes(key)&&typeof v==='string'&&protectedIds.has(v))throw new Error('An automatic, verification, self, or application role is selected for access. Remove that assignment first.');
                if(v&&typeof v==='object')inspect(v);
              }};sources.forEach(inspect);
              active();
              this.json(res,200,{config:await o.access!.update(guild,session.user.id,config)});
            }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,error instanceof Error?error.message:'Invalid access settings.');}
          });return;
        }
        if(section==='messages'||section==='polls'){
          if(!o.publishing)throw new HttpError(503,'Publishing is unavailable.');
          try{
            if(method==='GET'&&!id){this.json(res,200,{posts:o.publishing.list(guild.id).filter(p=>p.kind===(section==='polls'?'poll':'message'))});return;}
            if(method==='POST'&&!id){this.json(res,201,{post:await o.publishing.publish(guild,session.user.id,input,section==='polls'?'poll':'message')});return;}
            if(method==='POST'&&id&&section==='polls'){this.json(res,200,await o.publishing.endPoll(guild,session.user.id,id));return;}
          }catch(error){throw new HttpError(400,error instanceof Error?error.message:'Publishing failed.');}
        }

        if(method==='POST' && ((section==='moderation'&&id==='panel')||(section==='community'&&id==='verification-panel'))) {
          try {
            if(section==='moderation') {
              if(!o.moderation.publishPanel)throw new HttpError(503,'Support panels are not available.');
              this.json(res,201,await o.moderation.publishPanel(guild.id,input));
            } else {
              if(!o.community.publishVerificationPanel)throw new HttpError(503,'Verification panels are not available.');
              if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new HttpError(400,'Verification uses the saved settings. Save them before publishing.');
              this.json(res,201,await o.community.publishVerificationPanel(guild.id));
            }
          } catch(error) { if(error instanceof HttpError)throw error;throw new HttpError(400,error instanceof Error?error.message:'Could not publish this panel.'); }
          return;
        }
        if(method==='GET'&&section==='stream-stats'&&!id) {
          if(!o.streamStats)throw new HttpError(503,'Streamer statistics are not available.');
          this.json(res,200,await o.streamStats.snapshot(guild.id));return;
        }
        if(method==='GET'&&!section) {
          const [cc,cs,mc,ms,streams,channels,streamStats,creators,suggestions,statusRoles,voice,confessions,tempVoice,communityTools]=await Promise.all([o.community.getConfig(guild.id),o.community.snapshot(guild.id),o.moderation.getConfig(guild.id),o.moderation.snapshot(guild.id),o.streams.list(guild.id),guild.channels.fetch(),o.streamStats?.snapshot(guild.id),o.creators?.list(guild.id)??[],o.suggestions?.snapshot(guild.id),o.statusRoles?.snapshot(guild.id),o.voice?.snapshot(guild.id),o.confessions?.snapshot(guild.id),o.tempVoice?.snapshot(guild.id),o.communityTools?.snapshot(guild.id)]);
          const memberIds=new Set<string>();
          const collect=(value:unknown):void=>{if(!value||typeof value!=='object')return;for(const[key,item]of Object.entries(value)){if(/^(userId|ownerId|actorId|claimedBy|closedBy|reviewedBy|lastUserId|memberId|inviterId)$/.test(key)&&typeof item==='string')memberIds.add(item);else if(item&&typeof item==='object')collect(item);}};
          collect(cs);collect(ms);
          const members=[...memberIds].slice(0,250).flatMap(id=>{const member=guild.members.cache.get(id);return member?[{id,displayName:member.displayName}]:[];});
          this.json(res,200,{guild:{id:guild.id,name:guild.name,icon:guild.icon,memberCount:guild.memberCount},community:{config:cc,snapshot:cs},moderation:{config:mc,snapshot:ms},streams,creators,streamStats,suggestions,statusRoles,voice,confessions,tempVoice,communityTools,members,access:{config:o.access?.config(guild.id),isOwner:guild.ownerId===session.user.id,commands:COMMAND_KEYS},posts:o.publishing?.list(guild.id)??[],channels:[...channels.values()].filter(c=>c).map(c=>({id:c!.id,name:c!.name,type:c!.type})),roles:[...guild.roles.cache.values()].filter(r=>r.id!==guild.id&&!r.managed).map(r=>({id:r.id,name:r.name,color:r.color,position:r.position}))});return;
        }
        if(method==='PATCH'&&(section==='community'||section==='moderation')&&!id) {
          try{const config=await o[section].updateConfig(guild.id,input);this.json(res,200,{config});}catch(error){throw new HttpError(400,error instanceof Error?error.message:'Invalid configuration.');}return;
        }
        if(section==='streams') {
          try {
            if(method==='POST'&&!id){this.json(res,201,{stream:await o.streams.add(guild,input)});return;}
            if(method==='PATCH'&&id){this.json(res,200,{stream:await o.streams.update(guild,id,input)});return;}
            if(method==='DELETE'&&id){await o.streams.remove(guild,id);this.json(res,200,{ok:true});return;}
          }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,error instanceof Error?error.message:'Invalid stream configuration.');}
        }
        if(section==='creators') {
          if(!o.creators)throw new HttpError(503,'Creator profiles are not available.');
          try {
            if(method==='GET'&&!id){this.json(res,200,{creators:await o.creators.list(guild.id)});return;}
            if(method==='POST'&&!id){this.json(res,201,{creator:await o.creators.add(guild,input)});return;}
            if(method==='PATCH'&&id){this.json(res,200,{creator:await o.creators.update(guild,id,input)});return;}
            if(method==='DELETE'&&id){await o.creators.remove(guild,id);this.json(res,200,{ok:true});return;}
          }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,error instanceof Error?error.message:'Invalid creator configuration.');}
        }
      }
      throw new HttpError(404,'Endpoint not found.');
    }
    if(method!=='GET'&&method!=='HEAD')throw new HttpError(405,'Method not allowed.');
    const assets:Record<string,[string,string]>={'/':['index.html','text/html'],'/dashboard':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/setup.js':['setup.js','text/javascript'],'/studio.js':['studio.js','text/javascript'],'/styles.css':['styles.css','text/css'],'/favicon.svg':['favicon.svg','image/svg+xml'],'/cyro-logo.png':['cyro-logo.png','image/png']};
    Object.assign(assets,{'/privacy':['privacy.html','text/html'],'/terms':['terms.html','text/html'],'/connections':['connections.html','text/html'],'/connections.js':['connections.js','text/javascript'],'/creator.css':['creator.css','text/css'],'/identity.js':['identity.js','text/javascript'],'/suggestions.js':['suggestions.js','text/javascript'],'/status-roles.js':['status-roles.js','text/javascript'],'/audio.js':['audio.js','text/javascript'],'/confessions.js':['confessions.js','text/javascript'],'/search-select.js':['search-select.js','text/javascript']});
    Object.assign(assets,{'/home.js':['home.js','text/javascript'],'/home.css':['home.css','text/css'],'/home-icons.svg':['home-icons.svg','image/svg+xml']});
    Object.assign(assets,{'/icons.js':['icons.js','text/javascript'],'/icons.svg':['icons.svg','image/svg+xml']});
    Object.assign(assets,{'/help.js':['help.js','text/javascript'],'/temp-voice.js':['temp-voice.js','text/javascript'],'/community-tools.js':['community-tools.js','text/javascript']});
    const asset=assets[route];if(!asset)throw new HttpError(404,'Page not found.');
    const file=await readFile(path.join(o.publicDir,asset[0])).catch(()=>{throw new HttpError(404,'Dashboard file not found.');});
    res.writeHead(200,{'Content-Type':`${asset[1]}; charset=utf-8`});res.end(method==='HEAD'?undefined:file);
  }
}
