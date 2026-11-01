import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Collection, PermissionFlagsBits as P, PermissionsBitField } from 'discord.js';
import { expect, it, vi } from 'vitest';
import { ModerationService } from '../src/moderation/index.js';
import { Logger } from '../src/logger.js';

it('exports complete ticket history beyond the old 1,000-message cap before retaining a read-only archive', async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'ticket-archive-'));
  try{
    const guildId='123456789012345678', ownerId='223456789012345678', botId='323456789012345678';
    const channelId='423456789012345678',logId='523456789012345678';
    const bot={id:botId,roles:{}};const actor={id:ownerId,permissions:{has:()=>true},roles:{cache:new Map()}};
    const guild:any={id:guildId,members:{fetch:async()=>actor,fetchMe:async()=>bot},roles:{fetch:async()=>new Collection()}};
    const overwrite={id:ownerId,type:1,allow:new PermissionsBitField([P.ViewChannel,P.SendMessages]),deny:new PermissionsBitField()};
    const history=Array.from({length:1105},(_,i)=>({id:String(1105-i),author:{tag:'Member',id:ownerId},createdAt:new Date(0),content:`Message ${1105-i}`,attachments:new Collection()}));
    const channel:any={id:channelId,guild,type:0,name:'ticket-member',permissionsFor:()=>({has:()=>true}),messages:{fetch:vi.fn(async({before,limit}:any)=>new Collection(history.filter(m=>!before||BigInt(m.id)<BigInt(before)).slice(0,limit).map(m=>[m.id,m])))},permissionOverwrites:{cache:new Collection([[ownerId,overwrite]]),set:vi.fn(async()=>undefined)},setName:vi.fn(async()=>undefined),delete:vi.fn()};
    const log:any={id:logId,guild,type:0,permissionsFor:()=>({has:()=>true}),permissionOverwrites:{cache:new Collection()},send:vi.fn(async(payload:any)=>({id:'export',content:payload.content??'',embeds:payload.embeds?.map((embed:any)=>embed.toJSON())??[],attachments:new Collection([['file',{name:payload.files[0].name,size:payload.files[0].attachment.length}]])}))};
    guild.channels={fetch:async(id:string)=>id===channelId?channel:log};
    const service=new ModerationService({} as never,directory,new Logger('error'));
    await service.init();
    await (service as any).store.update(guildId,(data:any)=>{
      data.config.tickets={enabled:true,categoryId:'623456789012345678',logChannelId:logId,staffRoleIds:['723456789012345678'],maxOpenPerUser:2};
      data.tickets.push({id:'record',channelId,ownerId,status:'open',createdAt:new Date(0).toISOString(),claimedBy:null,claimedAt:null,closedBy:null,closedAt:null});
    });
    const reply=vi.fn(async()=>undefined);
    await (service as any).ticket({guildId,guild,user:{id:ownerId},channelId,editReply:reply},'close');
    expect(channel.messages.fetch).toHaveBeenCalledTimes(13);
    expect(log.send).toHaveBeenCalledOnce();expect(channel.delete).not.toHaveBeenCalled();
    expect(channel.setName).toHaveBeenCalledWith('closed-ticket-member',expect.any(String));
    const settings=channel.permissionOverwrites.set.mock.calls[0][0][0];
    expect(settings.allow & P.ViewChannel).toBe(P.ViewChannel);
    expect(settings.allow & P.SendMessages).toBe(0n);expect(settings.deny & P.SendMessages).toBe(P.SendMessages);
    expect(reply).toHaveBeenLastCalledWith(expect.stringContaining('read-only archive'));
    const ticket=(await service.snapshot(guildId)).tickets[0]!;
    expect(ticket.status).toBe('closed'); expect(ticket.transcript?.messageCount).toBe(1105);
    const html=await readFile(path.join(directory,'ticket-transcripts',guildId,ticket.transcript!.filename),'utf8');
    expect(html).toContain('Message 1</p>'); expect(html).toContain('Message 1105</p>');
  }finally{await rm(directory,{recursive:true,force:true});}
});
