import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Collection, PermissionFlagsBits, PermissionsBitField, type Guild, type Client } from 'discord.js';
import { afterEach, expect, it, vi } from 'vitest';
import { AccessService, assertNotAccessRole, setProtectedRoleResolver } from '../src/control/access.js';
import { ControlStore, defaultAccess, parseAccess } from '../src/control/store.js';
import { messagePayload, pollPayload, PublishingService, PublishingError } from '../src/control/publishing.js';
import { mergeConfig } from '../src/community/config.js';
import { defaultGuild } from '../src/community/types.js';
import { renderMemberCard } from '../src/community/member-card.js';
import { loadImage, createCanvas } from '@napi-rs/canvas';

const A='123456789012345678', B='223456789012345678', R='323456789012345678', U='423456789012345678', C='523456789012345678';
const folders:string[]=[];
afterEach(async()=>{setProtectedRoleResolver(()=>false);await Promise.all(folders.splice(0).map(f=>rm(f,{recursive:true,force:true})));});
async function fixture(){
  const dir=await mkdtemp(path.join(os.tmpdir(),'cyro-control-'));folders.push(dir);
  const store=new ControlStore(dir);await store.init();const access=new AccessService(store);
  const guild:any={id:A,ownerId:'owner',fetch:vi.fn(async()=>guild),roles:{fetch:vi.fn(async()=>guild.roles.cache),cache:new Collection([[R,{id:R,managed:false}]])}};
  const member:any={id:U,guild,pending:false,permissions:new PermissionsBitField(),roles:{cache:new Collection()}};
  guild.members={fetch:vi.fn(async()=>member),fetchMe:vi.fn(async()=>({id:'bot'}))};
  const channel:any={id:C,guild,type:0,permissionsFor:vi.fn(()=>new PermissionsBitField(PermissionFlagsBits.Administrator)),send:vi.fn(async()=>({id:'623456789012345678'}))};
  guild.channels={fetch:vi.fn(async()=>channel)};
  return {dir,store,access,guild:guild as Guild,member,channel,publisher:new PublishingService({user:{id:'bot'}} as Client,store,access)};
}
it('isolates grants between guilds and revokes role access on the next fresh membership lookup',async()=>{
  const f=await fixture();await f.store.mutate(A,g=>g.access.dashboardRoleIds=[R]);f.member.roles.cache.set(R,{id:R});
  await expect(f.access.dashboard(f.guild,U)).resolves.toBe(f.member);
  expect(f.access.config(B)).toEqual(defaultAccess());
  f.member.roles.cache.clear();await expect(f.access.dashboard(f.guild,U)).rejects.toThrow('not granted');
  expect(f.guild.members.fetch).toHaveBeenCalledWith({user:U,force:true});
});
it('only the current owner can change grants and cross-guild/everyone roles are rejected',async()=>{
  const f=await fixture();await expect(f.access.update(f.guild,U,defaultAccess())).rejects.toThrow('owner');
  await expect(f.access.update(f.guild,'owner',{...defaultAccess(),dashboardRoleIds:[B]})).rejects.toThrow('this server');
  await expect(f.access.update(f.guild,'owner',{...defaultAccess(),dashboardRoleIds:[R]})).resolves.toMatchObject({dashboardRoleIds:[R]});
  const restored=new ControlStore(f.dir);await restored.init();expect(restored.get(A).access.dashboardRoleIds).toEqual([R]);
  expect(JSON.parse(await readFile(path.join(f.dir,'control.json'),'utf8')).version).toBe(1);
});
it('command restrictions grant selected roles, deny others and do not trust stale Manage Server',async()=>{
  const f=await fixture();await expect(f.access.command(f.guild,U,'twitch',true)).rejects.toThrow('roles');
  await f.store.mutate(A,g=>g.access.commandRoles={twitch:[R],counting:[R]});
  await expect(f.access.command(f.guild,U,'counting',true)).rejects.toThrow('roles');
  f.member.roles.cache.set(R,{id:R});await expect(f.access.command(f.guild,U,'twitch',false)).resolves.toBeUndefined();
  f.member.id='owner';await expect(f.access.command(f.guild,'owner','counting',false)).resolves.toBeUndefined();
});
it('prevents automatic assignment of roles granting dashboard or command access',async()=>{
  const f=await fixture();await f.store.mutate(A,g=>g.access.commandRoles={twitch:[R]});setProtectedRoleResolver((g,r)=>f.access.protectedRole(g,r));
  expect(()=>assertNotAccessRole(A,R)).toThrow('cannot be granted');expect(()=>assertNotAccessRole(B,R)).not.toThrow();
  expect(()=>parseAccess({...defaultAccess(),commandRoles:{constructor:[R]}})).toThrow('Unknown');
});
it('supports server-specific suggestion command roles while allowing members by default',async()=>{
  const f=await fixture();
  await expect(f.access.command(f.guild,U,'suggestion',true)).resolves.toBeUndefined();
  const config=parseAccess({...defaultAccess(),commandRoles:{suggestion:[R]}});
  await f.store.mutate(A,g=>{g.access=config;});
  await expect(f.access.command(f.guild,U,'suggestion',true)).rejects.toThrow('roles');
  f.member.roles.cache.set(R,{id:R});
  await expect(f.access.command(f.guild,U,'suggestion',true)).resolves.toBeUndefined();
  expect(f.access.config(B).commandRoles).toEqual({});
  const restored=new ControlStore(f.dir);await restored.init();
  expect(restored.get(A).access.commandRoles.suggestion).toEqual([R]);
});
it('validates embed budgets, URLs and mentions without fetching linked images',()=>{
  const payload=messagePayload({content:'@everyone',embed:{title:'News',description:'Hello',color:null,image:'https://example.com/banner.png',fields:[]}});
  expect(payload.allowedMentions?.parse).toEqual([]);expect(payload.embeds?.[0]).not.toHaveProperty('color');
  expect(()=>messagePayload({embed:{description:'a'.repeat(4096),footer:'b'.repeat(2000)}})).toThrow('6,000');
  expect(()=>messagePayload({embed:{image:'http://127.0.0.1/a'}})).toThrow('HTTPS');
  expect(()=>messagePayload({content:'a'.repeat(2001)})).toThrow();expect(()=>messagePayload({})).toThrow();
});
it('validates native polls and bounds duration and answers',()=>{
  expect(pollPayload({question:'Pick a day',answers:['Monday','Tuesday'],duration:24,multiple:true}).poll).toMatchObject({allowMultiselect:true,duration:24});
  for(const patch of [{duration:769},{duration:0},{answers:['Yes','yes']},{answers:['One']},{answers:['a'.repeat(56),'B']},{question:''}])expect(()=>pollPayload({question:'Q',answers:['A','B'],duration:24,multiple:false,...patch})).toThrow();
});
it('saves send receipts, deduplicates double submissions and rejects changed replay content',async()=>{
  const f=await fixture();f.member.permissions=new PermissionsBitField(PermissionFlagsBits.ManageGuild);
  const input={channelId:C,operationId:'aaaaaaaa-bbbb-cccc-dddd',content:'Test'};
  const [a,b]=await Promise.all([f.publisher.publish(f.guild,U,input,'message'),f.publisher.publish(f.guild,U,input,'message')]);
  expect(a.messageId).toBe(b.messageId);expect(f.channel.send).toHaveBeenCalledOnce();expect(f.channel.send.mock.calls[0][0]).toMatchObject({enforceNonce:true,allowedMentions:{parse:[]}});
  await expect(f.publisher.publish(f.guild,U,{...input,content:'Changed'},'message')).rejects.toThrow('different content');
});
it('keeps an uncertain send durable across restart and never blindly resends it',async()=>{
  const f=await fixture();f.member.permissions=new PermissionsBitField(PermissionFlagsBits.ManageGuild);f.channel.send.mockRejectedValue(new Error('Connection lost'));
  const input={channelId:C,operationId:'bbbbbbbb-cccc-dddd-eeee',content:'Test'};
  await expect(f.publisher.publish(f.guild,U,input,'message')).rejects.toThrow('Connection lost');
  const restored=new ControlStore(f.dir);await restored.init();const again=new PublishingService({} as Client,restored,new AccessService(restored));
  await expect(again.publish(f.guild,U,input,'message')).rejects.toThrow('unknown outcome');expect(f.channel.send).toHaveBeenCalledOnce();
});
it('denies publishing without channel access and without Send Polls; no receipt or message is created',async()=>{
  const f=await fixture();f.member.permissions=new PermissionsBitField(PermissionFlagsBits.ManageGuild);f.channel.permissionsFor.mockReturnValue(new PermissionsBitField());
  await expect(f.publisher.publish(f.guild,U,{channelId:C,operationId:'cccccccc-dddd-eeee-ffff',question:'Q',answers:['A','B'],duration:24,multiple:false},'poll')).rejects.toThrow('View Channel');
  expect(f.channel.send).not.toHaveBeenCalled();expect(f.store.get(A).posts).toHaveLength(0);
});
it('renders custom backgrounds and optional bars while migrating old card settings',async()=>{
  const config=mergeConfig(defaultGuild().config,{welcome:{card:{background:'custom',backgroundColor:'#123456',bar:'none',decoration:false,showAvatar:false,showDivider:false,nameText:'',subtitle:'',joinHeading:'',joinFooter:'',brandText:''}}});
  const png=await renderMemberCard({kind:'join',displayName:'Test',serverName:'Server',memberCount:4,settings:config.welcome.card});
  const canvas=createCanvas(960,340),ctx=canvas.getContext('2d');ctx.drawImage(await loadImage(png),0,0);
  expect([...ctx.getImageData(1,160,1,1).data]).toEqual([18,52,86,255]);
  config.welcome.card.bar='left';config.welcome.card.barColor='#FF0000';ctx.drawImage(await loadImage(await renderMemberCard({kind:'join',displayName:'Test',serverName:'Server',memberCount:4,settings:config.welcome.card})),0,0);
  expect([...ctx.getImageData(1,160,1,1).data]).toEqual([255,0,0,255]);
  expect(mergeConfig(defaultGuild().config,{welcome:{card:{accentColor:'#ffffff'}}}).welcome.card.nameText).toBe('{user}');
});

it('publishes plain text without Embed Links and refreshes current channel and bot membership', async()=>{
  const f=await fixture();f.member.permissions=new PermissionsBitField(PermissionFlagsBits.ManageGuild);
  f.channel.permissionsFor.mockReturnValue(new PermissionsBitField([PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages]));
  await expect(f.publisher.publish(f.guild,U,{channelId:C,operationId:'plain-text-publish-1234',content:'A plain message'},'message')).resolves.toMatchObject({status:'sent'});
  expect(f.guild.channels.fetch).toHaveBeenCalledWith(C,{force:true});
  expect(f.guild.members.fetchMe).toHaveBeenCalledWith({force:true});
  expect(f.channel.send.mock.calls[0][0]).not.toHaveProperty('embeds');
});

it('names only missing bot permissions and confirms a preflight refusal sent nothing', async()=>{
  const f=await fixture();f.member.permissions=new PermissionsBitField(PermissionFlagsBits.ManageGuild);
  f.channel.permissionsFor.mockImplementation((member:any)=>new PermissionsBitField(member.id==='bot'?[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages]:PermissionFlagsBits.Administrator));
  const failure=await f.publisher.publish(f.guild,U,{channelId:C,operationId:'missing-embed-links-1234',embed:{title:'News'}},'message').catch(error=>error);
  expect(failure).toBeInstanceOf(PublishingError);
  expect(failure.publishOutcome).toBe('not_sent');
  expect(failure.message).toContain('permissions in this channel: Embed Links.');
  expect(failure.message).not.toContain('View Channel');
  expect(failure.message).not.toContain('Send Messages');
  expect(f.channel.send).not.toHaveBeenCalled();expect(f.store.get(A).posts).toHaveLength(0);
});

it('checks Send Polls separately without requiring Embed Links', async()=>{
  const f=await fixture();f.member.permissions=new PermissionsBitField(PermissionFlagsBits.ManageGuild);
  const basic=[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages];
  f.channel.permissionsFor.mockReturnValue(new PermissionsBitField(basic));
  const input={channelId:C,operationId:'missing-send-polls-1234',question:'Q',answers:['A','B'],duration:24,multiple:false};
  await expect(f.publisher.publish(f.guild,U,input,'poll')).rejects.toMatchObject({publishOutcome:'not_sent',message:expect.stringContaining('permissions in this channel: Send Polls.')});
  f.channel.permissionsFor.mockReturnValue(new PermissionsBitField([...basic,PermissionFlagsBits.SendPolls]));
  await expect(f.publisher.publish(f.guild,U,input,'poll')).resolves.toMatchObject({status:'sent'});
});

it('never labels a previous uncertain operation as not sent after permissions or content change', async()=>{
  const f=await fixture();f.member.permissions=new PermissionsBitField(PermissionFlagsBits.ManageGuild);
  f.channel.send.mockRejectedValue(new Error('Connection lost'));
  const input={channelId:C,operationId:'unknown-outcome-publish-1234',content:'Test'};
  await expect(f.publisher.publish(f.guild,U,input,'message')).rejects.toMatchObject({publishOutcome:'unknown'});
  f.channel.permissionsFor.mockImplementation((member:any)=>new PermissionsBitField(member.id==='bot'?[]:PermissionFlagsBits.Administrator));
  await expect(f.publisher.publish(f.guild,U,input,'message')).rejects.toMatchObject({publishOutcome:'unknown',message:expect.stringContaining('View Channel, Send Messages')});
  await expect(f.publisher.publish(f.guild,U,{...input,content:''},'message')).rejects.toMatchObject({publishOutcome:'unknown'});
  expect(f.channel.send).toHaveBeenCalledOnce();
});

it('preserves sent receipts on changed replay and does not disclose another actor’s post', async()=>{
  const f=await fixture();f.member.permissions=new PermissionsBitField(PermissionFlagsBits.ManageGuild);
  const input={channelId:C,operationId:'completed-publish-1234',content:'Private original content'};
  await f.publisher.publish(f.guild,U,input,'message');
  const other=await f.publisher.publish(f.guild,'another-actor',{...input,content:'Another message'},'message').catch(error=>error);
  expect(other).toMatchObject({publishOutcome:'unknown',message:'This publish request was already used for different content.'});
  expect(other.message).not.toContain('Private original');expect(other).not.toHaveProperty('post');
  expect(f.channel.send).toHaveBeenCalledOnce();
});
