import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Collection, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { CustomCommandsService, RESERVED_COMMANDS } from '../src/custom-commands/service.js';
import { CustomCommandStore } from '../src/custom-commands/store.js';
import { parseCommand, renderTemplate } from '../src/custom-commands/types.js';
import { Logger } from '../src/logger.js';
import { botText, setBotLocaleResolver } from '../src/i18n/index.js';
import { CUSTOM_COMMAND_MESSAGE_ROWS } from '../src/i18n/custom-commands.js';
import { dashboardError } from '../src/i18n/dashboard-errors.js';

const guildId = '123456789012345678', otherId = '223456789012345678', channelId = '323456789012345678', userId = '423456789012345678';
const dirs: string[] = [];
afterEach(async () => { setBotLocaleResolver(()=>'en'); await Promise.all(dirs.splice(0).map(p=>rm(p,{recursive:true,force:true}))); });
function config(overrides = {}) { return { id: randomUUID(), revision: 0, name: 'rules', description: 'Read our rules', mode: 'text', content: 'Hello {mention}, welcome to {server}!', title: '', color: '#0771e3', channelIds: [], ephemeral: false, ...overrides }; }
async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-custom-')); dirs.push(dir);
  let nextId = 523456789012345678n;
  const guild = (id: string) => {
    const remote = new Collection<string, any>();
    const commands = { fetch: vi.fn(async()=>remote), create: vi.fn(async(body:any)=>{const c={...body,id:String(nextId++),options:body.options??[]};remote.set(c.id,c);return c;}),
      edit: vi.fn(async(id:string,body:any)=>{const c={...remote.get(id),...body};remote.set(id,c);return c;}), delete: vi.fn(async(id:string)=>{remote.delete(id);}) };
    return {id,name:'Server {mention}',available:true,commands,remote,channels:{fetch:vi.fn(async(id2:string)=>({id:id2,guildId:id,type:0})),cache:new Collection([[channelId,{permissionsFor:()=>({has:()=>true})}]])}};
  };
  const a=guild(guildId), b=guild(otherId), client={guilds:{cache:new Collection([[a.id,a],[b.id,b]])},on:vi.fn(),off:vi.fn()};
  const service=new CustomCommandsService(client as never,dir,new Logger('error'));await service.init();
  const auth=vi.fn(async()=>{});
  const save=(c:any,g:any=a)=>service.change(g,{action:'save',command:c},auth);
  return {dir,a,b,client,service,save,auth};
}
function interaction(record: any, overrides = {}) {
  return { isChatInputCommand:()=>true,inCachedGuild:()=>true,guildId,commandName:record.name,commandId:record.discordId,user:{id:userId,username:'member'},locale:'en-US',member:{pending:false},channelId,
    channel:{isThread:()=>false},guild:{id:guildId,name:'Server {mention}',channels:{cache:new Collection([[channelId,{permissionsFor:()=>({has:()=>true})}]])}},appPermissions:{has:()=>true},reply:vi.fn(async()=>{}),...overrides };
}
it('registers guild-owned commands immediately without overwriting unrelated commands or other guilds',async()=>{
  const f=await fixture(), command=config(); f.a.remote.set('623456789012345678',{id:'623456789012345678',name:'unrelated',type:1,options:[]});
  const a=await f.save(command),b=await f.save({...command,id:randomUUID(),content:'Other server'},f.b);
  expect(a.commands[0]).toMatchObject({status:'synced',revision:1});expect(b.commands[0]?.content).toBe('Other server');
  expect(f.a.commands.create).toHaveBeenCalledExactlyOnceWith({name:'rules',description:'Read our rules',type:1,options:[],defaultMemberPermissions:null,nsfw:false});
  expect(f.a.remote.has('623456789012345678')).toBe(true);expect(f.auth).toHaveBeenCalledTimes(4);
  const loaded=new CustomCommandStore(f.dir);await loaded.init();expect(loaded.get(guildId)).toEqual(a.commands);
});
it('protects built-in names, duplicate names, foreign channels and cross-server record IDs',async()=>{
  const f=await fixture();
  for(const name of ['help','dashboard','time','room','ttsvoice1']) {expect(RESERVED_COMMANDS.has(name)).toBe(true);await expect(f.save(config({name}))).rejects.toThrow('reserved');}
  const original=await f.save(config());await expect(f.save(config())).rejects.toThrow('already exists');
  f.a.channels.fetch.mockResolvedValueOnce({id:channelId,guildId:otherId,type:0});await expect(f.save(config({name:'links',channelIds:[channelId]}))).rejects.toThrow('belonging');
  await expect(f.service.change(f.b as never,{action:'delete',id:original.commands[0]!.id,revision:1},f.auth)).rejects.toThrow('another session');
  expect(f.service.snapshot(guildId).commands).toHaveLength(1);
});
it('serializes same-name saves and rejects stale revisions and revoked access before registration',async()=>{
  const f=await fixture();const result=await Promise.allSettled([f.save(config()),f.save(config())]);expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  const record=f.service.snapshot(guildId).commands[0]!;const {discordId,status,...input}=record;
  await expect(f.save({...input,revision:0})).rejects.toThrow('another session');
  f.auth.mockRejectedValueOnce(Error('Revoked'));await expect(f.save({...input,content:'Changed'})).rejects.toThrow('Revoked');
  expect(f.a.commands.create).toHaveBeenCalledTimes(1);expect(f.a.commands.edit).not.toHaveBeenCalled();
});
it('rechecks authority after channel and command fetches, before persisting desired state',async()=>{
  const f=await fixture();f.auth.mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error('Revoked'));
  await expect(f.save(config())).rejects.toThrow('Revoked');expect(f.a.commands.create).not.toHaveBeenCalled();expect(f.service.snapshot(guildId).commands).toEqual([]);
});
it('updates by command ID, including renames, and deletes only that custom command',async()=>{
  const f=await fixture();let r=(await f.save(config())).commands[0]!;const {discordId,status,...input}=r;
  r=(await f.save({...input,name:'server',description:'Our server',content:'Changed'})).commands[0]!;
  expect(r.discordId).toBe(discordId);expect(f.a.commands.edit).toHaveBeenCalledTimes(1);expect(f.a.commands.create).toHaveBeenCalledTimes(1);
  await f.service.change(f.a as never,{action:'delete',id:r.id,revision:r.revision},f.auth);expect(f.a.commands.delete).toHaveBeenCalledExactlyOnceWith(discordId);expect(f.service.snapshot(guildId).commands).toEqual([]);
});
it('recovers an uncertain create on restart without duplicate registration',async()=>{
  const f=await fixture();const create=f.a.commands.create.getMockImplementation()!;f.a.commands.create.mockImplementationOnce(async body=>{await create(body);throw Error('Timeout');});
  const record=(await f.save(config())).commands[0]!;expect(record.status).toBe('error');expect(record.discordId).toBeNull();
  const restarted=new CustomCommandsService(f.client as never,f.dir,new Logger('error'));await restarted.init();await restarted.reconcile();
  expect(restarted.snapshot(guildId).commands[0]?.status).toBe('synced');expect(f.a.commands.create).toHaveBeenCalledTimes(1);expect(f.a.remote.size).toBe(1);
});
it('retains failed deletion until a retry confirms absence',async()=>{
  const f=await fixture();const r=(await f.save(config())).commands[0]!;
  f.a.commands.delete.mockImplementationOnce(async id=>{f.a.remote.delete(id);throw Error('Timeout');});
  await f.service.change(f.a as never,{action:'delete',id:r.id,revision:r.revision},f.auth);const pending=f.service.snapshot(guildId).commands[0]!;expect(pending.status).toBe('deleting');
  await f.service.change(f.a as never,{action:'sync',id:r.id,revision:pending.revision},f.auth);expect(f.service.snapshot(guildId).commands).toHaveLength(0);expect(f.a.commands.delete).toHaveBeenCalledTimes(1);
});
it('blocks edits to a pending create until its uncertain result is resolved',async()=>{
  const f=await fixture();f.a.commands.create.mockRejectedValue(Error('Unavailable'));let r=(await f.save(config())).commands[0]!;const {discordId,status,...input}=r;
  await expect(f.save({...input,name:'renamed'})).rejects.toThrow('Finish syncing');expect(f.service.snapshot(guildId).commands[0]?.name).toBe('rules');
});
it('sends plain or embed replies with single-pass placeholders and only the invoking-user mention allowed',async()=>{
  const f=await fixture();const r=(await f.save(config())).commands[0]!,i=interaction(r);await f.service.handle(i as never);
  expect(i.reply).toHaveBeenCalledExactlyOnceWith({content:`Hello <@${userId}>, welcome to Server {mention}!`,allowedMentions:{parse:[],users:[userId],repliedUser:false}});
  const {discordId,status,...input}=r;const e=(await f.save({...input,mode:'embed',content:'@everyone {user}',title:'{server}',ephemeral:true})).commands[0]!,j=interaction(e);await f.service.handle(j as never);
  expect(j.reply).toHaveBeenCalledExactlyOnceWith({embeds:[{title:'Server {mention}',description:'@everyone member',color:0x0771e3}],flags:MessageFlags.Ephemeral,allowedMentions:{parse:[],users:[userId],repliedUser:false}});
});
it('privately redirects wrong-channel use, includes threads and never exposes hidden channel names',async()=>{
  const f=await fixture(),r=(await f.save(config({channelIds:[channelId]}))).commands[0]!;
  const wrong=interaction(r,{channelId:otherId});await f.service.handle(wrong as never);
  expect(wrong.reply.mock.calls[0]?.[0]).toMatchObject({flags:MessageFlags.Ephemeral,content:`Use this command in: <#${channelId}>`});
  const hidden=interaction(r,{channelId:otherId,guild:{id:guildId,name:'Guild',channels:{cache:new Collection()}}});await f.service.handle(hidden as never);
  expect(hidden.reply.mock.calls[0]?.[0].content).not.toContain(channelId);
  const thread=interaction(r,{channelId:otherId,channel:{isThread:()=>true,parentId:channelId}});await f.service.handle(thread as never);expect(thread.reply.mock.calls[0]?.[0].content).toContain('Hello');
});
it('responds privately to stale commands, screening and missing Embed Links; ignores built-ins',async()=>{
  const f=await fixture(),r=(await f.save(config({mode:'embed'}))).commands[0]!;
  for(const override of [{commandId:otherId},{member:{pending:true}},{appPermissions:{has:()=>false}}]) {const i=interaction(r,override);await f.service.handle(i as never);expect(i.reply.mock.calls[0]?.[0].flags).toBe(MessageFlags.Ephemeral);expect(i.reply.mock.calls[0]?.[0].embeds).toBeUndefined();}
  const builtIn=interaction(r,{commandName:'dashboard'});await f.service.handle(builtIn as never);expect(builtIn.reply).not.toHaveBeenCalled();
});
it('validates limits, keeps malformed stores intact, handles retention and stops new work',async()=>{
  for(const patch of [{name:'BAD'},{name:'a b'},{name:'a'.repeat(33)},{description:''},{content:'x'.repeat(2001)},{channelIds:[channelId,channelId]},{ephemeral:'false'},{color:'javascript:x'},{guildId:otherId}]) expect(()=>parseCommand(config(patch))).toThrow();
  expect(parseCommand(config({name:'règles'})).name).toBe('règles');expect(renderTemplate('{server}'.repeat(60),{server:'x'.repeat(100)},2000).length).toBe(2000);
  const f=await fixture();await f.save(config());await f.service.purgeGuild(guildId,()=>false);expect(f.service.snapshot(guildId).commands).toHaveLength(1);await f.service.purgeGuild(guildId);expect(f.service.snapshot(guildId).commands).toHaveLength(0);
  f.service.stop();await expect(f.save(config())).rejects.toThrow('stopping');await f.service.flush();
  const file=path.join(f.dir,'custom-commands.json');await writeFile(file,'broken');await expect(new CustomCommandStore(f.dir).init()).rejects.toThrow();expect(await readFile(file,'utf8')).toBe('broken');
});
it('has non-English interface and error copy while preserving inserted user text',()=>{
  for(const [en,fr,es,de,pt] of CUSTOM_COMMAND_MESSAGE_ROWS){expect([en,fr,es,de,pt].every(Boolean)).toBe(true);expect(dashboardError(Error(en)).error).toBe(en);for(const [locale,expected] of Object.entries({fr,es,de,pt})){setBotLocaleResolver(()=>locale);expect(botText(guildId,en)).toBe(expected);}}
});

it('enforces the per-server command cap without registering an overflow command', async()=>{
  const f=await fixture();for(let i=0;i<25;i++)await f.save(config({name:'custom_'+i}));
  await expect(f.save(config({name:'overflow'}))).rejects.toThrow('limit of 25');expect(f.a.commands.create).toHaveBeenCalledTimes(25);
});
