import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Collection, PermissionsBitField, PermissionFlagsBits as P } from 'discord.js';
import { afterEach, expect, it, vi } from 'vitest';
import { ModerationService } from '../src/moderation/index.js';
import { ModerationPersistenceError } from '../src/moderation/store.js';

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map(directory => rm(directory, { force: true, recursive: true }))); });
const guildId='123456789012345678', ownerId='223456789012345678', botId='323456789012345678', channelId='423456789012345678', logId='523456789012345678';
async function fixture() {
  const directory=await mkdtemp(path.join(tmpdir(),'ticket-delete-')); directories.push(directory);
  const history:any[]=[{id:'100',author:{tag:'Member',id:ownerId},createdAt:new Date(0),content:'Please help',attachments:new Collection(),embeds:[]}];
  const bot={id:botId}, actor={id:ownerId,permissions:{has:()=>true},roles:{cache:new Map()}};
  const guild:any={id:guildId,available:true,members:{fetch:async()=>actor,fetchMe:async()=>bot},roles:{fetch:async()=>new Collection()}};
  const logMessages=new Collection<string,any>();
  const events:string[]=[];
  const channel:any={id:channelId,guild,type:0,name:'ticket-member',permissionsFor:()=>({has:()=>true}),
    messages:{fetch:vi.fn(async({before,limit}:any)=>{events.push('read');return new Collection(history.filter(m=>!before||BigInt(m.id)<BigInt(before)).sort((a,b)=>Number(BigInt(b.id)-BigInt(a.id))).slice(0,limit).map(m=>[m.id,m]));})},
    permissionOverwrites:{cache:new Collection([[ownerId,{id:ownerId,type:1,allow:new PermissionsBitField([P.ViewChannel,P.SendMessages]),deny:new PermissionsBitField()}]]),set:vi.fn(async()=>{events.push('freeze');})},
    threads:{fetchActive:vi.fn(async()=>({threads:new Collection()})),fetchArchived:vi.fn(async(options:{limit:number})=>{if(options.limit<2)throw new Error('Discord requires an archived-thread limit of at least 2');return {threads:new Collection()};})},fetchWebhooks:vi.fn(async()=>new Collection()),setName:vi.fn(),delete:vi.fn()};
  const log:any={id:logId,guild,type:0,permissionsFor:()=>({has:()=>true}),permissionOverwrites:{cache:new Collection()},
    send:vi.fn(async(payload:any)=>{events.push('send'); const message={id:'623456789012345678',author:{id:botId},content:payload.content??'',embeds:payload.embeds?.map((embed:any)=>embed.toJSON())??[],attachments:new Collection([['file',{name:payload.files[0].name,size:payload.files[0].attachment.length}]])};logMessages.set(message.id,message);return message;}),
    messages:{fetch:vi.fn(async(query:any)=>query.message ? logMessages.get(query.message)??null : logMessages)}};
  const channels=new Map([[channelId,channel],[logId,log]]);
  guild.channels={fetch:vi.fn(async(id?:string)=>id?channels.get(id)??null:channels)};
  channel.delete.mockImplementation(async()=>{events.push('delete');channels.delete(channelId);});
  const client:any={user:{id:botId},isReady:()=>true,guilds:{cache:new Map([[guildId,guild]])}};
  const logger:any={warn:vi.fn(),error:vi.fn()};
  const service=new ModerationService(client,directory,logger);await service.init();
  await (service as any).store.update(guildId,(data:any)=>{data.config.tickets={enabled:true,categoryId:'723456789012345678',archiveCategoryId:null,logChannelId:logId,staffRoleIds:['823456789012345678'],maxOpenPerUser:2,closeAction:'delete'};data.tickets.push({id:'record',channelId,ownerId,status:'open',createdAt:new Date(0).toISOString(),claimedBy:null,claimedAt:null,closedBy:null,closedAt:null});});
  const interaction={guildId,guild,user:{id:ownerId},channelId,editReply:vi.fn(async()=>undefined)};
  const close=(target=service)=>(target as any).ticket(interaction,'close');
  const ticket=async()=>(await service.snapshot(guildId)).tickets[0]!;
  const restart=async()=>{const next=new ModerationService(client,directory,logger);await next.init();return next;};
  return {directory,service,channel,log,logMessages,channels,events,history,actor,interaction,close,ticket,restart};
}

it('deletes only after a complete local file, Discord attachment and durable receipt are saved',async()=>{
  const f=await fixture();
  f.channel.delete.mockImplementationOnce(async()=>{
    const op=(await f.ticket()).operation!;
    expect(op.stage).toBe('deleting');expect(op.deleteAttempted).toBe(true);expect(op.transcriptMessageId).toBeTruthy();
    expect(await readFile(path.join(f.directory,'ticket-transcripts',guildId,op.transcript!.filename),'utf8')).toContain('Please help');
    f.events.push('delete');f.channels.delete(channelId);
  });
  await f.close();
  expect(f.events.indexOf('freeze')).toBeLessThan(f.events.indexOf('read'));
  expect(f.events.indexOf('send')).toBeLessThan(f.events.indexOf('delete'));
  expect(f.channel.delete).toHaveBeenCalledOnce();expect((await f.ticket()).status).toBe('closed');
  expect((await f.ticket()).transcript?.messageId).toBe('623456789012345678');
  expect(f.channel.threads.fetchArchived).toHaveBeenCalledWith({type:'private',fetchAll:true,limit:2});
});

it('retains the channel on transcript persistence failure without sending or deleting',async()=>{
  const f=await fixture();(f.service as any).transcripts.save=vi.fn(async()=>{throw new Error('disk full');});
  await expect(f.close()).rejects.toThrow('disk full');expect(f.log.send).not.toHaveBeenCalled();expect(f.channel.delete).not.toHaveBeenCalled();
  expect((await f.ticket()).operation?.stage).toBe('needs-review');
});

it('recovers an uncertain send after restart without duplicating its transcript',async()=>{
  const f=await fixture();const send=f.log.send.getMockImplementation()!;
  f.log.send.mockImplementationOnce(async(payload:any)=>{await send(payload);throw new Error('response lost');});
  await expect(f.close()).rejects.toThrow('response lost');expect(f.channel.delete).not.toHaveBeenCalled();
  const next=await f.restart();await next.reconcile();expect(f.channel.delete).not.toHaveBeenCalled();
  await f.close(next);expect(f.log.send).toHaveBeenCalledOnce();expect(f.channel.delete).toHaveBeenCalledOnce();
  expect((await next.snapshot(guildId)).tickets[0]?.status).toBe('closed');
});

it('never retries an unverified transcript send',async()=>{
  const f=await fixture();f.log.send.mockRejectedValueOnce(new Error('network timeout'));
  await expect(f.close()).rejects.toThrow('network timeout');
  await expect(f.close()).rejects.toThrow('could not be verified');
  expect(f.log.send).toHaveBeenCalledOnce();expect(f.channel.delete).not.toHaveBeenCalled();
});

it('reconciles a confirmed missing channel after an uncertain deletion without repeating deletion',async()=>{
  const f=await fixture();f.channel.delete.mockImplementationOnce(async()=>{f.channels.delete(channelId);throw new Error('delete response lost');});
  await expect(f.close()).rejects.toThrow('response lost');
  const next=await f.restart();await next.reconcile();
  expect((await next.snapshot(guildId)).tickets[0]?.status).toBe('closed');
  expect(f.channel.delete).toHaveBeenCalledOnce();expect(f.log.send).toHaveBeenCalledOnce();
});

it('retains the channel if a pre-delete journal write fails',async()=>{
  const f=await fixture(), store=(f.service as any).store, update=store.update.bind(store);
  store.update=(id:string,mutate:(data:any)=>any)=>update(id,(data:any)=>{const result=mutate(data);if(data.tickets[0].operation?.stage==='deleting')throw new ModerationPersistenceError(new Error('disk full'));return result;});
  await expect(f.close()).rejects.toThrow('disk full');expect(f.channel.delete).not.toHaveBeenCalled();expect(f.log.send).toHaveBeenCalledOnce();
  expect((await f.ticket()).operation?.transcriptMessageId).toBeTruthy();
});

it.each(['new message','edited message'])('retains history after a %s appears during export',async(mode)=>{
  const f=await fixture(),send=f.log.send.getMockImplementation()!;
  f.log.send.mockImplementationOnce(async(payload:any)=>{const message=await send(payload);if(mode==='new message')f.history.push({...f.history[0],id:'101',content:'One more thing'});else f.history[0].content='Changed after export';return message;});
  await expect(f.close()).rejects.toThrow('changed after');expect(f.channel.delete).not.toHaveBeenCalled();expect(f.log.send).toHaveBeenCalledOnce();
});

it('checks again for a last-second message after persisting delete intent',async()=>{
  const f=await fixture(),store=(f.service as any).store,update=store.update.bind(store);
  store.update=async(id:string,mutate:(data:any)=>any)=>{const result=await update(id,mutate);if(store.read(id).tickets[0].operation?.stage==='deleting')f.history.push({...f.history[0],id:'101',content:'Too late'});return result;};
  await expect(f.close()).rejects.toThrow('new message');expect(f.channel.delete).not.toHaveBeenCalled();
});

it.each(['threads','webhooks'])('preflights unexported %s before locking or deleting the channel',async(kind)=>{
  const f=await fixture();
  if(kind==='threads')f.channel.threads.fetchArchived.mockResolvedValue({threads:new Collection([['thread',{}]])});else f.channel.fetchWebhooks.mockResolvedValue(new Collection([['hook',{}]]));
  await expect(f.close()).rejects.toThrow(kind==='threads'?'separate threads':'webhooks');
  expect(f.log.send).not.toHaveBeenCalled();expect(f.channel.permissionOverwrites.set).not.toHaveBeenCalled();expect(f.channel.delete).not.toHaveBeenCalled();
});

it('verifies its local transcript before deleting and rejects a tampered file',async()=>{
  const f=await fixture(),send=f.log.send.getMockImplementation()!;
  f.log.send.mockImplementationOnce(async(payload:any)=>{const message=await send(payload),op=(await f.ticket()).operation!;await writeFile(path.join(f.directory,'ticket-transcripts',guildId,op.transcript!.filename),'corrupt');return message;});
  await expect(f.close()).rejects.toThrow('failed verification');expect(f.channel.delete).not.toHaveBeenCalled();
});

it('does not close a ticket for an unrelated member',async()=>{
  const f=await fixture();f.actor.id='923456789012345678';f.actor.permissions.has=()=>false;
  await expect(f.close()).rejects.toThrow('Only the ticket owner');expect(f.log.send).not.toHaveBeenCalled();expect(f.channel.delete).not.toHaveBeenCalled();
});

it.each(['stickers','poll','messageSnapshots','components'])('does not delete unrepresented rich content in %s',async(kind)=>{
  const f=await fixture();
  f.history[0][kind]=kind==='components'?[{type:10,content:'Rich content'}]:kind==='poll'?{question:{text:'Choose one'}}:new Collection([['rich',{content:'Forwarded content'}]]);
  await expect(f.close()).rejects.toThrow('cannot be fully exported');expect(f.log.send).not.toHaveBeenCalled();expect(f.channel.delete).not.toHaveBeenCalled();
});

it('lets staff keep the original channel when rich content cannot safely be deleted',async()=>{
  const f=await fixture();f.history[0].stickers=new Collection([['sticker',{name:'Wave'}]]);
  await expect(f.close()).rejects.toThrow('cannot be fully exported');
  (f.interaction as any).options={getBoolean:()=>true};
  await f.close();expect(f.log.send).toHaveBeenCalledOnce();expect(f.channel.delete).not.toHaveBeenCalled();
  expect((await f.ticket()).status).toBe('closed');expect((await f.ticket()).transcript?.unsupportedContent).toEqual(['stickers']);
});

it('deletes private local copies only when the guild retention guard permits purging',async()=>{
  const f=await fixture();await f.close();const filename=path.join(f.directory,'ticket-transcripts',guildId,(await f.ticket()).transcript!.filename);
  await f.service.purgeGuild(guildId,()=>false);expect(await readFile(filename,'utf8')).toContain('Please help');
  await f.service.purgeGuild(guildId,()=>true);await expect(readFile(filename)).rejects.toMatchObject({code:'ENOENT'});
});

it('preserves orphan copies when the retention guard is revoked inside the store queue',async()=>{
  const f=await fixture();await f.close();const filename=path.join(f.directory,'ticket-transcripts',guildId,(await f.ticket()).transcript!.filename);
  await (f.service as any).store.purgeGuild(guildId);
  let checks=0;await f.service.purgeGuild(guildId,()=>++checks===1);
  expect(await readFile(filename,'utf8')).toContain('Please help');
});

it('does not turn a successful deletion into a failure when its interaction is gone',async()=>{
  const f=await fixture();f.interaction.editReply.mockRejectedValueOnce(new Error('Unknown interaction'));
  await expect(f.close()).resolves.toBeUndefined();expect((await f.ticket()).status).toBe('closed');
});

