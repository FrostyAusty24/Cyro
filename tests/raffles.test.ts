import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Collection, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { RaffleService } from '../src/raffles/service.js';
import { RaffleStore } from '../src/raffles/store.js';
import { addEntries, claimDraw, newRaffle, validateRaffle } from '../src/raffles/types.js';
import { wheelPayload } from '../src/raffles/payload.js';
import { Logger } from '../src/logger.js';
import { RAFFLE_MESSAGE_ROWS } from '../src/i18n/raffles.js';
const guildId='123456789012345678',channelId='223456789012345678',userId='323456789012345678',botId='423456789012345678',otherId='523456789012345678';
const cleanups:(()=>Promise<unknown>)[]=[];
afterEach(async()=>{await Promise.all(cleanups.splice(0).map(fn=>fn()));});
const input=(extra={})=>({id:randomUUID(),title:'Community giveaway',description:'A test prize',color:'#0771e3',channelId,endsAt:null,allowEntries:true,names:['Alex','Jamie','Frosty'],...extra});
async function fixture(){
  const directory=await mkdtemp(path.join(tmpdir(),'cyro-wheel-'));let time=2_000_000_000_000,allowed=true,ready=true,missing=0n,foreign=false,sequence=0;
  const permission={has:(bit:bigint)=>(missing&bit)===0n};
  const member={id:userId,displayName:'Taylor',pending:false,user:{bot:false},permissions:permission};
  const messages=new Collection<string,any>();
  const components=(p:any)=>(p.components??[]).map((row:any)=>({components:row.components.map((button:any)=>({customId:button.data?.custom_id}))}));
  const channel:any={id:channelId,get guildId(){return foreign?otherId:guildId;},type:0,permissionsFor:()=>permission,messages:{fetch:vi.fn(async(v:any)=>typeof v==='string'?messages.get(v):messages)},send:vi.fn(async(p:any)=>{
    const id=String(600000000000000000n+BigInt(++sequence));const message:any={id,guildId,channelId,author:{id:botId},components:components(p),edit:vi.fn(async(next:any)=>{message.components=components(next);return message;})};messages.set(id,message);return message;
  })};
  const guild:any={id:guildId,available:true,channels:{fetch:vi.fn(async(id:string)=>id===channelId?channel:null)},members:{fetchMe:async()=>({id:botId}),fetch:vi.fn(async({user}:any)=>({...member,id:user}))}};
  const client:any={user:{id:botId},isReady:()=>ready,guilds:{cache:new Collection([[guildId,guild]])},on:vi.fn(),off:vi.fn()};
  const access:any={dashboard:vi.fn(async()=>{if(!allowed)throw Error('The server owner has not granted your roles dashboard access.');return member;}),member:vi.fn(async()=>member)};
  const choose=vi.fn((max:number)=>Math.min(1,max-1)),render=vi.fn(async()=>Buffer.from('image'));
  const options={now:()=>time,choose,render};
  const service=new RaffleService(client,directory,new Logger('error'),access,options);await service.init();
  cleanups.push(async()=>{service.stop();await service.flush();await rm(directory,{recursive:true,force:true});});
  const auth=async()=>{await access.dashboard(guild,userId);};
  const create=async(extra={})=>{await service.change(guild,userId,{action:'create',wheel:input(extra)},auth);await service.flush();return service.snapshot(guildId).items[0]!;};
  const interact=(action:string,r:any,overrides:any={})=>({customId:`wheel:${action}:${r.id}`,guildId,guild,channelId,channel,member,user:{id:userId},locale:'en-US',message:messages.get(r.messageId),isButton:()=>true,isUserSelectMenu:()=>false,inCachedGuild:()=>true,deferReply:vi.fn(async()=>undefined),editReply:vi.fn(async()=>undefined),...overrides});
  return {service,directory,guild,client,access,channel,messages,member,choose,render,auth,create,interact,options,now:()=>time,advance:(ms:number)=>{time+=ms;},revoke:()=>{allowed=false;},disconnect:()=>{ready=false;},deny:(bit:bigint)=>{missing=bit;},foreign:()=>{foreign=true;}};
}
it('publishes one embed with controls and persists an idempotent create',async()=>{
  const f=await fixture(),wheel=input();await f.service.change(f.guild,userId,{action:'create',wheel},f.auth);await f.service.change(f.guild,userId,{action:'create',wheel},f.auth);
  expect(f.channel.send).toHaveBeenCalledTimes(1);expect(f.channel.send.mock.calls[0][0]).toMatchObject({enforceNonce:true,allowedMentions:{parse:[]}});expect(f.service.snapshot(guildId).items[0]).toMatchObject({status:'open',needsSync:false});
  const disk=JSON.parse(await readFile(path.join(f.directory,'raffles.json'),'utf8'));expect(disk.guilds[guildId]).toHaveLength(1);
});
it('does not post into foreign channels and reports only missing permissions',async()=>{
  const f=await fixture();f.foreign();await expect(f.create()).rejects.toThrow('Choose a text');expect(f.channel.send).not.toHaveBeenCalled();
  const g=await fixture();g.deny(PermissionFlagsBits.AttachFiles);await expect(g.create()).rejects.toThrow('Attach Files');try{await g.create();}catch(e){expect((e as Error).message).not.toContain('Send Messages');}expect(g.channel.send).not.toHaveBeenCalled();
});
it('rechecks authorization after rendering and does not publish after revocation',async()=>{
  const f=await fixture();f.render.mockImplementation(async()=>{f.revoke();return Buffer.from('image');});await expect(f.create()).rejects.toThrow('roles');expect(f.channel.send).not.toHaveBeenCalled();expect(f.service.snapshot(guildId).items).toHaveLength(0);
});
it('stores one winner before animation and blocks simultaneous spins and late entries',async()=>{
  const f=await fixture(),r=await f.create();await Promise.allSettled([1,2].map(()=>f.service.change(f.guild,userId,{action:'spin',id:r.id,revision:r.revision},f.auth)));await f.service.flush();
  expect(f.choose).toHaveBeenCalledTimes(1);expect(f.choose).toHaveBeenCalledWith(3);expect(f.service.snapshot(guildId).items[0]!.draw!.index).toBeNull();
  const disk=JSON.parse(await readFile(path.join(f.directory,'raffles.json'),'utf8'));expect(disk.guilds[guildId][0].draw.index).toBe(1);
  const joining=f.interact('enter',r);await f.service.handle(joining as never);expect(joining.editReply.mock.calls[0][0].content).toContain('closed');
  f.advance(8_001);await f.service.tick();await f.service.flush();expect(f.service.snapshot(guildId).items[0]).toMatchObject({status:'ended',draw:{index:1},needsSync:false});
});
it('timer and manual spin racing can claim only one draw',async()=>{
  const f=await fixture(),r=await f.create({endsAt:f.now()+60_000});f.advance(60_001);
  await Promise.allSettled([f.service.tick(),f.service.change(f.guild,userId,{action:'spin',id:r.id,revision:r.revision},f.auth)]);await f.service.flush();expect(f.choose).toHaveBeenCalledTimes(1);
});
it('finishes the saved winner after a restart without rerolling',async()=>{
  const f=await fixture(),r=await f.create();await f.service.change(f.guild,userId,{action:'spin',id:r.id,revision:r.revision},f.auth);await f.service.flush();f.service.stop();f.advance(9_000);
  const choose=vi.fn(()=>0),restarted=new RaffleService(f.client,f.directory,new Logger('error'),f.access,{...f.options,choose});await restarted.init();await restarted.reconcile();await restarted.tick();await restarted.flush();restarted.stop();
  expect(restarted.snapshot(guildId).items[0]).toMatchObject({status:'ended',draw:{index:1}});expect(choose).not.toHaveBeenCalled();
});
it('recovers overdue open wheels and empty wheels safely',async()=>{
  const f=await fixture(),r=await f.create({names:[],endsAt:f.now()+60_000});f.advance(60_001);await f.service.tick();await f.service.flush();expect(f.choose).not.toHaveBeenCalled();expect(f.service.snapshot(guildId).items[0]).toMatchObject({id:r.id,status:'ended',draw:{index:null}});
});
it('keeps the saved draw when animation fails and posts a written result',async()=>{
  const f=await fixture(),r=await f.create();f.render.mockRejectedValue(Error('Encoder failed'));await f.service.change(f.guild,userId,{action:'spin',id:r.id,revision:r.revision},f.auth);await f.service.flush();
  expect(f.service.snapshot(guildId).items[0]).toMatchObject({status:'ended',draw:{index:1,animationFailed:true},needsSync:false});
  expect(f.messages.get(r.messageId!)!.edit.mock.calls.at(-1)[0].embeds[0].fields.some((v:any)=>v.name==='Winner'&&v.value==='Jamie')).toBe(true);
});
it('recovers an uncertain post by identity without sending another message',async()=>{
  const f=await fixture(),send=f.channel.send.getMockImplementation()!;f.channel.send.mockImplementationOnce(async(p:any)=>{await send(p);throw Error('Lost acknowledgement');});
  const r=await f.create();expect(r.status).toBe('posting');expect(r.problem).toBe('posting');await f.service.reconcile();await f.service.tick();await f.service.flush();expect(f.service.snapshot(guildId).items[0]).toMatchObject({status:'open'});expect(f.channel.send).toHaveBeenCalledTimes(1);
});
it('leaves an unconfirmed post for review and refuses blind resends',async()=>{
  const f=await fixture();f.channel.send.mockRejectedValueOnce(Error('Network outcome unknown'));const r=await f.create();await f.service.reconcile();expect(f.service.snapshot(guildId).items[0]!.status).toBe('posting');
  await expect(f.service.change(f.guild,userId,{action:'resolve',id:r.id,revision:r.revision},f.auth)).rejects.toThrow('unconfirmed');expect(f.channel.send).toHaveBeenCalledTimes(1);
});
it('enforces one membership entry, private confirmations and leave ownership',async()=>{
  const f=await fixture(),r=await f.create();const join=f.interact('enter',r);await f.service.handle(join as never);await f.service.flush();expect(join.deferReply).toHaveBeenCalledWith({flags:MessageFlags.Ephemeral});expect(f.service.snapshot(guildId).items[0]!.entries).toHaveLength(4);
  const again=f.interact('enter',r);await f.service.handle(again as never);expect(again.editReply.mock.calls[0][0].content).toContain('already');
  const leave=f.interact('leave',r);await f.service.handle(leave as never);await f.service.flush();expect(f.service.snapshot(guildId).items[0]!.entries).toHaveLength(3);
});
it('rejects forged post IDs, bots, revoked staff authority and cross-guild wheel access',async()=>{
  const f=await fixture(),r=await f.create();const forged=f.interact('spin',r,{message:{...f.messages.get(r.messageId!),id:'999999999999999999'}});await f.service.handle(forged as never);expect(forged.editReply.mock.calls[0][0].content).toContain('verified');
  f.member.user.bot=true;const bot=f.interact('enter',r);await f.service.handle(bot as never);expect(bot.editReply.mock.calls[0][0].content).toContain('human');f.member.user.bot=false;
  f.revoke();const spin=f.interact('spin',r);await f.service.handle(spin as never);expect(f.choose).not.toHaveBeenCalled();
  expect(f.service.snapshot(otherId).items).toHaveLength(0);await expect(f.service.change({...f.guild,id:otherId},userId,{action:'spin',id:r.id,revision:r.revision},async()=>{})).rejects.toThrow('no longer exists');
});
it('rejects stale management actions, caps entries and cancels without drawing',async()=>{
  const f=await fixture(),r=await f.create();await f.service.change(f.guild,userId,{action:'add',id:r.id,revision:r.revision,names:['Morgan']},f.auth);await f.service.flush();
  await expect(f.service.change(f.guild,userId,{action:'cancel',id:r.id,revision:r.revision},f.auth)).rejects.toThrow('changed');const fresh=f.service.snapshot(guildId).items[0]!;
  await expect(f.service.change(f.guild,userId,{action:'add',id:r.id,revision:fresh.revision,names:Array.from({length:100},(_,i)=>`Person ${i}`)},f.auth)).rejects.toThrow('100');
  await f.service.change(f.guild,userId,{action:'cancel',id:r.id,revision:fresh.revision},f.auth);await f.service.flush();expect(f.choose).not.toHaveBeenCalled();expect(f.service.snapshot(guildId).items[0]!.status).toBe('cancelled');
});
it('preserves data on validation failure and refuses malformed stored data',async()=>{
  const f=await fixture();await f.create();const file=path.join(f.directory,'raffles.json'),before=await readFile(file,'utf8');
  await expect(f.create({names:['Alex','alex']})).rejects.toThrow('once');expect(await readFile(file,'utf8')).toBe(before);
  await writeFile(file,'{invalid');await expect(new RaffleStore(f.directory).init()).rejects.toThrow();expect(await readFile(file,'utf8')).toBe('{invalid');
});
it('only purges the confirmed guild and stops all intake before shutdown',async()=>{
  const f=await fixture();await f.create();await f.service.purgeGuild(guildId,()=>false);expect(f.service.snapshot(guildId).items).toHaveLength(1);await f.service.purgeGuild(guildId);expect(f.service.snapshot(guildId).items).toHaveLength(0);f.service.stop();await expect(f.create()).rejects.toThrow('stopping');
});
it('uses the saved index for every equal-sized slice and rejects invalid random output',()=>{
  const r=newRaffle(input(),userId,100);r.status='open';r.messageId='623456789012345678';
  expect(()=>claimDraw(r,200,()=>3)).toThrow('Invalid random');expect(r.draw).toBeNull();expect(claimDraw(r,200,()=>0)).toBe(true);expect(claimDraw(r,201,()=>2)).toBe(false);expect(r.draw!.index).toBe(0);validateRaffle(r);
});
it('does not ping mentions or reveal the winner in the spinning embed',()=>{
  const r=newRaffle(input({names:['@everyone','**prize**']}),userId,100);r.status='open';r.messageId='623456789012345678';claimDraw(r,200,()=>0);const p=wheelPayload(guildId,r);expect(p.allowedMentions).toEqual({parse:[],repliedUser:false});expect(JSON.stringify(p.embeds)).not.toContain('Winner');
});
it('keeps complete five-language raffle strings with matching placeholders',()=>{
  for(const row of RAFFLE_MESSAGE_ROWS){expect(row).toHaveLength(5);const placeholders=(s:string)=>[...s.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map(m=>m[1]).sort();for(const text of row.slice(1)){expect(text.trim()).not.toBe('');expect(placeholders(text)).toEqual(placeholders(row[0]));}}
});
