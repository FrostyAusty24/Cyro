import { ChannelType, Events, MessageFlags, PermissionFlagsBits, Routes, escapeMarkdown, type Client, type Guild, type GuildMember, type VoiceChannel, type Interaction, type Message, type VoiceState } from 'discord.js';
import type { AccessService } from '../control/access.js';
import type { Logger } from '../logger.js';
import { VoiceStore, parseVoiceConfig, isVoiceId, type VoiceId } from './store.js';
import { VoiceSessions, type VoiceOutput } from './sessions.js';
import { TTS_VOICES, ttsAvailable } from './tts.js';
import { parseAudioUrl } from './urls.js';
import { VOICE_COMMAND_NAMES } from './commands.js';
import { randomUUID } from 'node:crypto';
import { audioAvailable } from './audio.js';
import { parseYouTubeUrl, resolveYouTubeSource, youtubeAvailable, YouTubeSourceError } from './youtube.js';

export function spokenText(text:string):string {
  if(text.trimStart().startsWith('/'))return '';
  return text.replace(/\|\|[\s\S]*?\|\|/g,' spoiler ').replace(/https?:\/\/\S+/gi,' link ').replace(/<@!?\d+>/g,'someone').replace(/<@&\d+>/g,'role').replace(/<#\d+>/g,'channel').replace(/<a?:(\w+):\d+>/g,'$1').replace(/@everyone|@here/g,'everyone').replace(/[`*_~]/g,'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,400);
}
export class VoiceService {
  private store:VoiceStore;readonly sessions:VoiceSessions;private stopped=false;private attached=false;private active=new Set<Promise<unknown>>();private speechCooldown=new Map<string,number>();
  private readonly queues=new Map<string,Promise<unknown>>();
  private readonly loadingController=new AbortController();
  private readonly pendingMusic=new Map<string,Map<AbortController,string>>();
  private runtimeStatus?:{audio:boolean;tts:boolean;dave:boolean};
  constructor(private client:Client,dataDir:string,private logger:Logger,private access:AccessService,connect?:(guildId:string,channelId:string,signal:AbortSignal)=>Promise<VoiceOutput>){
    this.store=new VoiceStore(dataDir);
    this.sessions=new VoiceSessions(connect??(async(guildId,channelId,signal)=>{const {connectVoice}=await import('./transport.js');return connectVoice(client,guildId,channelId,signal,()=>{if(!signal.aborted)this.sessions.leave(guildId);});}),guildId=>this.logger.warn('Voice audio could not be played.',{guildId}));
  }
  async init(){await this.store.init();}
  private enqueue<T>(guildId:string,operation:()=>Promise<T>):Promise<T>{
    const task=(this.queues.get(guildId)??Promise.resolve()).catch(()=>undefined).then(operation);this.queues.set(guildId,task);
    void task.finally(()=>{if(this.queues.get(guildId)===task)this.queues.delete(guildId);}).catch(()=>undefined);return task;
  }
  getConfig(guildId:string){return this.store.get(guildId).config;}
  setRuntimeStatus(status:{audio:boolean;tts:boolean;dave:boolean}){this.runtimeStatus={...status};}
  private availability(){const audio=(this.runtimeStatus?.audio??audioAvailable())&&(this.runtimeStatus?.dave??true);return {music:audio,youtube:audio&&youtubeAvailable(),tts:audio&&(this.runtimeStatus?.tts??ttsAvailable())};}
  private assertAvailable(mode:'music'|'tts'){if(!this.availability()[mode])throw new Error(`${mode==='music'?'Music':'TTS'} is unavailable on this host. Ask the bot operator to check the voice runtime.`);}
  snapshot(guildId:string){return {config:this.getConfig(guildId),voices:TTS_VOICES,session:this.sessions.snapshot(guildId),available:this.availability(),notes:['Music accepts direct audio, internet radio and supported public YouTube video links. YouTube playback is best effort and requires the host source installer; playlists, live or restricted videos are not supported. Spotify does not provide full-track audio for this player.','Free voices are synthetic and run on the bot host. Music and TTS use separate sessions.']};}
  async updateConfig(guildId:string,input:unknown,authorize?:()=>Promise<void>){
    const config=parseVoiceConfig(input);return this.enqueue(guildId,async()=>{const saved=await this.store.mutate(guildId,state=>{state.config=config;return config;},async()=>{this.assertRunning();await authorize?.();this.assertRunning();});if(!saved.musicEnabled)this.cancelMusicLoads(guildId);this.sessions.update(guildId,saved);return saved;});
  }
  private cancelMusicLoads(guildId:string,channelId?:string){let count=0;for(const [controller,channel] of this.pendingMusic.get(guildId)??[]){if(!channelId||channel===channelId){controller.abort();count++;}}return count;}
  private assertRunning(){if(this.stopped)throw new Error('Voice features are stopping. Try again shortly.');}
  private async memberChannel(guild:Guild,userId:string,command:string):Promise<{member:GuildMember;channel:VoiceChannel}>{
    this.assertRunning();await this.access.command(guild,userId,command,true);
    const member=await guild.members.fetch({user:userId,force:true});if(member.pending)throw new Error('Complete server membership screening first.');
    if(!member.voice.channelId)throw new Error('Join a server voice channel first.');
    const channel=await guild.channels.fetch(member.voice.channelId);
    if(!channel||channel.id!==member.voice.channelId||channel.guildId!==guild.id||channel.type!==ChannelType.GuildVoice)throw new Error('Use a regular server voice channel. Stage channels are not supported.');
    if(!channel.permissionsFor(member)?.has([PermissionFlagsBits.ViewChannel,PermissionFlagsBits.Connect]))throw new Error('You cannot access that voice channel.');
    const me=await guild.members.fetchMe();if(!channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel,PermissionFlagsBits.Connect,PermissionFlagsBits.Speak]))throw new Error('Cyro needs View Channel, Connect and Speak in your voice channel.');
    this.assertRunning();if(member.voice.channelId!==channel.id)throw new Error('Stay in the same voice channel while Cyro connects.');return {member,channel};
  }
  async startTts(guild:Guild,userId:string){
    return this.enqueue(guild.id,async()=>{
      this.assertRunning();this.assertAvailable('tts');
      if(!this.getConfig(guild.id).ttsEnabled)throw new Error('TTS is disabled in this server’s dashboard.');
      const {channel}=await this.memberChannel(guild,userId,'addtts');
      const me=await guild.members.fetchMe();if(!channel.permissionsFor(me)?.has([PermissionFlagsBits.SendMessages,PermissionFlagsBits.EmbedLinks]))throw new Error('Cyro needs Send Messages and Embed Links in the voice channel chat to announce TTS.');
      const existing=this.sessions.snapshot(guild.id);await this.sessions.join(guild.id,channel.id,'tts',this.getConfig(guild.id));
      const room=this.sessions.assertChannel(guild.id,channel.id);
      try{
        const current=await this.memberChannel(guild,userId,'addtts');
        if(current.channel.id!==channel.id)throw new Error('Stay in the same voice channel while Cyro connects.');
        if(!this.getConfig(guild.id).ttsEnabled)throw new Error('TTS has been disabled.');
        if(room.ttsReadyAt)return;
        try{await channel.send({embeds:[{title:'Text-to-speech is on',description:'New messages in this call’s chat from members in this call will be spoken aloud. Choose your voice with /ttsvoice (or /ttsvoice1–4). Use /stoptts to stop. Messages are processed on Cyro’s host and are not saved as a speech history.',color:0x82d9f7}],allowedMentions:{parse:[]},nonce:randomUUID().replaceAll('-','').slice(0,24),enforceNonce:true});}
        catch{throw new Error('Could not confirm the TTS notice in the call chat. Check the chat before trying again.');}
        const confirmed=await this.memberChannel(guild,userId,'addtts');
        if(confirmed.channel.id!==channel.id)throw new Error('Stay in the same voice channel while Cyro connects.');
        if(!this.getConfig(guild.id).ttsEnabled)throw new Error('TTS has been disabled.');
        this.sessions.activateTts(guild.id,channel.id,room);
      }catch(error){if(!existing)this.sessions.leave(guild.id,room);throw error;}
    });
  }
  async playMusic(guild:Guild,userId:string,link:string,onFailure?:(message:string,signal:AbortSignal)=>Promise<void>){
    this.assertRunning();this.assertAvailable('music');
    const youtube=parseYouTubeUrl(link);const url=youtube??parseAudioUrl(link);if(!this.getConfig(guild.id).musicEnabled)throw new Error('Music is disabled in this server’s dashboard.');
    const {channel}=await this.memberChannel(guild,userId,'playmusic');const initial=this.sessions.snapshot(guild.id);
    if(initial&&(initial.channelId!==channel.id||initial.mode!=='music'))throw new Error('Cyro is already in another call or TTS session. Stop that session there first.');
    if(initial&&initial.queueLength>=25)throw new Error('The voice queue is full. Please wait for it to clear.');
    // Source preflight stays outside the guild mutation queue so stop/skip/disable remain responsive.
    const file=url.pathname.split('/').pop()||'Radio stream';let label=file;try{label=decodeURIComponent(file);}catch{}
    let title=`${label.slice(0,90)} · ${url.hostname}`;
    if(youtube){
      const controller=new AbortController();const signal=AbortSignal.any([controller.signal,this.loadingController.signal]);
      const loads=this.pendingMusic.get(guild.id)??new Map<AbortController,string>();this.pendingMusic.set(guild.id,loads);loads.set(controller,channel.id);
      try{const source=await resolveYouTubeSource(youtube.href,{signal,maxDurationSeconds:this.getConfig(guild.id).maxTrackMinutes*60});signal.throwIfAborted();title=`${escapeMarkdown(source.title)} · YouTube`;}
      finally{loads.delete(controller);if(!loads.size)this.pendingMusic.delete(guild.id);}
    }
    return this.enqueue(guild.id,async()=>{
      this.assertRunning();this.assertAvailable('music');
      const beforeJoin=await this.memberChannel(guild,userId,'playmusic');
      if(beforeJoin.channel.id!==channel.id)throw new Error('Stay in the same voice channel while Cyro loads your music.');
      if(!this.getConfig(guild.id).musicEnabled)throw new Error('Music has been disabled.');
      const existing=this.sessions.snapshot(guild.id);
      await this.sessions.join(guild.id,channel.id,'music',this.getConfig(guild.id));const room=this.sessions.assertChannel(guild.id,channel.id);
      try{
        const current=await this.memberChannel(guild,userId,'playmusic');
        if(current.channel.id!==channel.id)throw new Error('Stay in the same voice channel while Cyro connects.');
        if(!this.getConfig(guild.id).musicEnabled)throw new Error('Music has been disabled.');
        return this.sessions.enqueue(guild.id,channel.id,{kind:'music',title,url:url.href,onFailure:onFailure?async(error,signal)=>{await onFailure(error instanceof YouTubeSourceError?error.message:'This music source could not be played. Cyro skipped it; try another publicly accessible source.',signal);}:undefined});
      }catch(error){if(!existing)this.sessions.leave(guild.id,room);throw error;}
    });
  }
  async setVoice(guild:Guild,userId:string,voice:string){
    if(!isVoiceId(voice))throw new Error('Choose one of the four available voices.');
    return this.enqueue(guild.id,()=>this.store.mutate(guild.id,state=>{if(!state.voices[userId]&&Object.keys(state.voices).length>=10000)throw new Error('This server has reached its saved voice preference limit.');state.voices[userId]=voice;return voice;},async()=>{this.assertRunning();await this.access.command(guild,userId,'ttsvoice',true);this.assertRunning();}));
  }
  private readonly onInteraction=(interaction:Interaction)=>{
    if(this.stopped||!interaction.isChatInputCommand()||!VOICE_COMMAND_NAMES.includes(interaction.commandName))return;
    const task=(async()=>{
      if(!interaction.inCachedGuild()){await interaction.reply({content:'Use voice commands inside a server.',flags:MessageFlags.Ephemeral});return;}
      await interaction.deferReply({flags:MessageFlags.Ephemeral});const name=interaction.commandName;let text:string;
      if(name==='playmusic'){let acknowledge!:()=>void;const acknowledged=new Promise<void>(resolve=>{acknowledge=resolve;});const position=await this.playMusic(interaction.guild,interaction.user.id,interaction.options.getString('link',true),async(message,signal)=>{await acknowledged;signal.throwIfAborted();await interaction.client.rest.post(Routes.webhook(interaction.applicationId,interaction.token),{auth:false,signal,query:new URLSearchParams({wait:'true'}),body:{embeds:[{title:'Music could not play',description:message,color:0x82d9f7}],flags:MessageFlags.Ephemeral,allowed_mentions:{parse:[]}}});});text=`Added to this call’s music queue (position ${position}). Use /musicqueue, /skipmusic or /stopmusic. If the source cannot play, Cyro will skip it and send you a private notice.`;try{await interaction.editReply({embeds:[{title:'Cyro voice',description:text,color:0x82d9f7}],allowedMentions:{parse:[]}});}finally{acknowledge();}return;}
      else if(name==='addtts'){await this.startTts(interaction.guild,interaction.user.id);text='TTS is on for your call’s chat. Use /ttsvoice to choose your voice and /stoptts to leave.';}
      else if(name.startsWith('ttsvoice')){const voice=name==='ttsvoice'?interaction.options.getString('voice',true):`voice${name.at(-1)}`;await this.setVoice(interaction.guild,interaction.user.id,voice);text=`Your voice for this server is now ${TTS_VOICES.find(v=>v.id===voice)!.name}.`;}
      else{
        let cancelledLoads=0;
        if(name==='stopmusic'){const {channel}=await this.memberChannel(interaction.guild,interaction.user.id,name);cancelledLoads=this.cancelMusicLoads(interaction.guildId,channel.id);}
        text=await this.enqueue(interaction.guildId,async()=>{
        const {channel}=await this.memberChannel(interaction.guild,interaction.user.id,name);if(name==='stopmusic'&&cancelledLoads&&!this.sessions.snapshot(interaction.guildId))return 'Cancelled pending music and stopped.';const room=this.sessions.assertChannel(interaction.guildId,channel.id);
        const expected=name==='stoptts'?'tts':'music';if(room.mode!==expected)throw new Error(`Cyro is currently in ${room.mode} mode.`);
        if(name==='musicqueue')return [room.current?`Playing: ${room.current.title}`:'Waiting for music.',...room.queue.slice(0,25).map((item,i)=>`${i+1}. ${item.title}`)].join('\n').slice(0,3800);
        if(name==='skipmusic'){this.sessions.skip(interaction.guildId,channel.id);return 'Skipped the current track.';}
        this.sessions.leave(interaction.guildId);return 'Stopped and disconnected from your call.';
        });
      }
      await interaction.editReply({embeds:[{title:'Cyro voice',description:text,color:0x82d9f7}],allowedMentions:{parse:[]}});
    })().catch(async error=>{
      this.logger.warn('Voice command could not complete.',{guildId:interaction.guildId});
      const text=error instanceof Error&&error.name==='Error'?error.message.slice(0,1800):'Voice could not start. Check Cyro’s Connect/Speak permissions and try again.';
      try{if(interaction.deferred)await interaction.editReply({content:text,allowedMentions:{parse:[]}});else if(!interaction.replied)await interaction.reply({content:text,flags:MessageFlags.Ephemeral,allowedMentions:{parse:[]}});}catch{}
    });this.track(task);
  };
  private readonly onMessage=(message:Message)=>{if(!this.stopped)this.track(this.readMessage(message).catch(()=>undefined));};
  private readonly onVoiceState=(_old:VoiceState,current:VoiceState)=>{
    const room=this.sessions.snapshot(current.guild.id);if(!room)return;
    if(current.id===this.client.user?.id&&current.channelId!==room.channelId){this.sessions.leave(current.guild.id);return;}
    const channel=current.guild.channels.cache.get(room.channelId);
    if(channel?.isVoiceBased()&&!channel.members.some(member=>!member.user.bot))this.sessions.leave(current.guild.id);
  };
  private readonly onGuildUnavailable=(guild:Guild)=>{this.cancelMusicLoads(guild.id);this.sessions.leave(guild.id);};
  private readonly onShardDisconnect=()=>{for(const guild of this.client.guilds.cache.values()){this.cancelMusicLoads(guild.id);this.sessions.leave(guild.id);}};
  attach(){if(this.attached||this.stopped)return;this.attached=true;this.client.on(Events.InteractionCreate,this.onInteraction);this.client.on(Events.MessageCreate,this.onMessage);this.client.on(Events.VoiceStateUpdate,this.onVoiceState);this.client.on(Events.GuildUnavailable,this.onGuildUnavailable);this.client.on(Events.GuildDelete,this.onGuildUnavailable);this.client.on(Events.ShardDisconnect,this.onShardDisconnect);}
  private track(task:Promise<unknown>){this.active.add(task);void task.finally(()=>this.active.delete(task)).catch(()=>{});}
  async readMessage(message:Message):Promise<boolean>{
    if(this.stopped||!message.guildId||!message.member||message.author.bot||message.webhookId||!this.availability().tts)return false;
    const session=this.sessions.snapshot(message.guildId);
    if(!session||session.mode!=='tts'||!session.ttsReadyAt||session.channelId!==message.channelId||message.member.voice.channelId!==session.channelId||message.createdTimestamp<session.ttsReadyAt||message.member.pending||!this.getConfig(message.guildId).ttsEnabled)return false;
    try{this.access.commandMember(message.member,'addtts',true);}catch{return false;}
    const text=spokenText(message.content);if(!text)return false;
    const key=`${message.guildId}:${message.author.id}`,now=Date.now();if((this.speechCooldown.get(key)??0)>now)return false;
    for(const [id,expiry] of this.speechCooldown)if(expiry<=now)this.speechCooldown.delete(id);
    if(this.speechCooldown.size>=10000)return false;
    this.speechCooldown.set(key,now+2000);
    const state=this.store.get(message.guildId),voice=state.voices[message.author.id]??state.config.defaultVoice;
    try{this.sessions.enqueue(message.guildId,session.channelId,{kind:'tts',title:'Spoken chat message',text,voice,canPlay:async()=>{
      if(this.stopped||!message.guild||!this.getConfig(message.guildId!).ttsEnabled)return false;
      try{const current=await this.memberChannel(message.guild,message.author.id,'addtts');return current.channel.id===session.channelId;}catch{return false;}
    }});return true;}catch{return false;}
  }
  async guildIds(){return this.store.guildIds();}
  async purgeGuild(guildId:string,guard:()=>boolean=()=>true){await this.enqueue(guildId,async()=>{if(guard())this.sessions.leave(guildId);await this.store.purgeGuild(guildId,guard);});}
  stop(){this.stopped=true;this.loadingController.abort();this.sessions.stopAll();this.speechCooldown.clear();this.client.off(Events.InteractionCreate,this.onInteraction);this.client.off(Events.MessageCreate,this.onMessage);this.client.off(Events.VoiceStateUpdate,this.onVoiceState);this.client.off(Events.GuildUnavailable,this.onGuildUnavailable);this.client.off(Events.GuildDelete,this.onGuildUnavailable);this.client.off(Events.ShardDisconnect,this.onShardDisconnect);}
  async flush(){while(this.active.size||this.queues.size)await Promise.allSettled([...this.active,...this.queues.values()]);await this.sessions.flush();await this.store.flush();}
}
