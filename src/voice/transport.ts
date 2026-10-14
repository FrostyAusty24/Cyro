import { joinVoiceChannel, entersState, VoiceConnectionStatus, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior, StreamType } from '@discordjs/voice';
import type { Client } from 'discord.js';
import { loadMusicSource, pcmSpeech, type AudioSource } from './audio.js';
import type { VoiceOutput } from './sessions.js';

export async function connectVoice(client:Client,guildId:string,channelId:string,signal:AbortSignal,onDisconnected:()=>void):Promise<VoiceOutput>{
  signal.throwIfAborted();const guild=client.guilds.cache.get(guildId);if(!guild)throw new Error('Cyro is no longer in this server.');
  const connection=joinVoiceChannel({channelId,guildId,adapterCreator:guild.voiceAdapterCreator,selfDeaf:true,selfMute:false});
  const player=createAudioPlayer({behaviors:{noSubscriber:NoSubscriberBehavior.Stop}});
  let closed=false;let playbackAbort:AbortController|undefined;
  const close=()=>{if(closed)return;closed=true;playbackAbort?.abort();player.stop(true);signal.removeEventListener('abort',close);connection.removeListener(VoiceConnectionStatus.Disconnected,disconnected);connection.removeListener(VoiceConnectionStatus.Destroyed,disconnected);if(connection.state.status!==VoiceConnectionStatus.Destroyed)connection.destroy();};
  const disconnected=()=>{close();onDisconnected();};
  // Error events must never escape the EventEmitter. Playback also has a per-track listener below.
  player.on('error',()=>{});connection.on('error',disconnected);
  signal.addEventListener('abort',close,{once:true});
  const readyController=new AbortController();const cancelReady=()=>readyController.abort();signal.addEventListener('abort',cancelReady,{once:true});
  const timer=setTimeout(cancelReady,15_000);timer.unref();
  try{
    await Promise.race([entersState(connection,VoiceConnectionStatus.Ready,readyController.signal),new Promise<never>((_,reject)=>readyController.signal.addEventListener('abort',()=>reject(new Error('Could not connect to Discord voice. Check Connect/Speak permissions and host UDP access.')),{once:true}))]);
    signal.throwIfAborted();if(closed)throw new Error('Voice connection was closed.');
    connection.subscribe(player);connection.on(VoiceConnectionStatus.Disconnected,disconnected);connection.on(VoiceConnectionStatus.Destroyed,disconnected);
  }catch(error){close();throw error;}finally{clearTimeout(timer);signal.removeEventListener('abort',cancelReady);}
  return {
    close,
    stop(){playbackAbort?.abort();player.stop(true);},
    async play(item,config,trackSignal){
      if(closed)throw new Error('The voice connection has closed.');trackSignal.throwIfAborted();
      const abort=new AbortController();playbackAbort=abort;const cancel=()=>abort.abort();trackSignal.addEventListener('abort',cancel,{once:true});signal.addEventListener('abort',cancel,{once:true});
      let limit:ReturnType<typeof setTimeout>|undefined;let source:AudioSource|undefined;
      try{
        source=item.kind==='music'?await loadMusicSource(item.url!,{signal:abort.signal,maxDurationSeconds:config.maxTrackMinutes*60}):await pcmSpeech(item.text!,item.voice,abort.signal,config.announceSpeaker?item.speakerName:undefined);
        abort.signal.throwIfAborted();
        limit=setTimeout(cancel,item.kind==='music'?config.maxTrackMinutes*60_000:60_000);limit.unref();
        const resource=createAudioResource(source.stream,{inputType:StreamType.Raw,inlineVolume:true});resource.volume?.setVolume(config.volume/100);
        await new Promise<void>((resolve,reject)=>{
          const finish=(error?:Error)=>{player.off(AudioPlayerStatus.Idle,idle);player.off('error',fail);source!.stream.off('error',fail);abort.signal.removeEventListener('abort',stop);error?reject(error):resolve();};
          const idle=()=>finish();const fail=(error:Error)=>finish(error);const stop=()=>{player.stop(true);finish();};
          player.once(AudioPlayerStatus.Idle,idle);player.once('error',fail);source!.stream.once('error',fail);abort.signal.addEventListener('abort',stop,{once:true});
          if(abort.signal.aborted){stop();return;}try{player.play(resource);}catch(error){finish(error instanceof Error?error:new Error('Could not play audio.'));}
        });
      }finally{clearTimeout(limit);trackSignal.removeEventListener('abort',cancel);signal.removeEventListener('abort',cancel);source?.cleanup();player.stop(true);if(playbackAbort===abort)playbackAbort=undefined;}
    },
  };
}
