import type { VoiceConfig, VoiceId } from './store.js';
export type VoiceMode='music'|'tts';
export interface QueueItem {kind:VoiceMode;title:string;url?:string;text?:string;voice?:VoiceId;speakerName?:string;canPlay?:()=>boolean|Promise<boolean>;onFailure?:(error:unknown,signal:AbortSignal)=>Promise<void>}
export interface VoiceOutput {play(item:QueueItem,config:VoiceConfig,signal:AbortSignal):Promise<void>;stop():void;close():void}
interface Room {guildId:string;channelId:string;mode:VoiceMode;config:VoiceConfig;queue:QueueItem[];controller:AbortController;connection:Promise<void>;output?:VoiceOutput;current?:QueueItem;track?:AbortController;pump?:Promise<void>;idle?:ReturnType<typeof setTimeout>;startedAt:number;ttsReadyAt?:number}
export class VoiceSessions {
  private rooms=new Map<string,Room>();private tasks=new Set<Promise<unknown>>();private stopped=false;
  constructor(private connect:(guildId:string,channelId:string,signal:AbortSignal)=>Promise<VoiceOutput>,private onFailure:(guildId:string)=>void=()=>{}){}
  private track<T>(task:Promise<T>):Promise<T>{this.tasks.add(task);void task.finally(()=>this.tasks.delete(task)).catch(()=>{});return task;}
  async join(guildId:string,channelId:string,mode:VoiceMode,config:VoiceConfig):Promise<void>{
    if(this.stopped)throw new Error('Voice features are stopping. Try again shortly.');
    const existing=this.rooms.get(guildId);
    if(existing){if(existing.channelId!==channelId)throw new Error('Cyro is already in another voice channel. Stop that session there first.');if(existing.mode!==mode)throw new Error(`Cyro is currently in ${existing.mode} mode. Stop it before switching modes.`);return existing.connection;}
    if(this.rooms.size>=20)throw new Error('Cyro is at its current voice capacity. Please try again later.');
    const room:Room={guildId,channelId,mode,config:{...config},queue:[],controller:new AbortController(),connection:Promise.resolve(),startedAt:Date.now()};this.rooms.set(guildId,room);
    room.connection=this.track((async()=>{try{const output=await this.connect(guildId,channelId,room.controller.signal);if(room.controller.signal.aborted){output.close();throw new Error('Voice session cancelled.');}room.output=output;this.armIdle(room);}catch(error){this.leave(guildId,room);throw error;}})());
    return room.connection;
  }
  snapshot(guildId:string){const r=this.rooms.get(guildId);return r?{channelId:r.channelId,mode:r.mode,queueLength:r.queue.length,currentTitle:r.current?.title,startedAt:r.startedAt,ttsReadyAt:r.ttsReadyAt}:undefined;}
  activateTts(guildId:string,channelId:string,expected:Room){const room=this.assertChannel(guildId,channelId);if(room!==expected||room.mode!=='tts'||room.controller.signal.aborted)throw new Error('This TTS session has ended.');room.ttsReadyAt=Date.now();}
  private armIdle(room:Room){clearTimeout(room.idle);room.idle=setTimeout(()=>this.leave(room.guildId,room),room.mode==='music'?60_000:300_000);room.idle.unref();}
  assertChannel(guildId:string,channelId:string){const room=this.rooms.get(guildId);if(!room||room.channelId!==channelId)throw new Error('Join the same voice channel as Cyro to use this control.');return room;}
  enqueue(guildId:string,channelId:string,item:QueueItem):number{
    const room=this.assertChannel(guildId,channelId);if(!room.output||room.controller.signal.aborted)throw new Error('The voice connection is not ready.');
    if(room.mode!==item.kind)throw new Error('Stop the current mode before switching between music and TTS.');
    if(room.queue.length>=(room.mode==='music'?25:10))throw new Error('The voice queue is full. Please wait for it to clear.');
    room.queue.push(item);clearTimeout(room.idle);const position=room.queue.length+(room.current?1:0);this.pump(room);return position;
  }
  private async reportFailure(room:Room,error:unknown){
    const notify=room.current?.onFailure;if(!notify)return;
    const signal=AbortSignal.any([room.controller.signal,room.track!.signal,AbortSignal.timeout(5_000)]);
    let abort!:()=>void;
    try{await Promise.race([notify(error,signal),new Promise<void>(resolve=>{abort=resolve;signal.addEventListener('abort',abort,{once:true});if(signal.aborted)resolve();})]);}
    catch{/* Notification delivery must not stop playback or expose provider errors. */}
    finally{if(abort)signal.removeEventListener('abort',abort);}
  }
  private pump(room:Room){
    if(room.pump)return;
    room.pump=this.track((async()=>{
      while(!room.controller.signal.aborted&&room.queue.length){
        room.current=room.queue.shift()!;room.track=new AbortController();
        const abort=()=>room.track?.abort();room.controller.signal.addEventListener('abort',abort,{once:true});
        try{if(room.current.canPlay&&!await room.current.canPlay())continue;if(room.track.signal.aborted||room.controller.signal.aborted)continue;await room.output!.play(room.current,room.config,room.track.signal);}catch(error){if(!room.track.signal.aborted){this.onFailure(room.guildId);await this.reportFailure(room,error);}}
        finally{room.controller.signal.removeEventListener('abort',abort);room.current=undefined;room.track=undefined;}
      }
    })().finally(()=>{room.pump=undefined;if(!room.controller.signal.aborted){if(room.queue.length)this.pump(room);else this.armIdle(room);}}));
  }
  skip(guildId:string,channelId:string){const room=this.assertChannel(guildId,channelId);room.track?.abort();room.output?.stop();}
  leave(guildId:string,expected?:Room){const room=this.rooms.get(guildId);if(!room||expected&&room!==expected)return;this.rooms.delete(guildId);clearTimeout(room.idle);room.controller.abort();room.track?.abort();room.queue.length=0;room.output?.close();}
  update(guildId:string,config:VoiceConfig){const room=this.rooms.get(guildId);if(!room)return;room.config={...config};if(room.mode==='music'&&!config.musicEnabled||room.mode==='tts'&&!config.ttsEnabled)this.leave(guildId);}
  stopAll(){this.stopped=true;for(const id of this.rooms.keys())this.leave(id);}
  async flush(){while(this.tasks.size)await Promise.allSettled([...this.tasks]);}
}
