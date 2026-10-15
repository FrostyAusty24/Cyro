import { afterEach, expect, it, vi } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { DashboardServer, HttpError } from '../src/dashboard/server.js';
import { SessionStore } from '../src/dashboard/auth.js';
import { Logger } from '../src/logger.js';
import { BotMessageError } from '../src/i18n/index.js';
import { ALL_DASHBOARD_ERROR_ROWS, DASHBOARD_TRANSLATIONS, GENERIC_DASHBOARD_ERROR, dashboardError, dashboardErrorPage, dashboardErrorScript } from '../src/i18n/dashboard-errors.js';
import { mergeConfig as mergeCommunity } from '../src/community/config.js';
import { defaultGuild } from '../src/community/types.js';
import { mergeConfig as mergeModeration, DEFAULT_CONFIG as MODERATION_DEFAULT } from '../src/moderation/core.js';
import { messagePayload, pollPayload } from '../src/control/publishing.js';
import { dashboardCommunitySnapshot, dashboardModerationSnapshot, dashboardStream } from '../src/dashboard/diagnostics.js';

const servers:DashboardServer[]=[];
afterEach(async()=>{await Promise.all(servers.splice(0).map(server=>server.stop()));});
async function fixture(failure?:Error){
 const sessions=new SessionStore(); const sessionId=sessions.create({id:'u',username:'tester',avatar:null},'unused',3600);
 const guild={id:'123456789012345678',members:{fetch:async()=>({permissions:{has:()=>true}})},roles:{fetch:async()=>undefined}};
 const module={getConfig:async()=>({}),snapshot:async()=>({}),updateConfig:async()=>{if(failure)throw failure;return{};}};
 const logger=new Logger('error');const logged=vi.spyOn(logger,'error').mockImplementation(()=>{});
 const server=new DashboardServer({client:{isReady:()=>true,guilds:{cache:new Map([[guild.id,guild]])}} as never,config:{discordClientId:'123',discordToken:'unused',dataDir:'.',logLevel:'error',autoDeployCommands:false,pollIntervalSeconds:60,dashboardUrl:'http://localhost:3000'},logger,community:module,moderation:module,sessions,streams:{} as never,publicDir:'public'});
 servers.push(server);const port=await server.start(0,'127.0.0.1');
 return {base:'http://127.0.0.1:'+port,guild,logged,headers:{Origin:'http://localhost:3000','Content-Type':'application/json','X-CSRF-Token':sessions.get(sessionId)!.csrfToken,Cookie:'dashboard_session='+sessionId}};
}
it('serves the complete public error catalogue before sign-in and without server data',async()=>{
 const {base}=await fixture();const response=await fetch(base+'/i18n-errors.js');expect(response.status).toBe(200);expect(response.headers.get('content-type')).toContain('text/javascript');expect(response.headers.get('cache-control')).toContain('public');
 const source=await response.text();const browser={CyroDashboardCatalogs:[] as Record<string,Record<string,string>>[]};vm.runInNewContext(source,{window:browser});
 const merged=browser.CyroDashboardCatalogs[0]!;expect(Object.keys(merged)).toEqual(['fr','es','de','pt']);
 for(const locale of ['fr','es','de','pt'])expect(merged[locale]!['Choose a welcome channel.']??merged[locale]!['Select a welcome channel.']).toBeTruthy();
 expect(source).not.toContain('unused');expect(source).not.toContain('123456789012345678');expect(source).not.toContain('csrfToken');
 const head=await fetch(base+'/i18n-errors.js',{method:'HEAD'});expect(head.status).toBe(200);expect(await head.text()).toBe('');
});
it('keeps every trusted error translated with identical placeholder names',()=>{
 const tokens=(value:string)=>[...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(m=>m[1]).sort();
 expect(ALL_DASHBOARD_ERROR_ROWS.length).toBeGreaterThan(1000);
 for(const row of ALL_DASHBOARD_ERROR_ROWS){expect(row).toHaveLength(5);for(const text of row.slice(1)){expect(text.trim(),row[0]).not.toBe('');expect(tokens(text),row[0]).toEqual(tokens(row[0]));}}
});
it('returns a stable English compatibility message and trusted key for ordinary validation failures',async()=>{
 const {base,guild,headers}=await fixture(new Error('Select a welcome channel.'));
 const response=await fetch(base+'/api/guilds/'+guild.id+'/community',{method:'PATCH',headers,body:'{}'});
 expect(response.status).toBe(400);expect(await response.json()).toEqual({error:'Select a welcome channel.',i18n:{key:'Select a welcome channel.',params:{}}});
});
it('preserves structured errors and literal user values through HttpError wrapping',async()=>{
 const error=new BotMessageError('That YouTube video exceeds this server’s {minutes}-minute music limit.',{minutes:25});
 const {base,guild,headers}=await fixture(error);const response=await fetch(base+'/api/guilds/'+guild.id+'/community',{method:'PATCH',headers,body:'{}'});
 expect(response.status).toBe(400);expect(await response.json()).toEqual({error:error.message,i18n:{key:error.sourceEnglish,params:{minutes:25}}});
 const literal=dashboardError(new BotMessageError('Added {name}',{name:'<script>{name}</script>'}));
 expect(literal.error).toBe('Added <script>{name}</script>');
});
it('masks unexpected provider and filesystem failures without changing endpoint status',async()=>{
 const {base,guild,headers}=await fixture(new Error('https://provider.invalid?token=private-value C:\\private\\vault.json'));
 const response=await fetch(base+'/api/guilds/'+guild.id+'/community',{method:'PATCH',headers,body:'{}'});
 expect(response.status).toBe(400);const body=await response.text();expect(body).not.toContain('private-value');expect(body).not.toContain('vault');
 expect(JSON.parse(body)).toEqual({error:GENERIC_DASHBOARD_ERROR,i18n:{key:GENERIC_DASHBOARD_ERROR,params:{}}});
});
it('preserves auth status and localizes a navigation error without reflecting OAuth input',async()=>{
 const {base}=await fixture();const response=await fetch(base+'/auth/callback?code=private-code&state=%3Cscript%3E',{headers:{Accept:'text/html'}});
 expect(response.status).toBe(400);expect(response.headers.get('content-type')).toContain('text/html');const html=await response.text();
 expect(html).toContain('/i18n-errors.js');expect(html).toContain('/auth-error.js');expect(html).toContain('data-error-key');expect(html).not.toContain('private-code');expect(html).not.toContain('<script>');
 const json=await fetch(base+'/api/me',{headers:{Accept:'text/html'}});expect(json.status).toBe(401);expect(json.headers.get('content-type')).toContain('application/json');
 expect(await json.json()).toMatchObject({i18n:{key:'Sign in with Discord to continue.'}});
});
it('escapes HTML and parameters in the localized error landing page',()=>{
 const html=dashboardErrorPage(new BotMessageError('Added {name}',{name:'"><script>alert(1)</script>{name}'}));
 expect(html).not.toContain('<script>alert');expect(html).toContain('&lt;script&gt;');expect(html).toContain('&quot;');expect(html).not.toContain('redirect_uri');
 expect(dashboardErrorPage(new Error('secret-private-value'))).not.toContain('secret-private-value');
});
it('recognizes only bounded legacy dynamic validators and reverse-matches known translations',()=>{
 expect(dashboardError(new Error('Numeric setting must be between 3 and 30.')).i18n).toEqual({key:'Numeric setting must be between {min} and {max}.',params:{min:3,max:30}});
 expect(dashboardError(new Error('Numeric setting must be between 3 and 5.')).error).toBe(GENERIC_DASHBOARD_ERROR);
 expect(dashboardError(new Error('Unknown setting: private-value')).error).toBe('Unknown setting.');
 expect(dashboardError(new Error('Private value must be a Discord ID.')).error).toBe(GENERIC_DASHBOARD_ERROR);
 expect(dashboardError(new Error(DASHBOARD_TRANSLATIONS['Select a welcome channel.']!.de)).i18n.key).toBe('Select a welcome channel.');
 expect(dashboardError(new HttpError(403,'The server owner has not granted your roles dashboard access.')).i18n.key).toBe('The server owner has not granted your roles dashboard access.');
});
it('covers real community, moderation and publishing validator failures',()=>{
 const validate=(operation:()=>unknown)=>{try{operation();throw new Error('expected failure');}catch(error){expect(dashboardError(error).error).not.toBe(GENERIC_DASHBOARD_ERROR);}};
 for(const input of [[],{counting:null},{counting:{enabled:'yes'}},{welcome:{card:{joinHeading:33}}},{welcome:{autoRoleIds:['invalid']}},{selfRoles:{roles:[{roleId:'123456789012345678',label:''}]}},{verification:{message:33}}])validate(()=>mergeCommunity(defaultGuild().config,input));
 for(const input of [{antiSpam:{maxMessages:1}},{tickets:{types:[{id:'x',name:'',enabled:false,categoryId:null,archiveCategoryId:null,logChannelId:null,staffRoleIds:[],maxOpenPerUser:1}]}},{panels:[{id:'x',name:'x',kind:'tickets',presentation:'buttons',title:'x',description:33,options:[{id:'default',label:'x'}]}]}])validate(()=>mergeModeration(MODERATION_DEFAULT,input));
 for(const input of [{content:33},{embed:{title:33}},{embed:{fields:[{name:'',value:'x',inline:true}]}},{embed:{description:'x',url:'http://example.test'}}])validate(()=>messagePayload(input));
 for(const input of [{question:'',answers:['a','b'],duration:1,multiple:false},{question:'x',answers:['a','a'],duration:1,multiple:false}])validate(()=>pollPayload(input));
});
it('all explicit auth error page labels have catalogue entries and assets are static-safe',()=>{
 const script=readFileSync('public/auth-error.js','utf8');expect(script).not.toMatch(/innerHTML|document\.write|eval\(/);
 for(const key of ['We couldn’t complete that request.','Back to Cyro','Try signing in again'])expect(DASHBOARD_TRANSLATIONS[key]).toBeDefined();
});
it('sanitizes only diagnostic slots while preserving saved custom content and provenance',()=>{
 const record={id:'r',guildId:'123456789012345678',creatorName:'Invalid JSON.',messageTemplate:'Select a welcome channel.',uploadState:{seen:[],deliveries:[],lastError:'provider secret-private-value'}} as never;
 const output=dashboardStream(record) as any;
 expect(output.uploadState.lastError).toBe(GENERIC_DASHBOARD_ERROR);expect(output.uploadState.lastErrorI18n.key).toBe(GENERIC_DASHBOARD_ERROR);
 expect(output.creatorName).toBe('Invalid JSON.');expect(output.messageTemplate).toBe('Select a welcome channel.');expect((record as any).uploadState.lastError).toContain('secret-private-value');
 const snapshot={cases:[{reason:'staff-authored message'}],recoveryIssues:[{id:'same-id',detail:'Operation is still in progress.'},{id:'second-id',detail:'private path C:/private/secret'}]};
 const result=dashboardModerationSnapshot(snapshot) as any;expect(result.cases).toEqual(snapshot.cases);expect(result.recoveryIssues[0].detailI18n.key).toBe('Operation is still in progress.');expect(result.recoveryIssues[1].detail).toBe(GENERIC_DASHBOARD_ERROR);expect(result.recoveryIssues[1].id).toBe('second-id');
 const community=dashboardCommunitySnapshot({inviteTracking:{ready:false,note:'Invite tracking is disabled. Retained history remains available.'}}) as any;expect(community.inviteTracking.noteI18n.key).toBe(community.inviteTracking.note);expect(community.inviteTracking.ready).toBe(false);
});
