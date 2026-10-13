import { randomUUID } from 'node:crypto';
import { ChannelType, PermissionFlagsBits as P, type Guild } from 'discord.js';
import type { JsonStore } from '../storage/store.js';
import type { ProviderMap } from '../providers/index.js';
import type { AlertService } from '../services/alert-service.js';
import type { StreamMonitor } from '../services/monitor.js';
import { CLEANUP_MODES, PLATFORMS, type StreamerRecord, type Platform, type UploadSettings } from '../types.js';
import { normalizeUsername } from '../utils/normalize.js';
import { DEFAULT_MESSAGE_TEMPLATE } from '../utils/template.js';
import { assertSafeRole } from '../community/config.js';
import { DEFAULT_UPLOAD_TEMPLATE } from '../services/content-alerts.js';
import { TikTokProvider } from '../providers/tiktok.js';
import type { TikTokConnectionStatus } from '../tiktok/service.js';

export interface ProviderCapability { available:boolean; reason:string }
export type DashboardStreamRecord = StreamerRecord & { uploadsCapability:ProviderCapability; liveCapability:ProviderCapability; tiktokConnection?:TikTokConnectionStatus };

export class DashboardStreams {
  constructor(private store:JsonStore,private providers:ProviderMap,private alerts:AlertService,private monitor:StreamMonitor){}
  async list(guildId:string):Promise<DashboardStreamRecord[]> {
    return (await this.store.forGuild(guildId)).map(record=>{
      const provider=this.providers[record.platform];
      const configured=provider.isConfigured();
      return {...record,liveCapability:{available:configured,reason:!configured?provider.configurationHint():record.platform==='tiktok'?'TikTok LIVE uses a best-effort unofficial connector. TikTok changes or host blocking can interrupt checks; an Euler API key may improve reliability.':record.platform==='youtube'?'YouTube LIVE uses the official Data API. New broadcast discovery is paced at 15 minutes per tracked YouTube channel across the bot.':'Live alerts are configured.'},
        ...(provider instanceof TikTokProvider ? {tiktokConnection:provider.connectionStatus(record)} : {}),
        uploadsCapability:provider.uploadCapability?.(record)??{available:record.platform==='youtube'&&configured,reason:record.platform==='youtube'?(configured?'New public YouTube videos and Shorts are checked about every 5 minutes (slower above 10 unique channels). Live broadcasts and replays are excluded.':provider.configurationHint()):record.platform==='tiktok'?'TikTok upload alerts require creator OAuth with Login Kit and video.list.':'Automatic uploaded-video alerts are available for YouTube and connected TikTok creators.'}};
    });
  }
  private parse(input:unknown,create=false):Record<string,unknown> {
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Expected stream settings.');
    const data=input as Record<string,unknown>;
    const fields=['creatorId','alertChannelId','pingRoleId','liveRoleId','discordMemberId','titleFilter','cooldownSeconds','messageTemplate','cleanupMode','enabled','uploads',...(create?['platform','username']:[])];
    for(const key of Object.keys(data))if(!fields.includes(key))throw new Error(`Unknown stream setting: ${key}`);
    if('creatorId' in data && (typeof data.creatorId!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(data.creatorId)))throw new Error('Choose a valid creator profile.');
    for(const key of ['alertChannelId','pingRoleId','liveRoleId','discordMemberId']) {
      const value=data[key];if(value!==undefined&&value!==null&&value!==''&&(typeof value!=='string'||!/^\d{17,20}$/.test(value)))throw new Error(`${key} must be a Discord ID.`);
    }
    if('enabled'in data&&typeof data.enabled!=='boolean')throw new Error('Enabled must be true or false.');
    if('cooldownSeconds'in data&&(!Number.isInteger(data.cooldownSeconds)||Number(data.cooldownSeconds)<0||Number(data.cooldownSeconds)>86400))throw new Error('Cooldown must be between 0 and 86400 seconds.');
    if('cleanupMode'in data&&!CLEANUP_MODES.includes(data.cleanupMode as never))throw new Error('Choose delete, offline or keep for cleanup.');
    for(const[key,max]of [['messageTemplate',1800],['titleFilter',100]] as const)if(data[key]!==undefined&&data[key]!==null&&(typeof data[key]!=='string'||(data[key] as string).length>max))throw new Error(`${key} must be text up to ${max} characters.`);
    if('uploads'in data){
      if(!data.uploads||typeof data.uploads!=='object'||Array.isArray(data.uploads))throw new Error('Expected upload notification settings.');
      const uploads=data.uploads as Record<string,unknown>;
      if(Object.keys(uploads).some(key=>!['enabled','channelId','pingRoleId','titleFilter','messageTemplate'].includes(key)))throw new Error('Unknown upload setting.');
      if(typeof uploads.enabled!=='boolean')throw new Error('Upload enabled must be true or false.');
      if(uploads.channelId!==undefined&&uploads.channelId!==''&&(typeof uploads.channelId!=='string'||!/^\d{17,20}$/.test(uploads.channelId)))throw new Error('Choose a valid upload channel.');
      if(uploads.pingRoleId!==undefined&&uploads.pingRoleId!==null&&uploads.pingRoleId!==''&&(typeof uploads.pingRoleId!=='string'||!/^\d{17,20}$/.test(uploads.pingRoleId)))throw new Error('Choose a valid upload ping role.');
      for(const[key,max]of [['messageTemplate',1800],['titleFilter',100]] as const)if(uploads[key]!==undefined&&uploads[key]!==null&&(typeof uploads[key]!=='string'||(uploads[key] as string).length>max))throw new Error(`Upload ${key} must be text up to ${max} characters.`);
    }
    return data;
  }
  private patch(data:Record<string,unknown>):Partial<StreamerRecord> {
    const result:Record<string,unknown>={...data};delete result.platform;delete result.username;
    for(const key of ['pingRoleId','liveRoleId','discordMemberId','titleFilter'])if(key in result && !result[key])result[key]=undefined;
    if('messageTemplate'in result&&!result.messageTemplate)result.messageTemplate=DEFAULT_MESSAGE_TEMPLATE;
    if('uploads'in result){const data=result.uploads as UploadSettings;result.uploads={enabled:data.enabled,channelId:data.channelId||'',pingRoleId:data.pingRoleId||undefined,titleFilter:data.titleFilter||undefined,messageTemplate:data.messageTemplate||DEFAULT_UPLOAD_TEMPLATE};}
    return result as Partial<StreamerRecord>;
  }
  async validate(guild:Guild,record:StreamerRecord):Promise<void> {
    const me=await guild.members.fetchMe();
    if(record.enabled){
      const channel=await guild.channels.fetch(record.alertChannelId);
      if(!channel||channel.guildId!==guild.id||![ChannelType.GuildText,ChannelType.GuildAnnouncement].includes(channel.type)||!channel.permissionsFor(me)?.has([P.ViewChannel,P.SendMessages,P.EmbedLinks,P.ReadMessageHistory]))throw new Error('Choose a text channel where the bot can view, send messages, embed links and read history.');
      if(record.pingRoleId){const role=await guild.roles.fetch(record.pingRoleId);if(!role||role.id===guild.id)throw new Error('Choose an existing ping role.');if(!role.mentionable&&!channel.permissionsFor(me)?.has(P.MentionEveryone))throw new Error('The ping role must be mentionable, or the bot needs Mention Everyone in this channel.');}
    }
    if(record.enabled&&record.liveRoleId){
      const role=await guild.roles.fetch(record.liveRoleId);
      if(!role||!me.permissions.has(P.ManageRoles))throw new Error('The bot needs Manage Roles and an existing live role.');
      assertSafeRole(role);
      if(!record.discordMemberId)throw new Error('Choose the Discord member who receives the live role.');
    }
    if(record.uploads?.enabled){
      if(!['youtube','tiktok'].includes(record.platform))throw new Error('Upload notifications are available for YouTube and connected TikTok creators.');
      const provider=this.providers[record.platform];
      const capability=provider.uploadCapability?.(record)??{available:record.platform==='youtube'&&provider.isConfigured(),reason:provider.configurationHint()};
      if(!capability.available)throw new Error(capability.reason);
      const channel=await guild.channels.fetch(record.uploads.channelId);
      if(!channel||channel.guildId!==guild.id||![ChannelType.GuildText,ChannelType.GuildAnnouncement].includes(channel.type)||!channel.permissionsFor(me)?.has([P.ViewChannel,P.SendMessages,P.EmbedLinks]))throw new Error('Choose an upload text channel where the bot can view, send messages and embed links.');
      if(record.uploads.pingRoleId){const role=await guild.roles.fetch(record.uploads.pingRoleId);if(!role||role.id===guild.id)throw new Error('Choose an existing upload ping role.');if(!role.mentionable&&!channel.permissionsFor(me)?.has(P.MentionEveryone))throw new Error('The upload ping role must be mentionable, or the bot needs Mention Everyone in that channel.');}
    }
    if(record.discordMemberId)await guild.members.fetch(record.discordMemberId).catch(()=>{throw new Error('The linked member must belong to this server.');});
  }
  async add(guild:Guild,input:unknown):Promise<StreamerRecord>{
    const data=this.parse(input,true);
    if(!PLATFORMS.includes(data.platform as Platform)||typeof data.username!=='string'||data.username.length>100)throw new Error('Choose a platform and a username (up to 100 characters).');
    const platform=data.platform as Platform;const provider=this.providers[platform];
    if(!provider.isConfigured())throw new Error(provider.configurationHint());
    const username=normalizeUsername(platform,data.username);const resolved=await provider.resolve(username);
    return this.monitor.withLock(async()=>{
      if((await this.store.forGuild(guild.id)).length>=100)throw new Error('This server has reached the limit of 100 tracked streamers.');
      const now=new Date().toISOString();
      const record:StreamerRecord={id:randomUUID(),guildId:guild.id,platform,...resolved,alertChannelId:'',cooldownSeconds:300,messageTemplate:DEFAULT_MESSAGE_TEMPLATE,cleanupMode:'offline',enabled:true,state:'unknown',createdAt:now,updatedAt:now,...this.patch(data)};
      if(record.creatorId){const creator=await this.store.getCreator(record.creatorId);if(!creator||creator.guildId!==guild.id)throw new Error('Creator not found in this server.');record.discordMemberId=creator.discordMemberId;}
      await this.validate(guild,record);return this.store.add(record);
    });
  }
  async update(guild:Guild,id:string,input:unknown):Promise<StreamerRecord>{
    const data=this.parse(input);return this.monitor.withLock(async()=>{
      const before=await this.selected(guild.id,id);const patch=this.patch(data);
      const moving=patch.creatorId!==undefined&&patch.creatorId!==before.creatorId;
      if(!moving && 'discordMemberId' in patch && patch.discordMemberId!==before.discordMemberId && before.creatorId && (await this.store.forGuild(guild.id)).filter(record=>record.creatorId===before.creatorId).length>1)throw new Error('Edit the Discord member on the creator profile to update all linked accounts together.');
      if(patch.creatorId){const creator=await this.store.getCreator(patch.creatorId);if(!creator||creator.guildId!==guild.id)throw new Error('Creator not found in this server.');if(moving)patch.discordMemberId=creator.discordMemberId;}
      const candidate={...before,...patch};
      // Pausing must remain possible even if the old channel or role was deleted.
      const onlyPausing=Object.keys(patch).length>0&&Object.keys(patch).every(key=>key==='enabled'?patch.enabled===false:key==='uploads'&&patch.uploads?.enabled===false);
      if (!onlyPausing) await this.validate(guild,candidate);
      if(patch.enabled===false&&before.state==='live'){await this.alerts.markOffline(before);patch.state='offline';}
      const after=await this.store.update(id,patch);await this.alerts.reconcileEdit(before,after);return after;
    });
  }
  async remove(guild:Guild,id:string):Promise<void>{await this.monitor.withLock(async()=>{const record=await this.selected(guild.id,id);await this.alerts.retire(record);await this.store.remove(id);});}
  private async selected(guildId:string,id:string):Promise<StreamerRecord>{const record=await this.store.get(id);if(!record||record.guildId!==guildId)throw new Error('Stream not found in this server.');return record;}
}
