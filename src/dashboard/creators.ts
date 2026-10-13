import type { Guild } from 'discord.js';
import type { JsonStore } from '../storage/store.js';
import type { AlertService } from '../services/alert-service.js';
import type { StreamMonitor } from '../services/monitor.js';
import type { DashboardStreams } from './streams.js';
import type { CreatorProfile } from '../types.js';

export class DashboardCreators {
  constructor(private store:JsonStore, private alerts:AlertService, private monitor:StreamMonitor, private streams:DashboardStreams) {}
  list(guildId:string):Promise<CreatorProfile[]> {return this.store.creatorsForGuild(guildId);}
  private parse(input:unknown,create=false):{name?:string;discordMemberId?:string|null} {
    if(!input || typeof input!=='object' || Array.isArray(input))throw new Error('Expected creator settings.');
    const data=input as Record<string,unknown>;
    if(Object.keys(data).some(key=>!['name','discordMemberId'].includes(key)))throw new Error('Unknown creator setting.');
    if((create || 'name' in data) && (typeof data.name!=='string' || !data.name.trim() || data.name.trim().length>80 || /[\u0000-\u001f\u007f]/.test(data.name)))throw new Error('Creator name must be 1 to 80 characters without control characters.');
    if('discordMemberId' in data && data.discordMemberId!==null && (typeof data.discordMemberId!=='string' || !/^\d{17,20}$/.test(data.discordMemberId)))throw new Error('Choose a valid Discord member ID, or clear it.');
    return {...data,...(typeof data.name==='string'?{name:data.name.trim()}:{})} as {name?:string;discordMemberId?:string|null};
  }
  private async member(guild:Guild,id?:string|null):Promise<void> {
    if(id)await guild.members.fetch(id).catch(()=>{throw new Error('The creator’s Discord member must belong to this server.');});
  }
  async add(guild:Guild,input:unknown):Promise<CreatorProfile> {
    const data=this.parse(input,true);
    return this.monitor.withLock(async()=>{await this.member(guild,data.discordMemberId);return this.store.addCreator(guild.id,data.name!,data.discordMemberId??undefined);});
  }
  async update(guild:Guild,id:string,input:unknown):Promise<CreatorProfile> {
    const data=this.parse(input);
    return this.monitor.withLock(async()=>{
      const profile=await this.store.getCreator(id);
      if(!profile || profile.guildId!==guild.id)throw new Error('Creator not found in this server.');
      const before=(await this.store.forGuild(guild.id)).filter(record=>record.creatorId===id);
      if('discordMemberId' in data){
        await this.member(guild,data.discordMemberId);
        for(const record of before)await this.streams.validate(guild,{...record,discordMemberId:data.discordMemberId??undefined});
      }
      const creator=await this.store.updateCreator(guild.id,id,data);
      for(const record of before){const after=await this.store.get(record.id);if(after)await this.alerts.reconcileEdit(record,after);}
      return creator;
    });
  }
  async remove(guild:Guild,id:string):Promise<void> {
    await this.monitor.withLock(async()=>{await this.store.removeCreator(guild.id,id);});
  }
}
