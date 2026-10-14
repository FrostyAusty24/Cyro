import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { isVoiceId, type VoiceId } from './catalog.js';

export { isVoiceId, type VoiceId } from './catalog.js';
export interface VoiceConfig { musicEnabled:boolean; ttsEnabled:boolean; announceSpeaker:boolean; defaultVoice:VoiceId; volume:number; maxTrackMinutes:number }
interface VoiceGuild {config:VoiceConfig; voices:Record<string,VoiceId>}
export const defaultVoiceConfig=():VoiceConfig=>({musicEnabled:true,ttsEnabled:true,announceSpeaker:false,defaultVoice:'voice1',volume:50,maxTrackMinutes:15});
export function parseVoiceConfig(input:unknown):VoiceConfig {
  const v=input as VoiceConfig;
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['musicEnabled','ttsEnabled','announceSpeaker','defaultVoice','volume','maxTrackMinutes'].includes(k))||typeof v.musicEnabled!=='boolean'||typeof v.ttsEnabled!=='boolean'||(v.announceSpeaker!==undefined&&typeof v.announceSpeaker!=='boolean')||!isVoiceId(v.defaultVoice)||!Number.isInteger(v.volume)||v.volume<5||v.volume>100||!Number.isInteger(v.maxTrackMinutes)||v.maxTrackMinutes<1||v.maxTrackMinutes>30)throw new Error('Choose valid voice settings: volume 5–100, track limit 1–30 minutes, and an available voice.');
  return {musicEnabled:v.musicEnabled,ttsEnabled:v.ttsEnabled,announceSpeaker:v.announceSpeaker??false,defaultVoice:v.defaultVoice,volume:v.volume,maxTrackMinutes:v.maxTrackMinutes};
}
const snowflake=(s:string)=>/^\d{17,20}$/.test(s);
export class VoiceStore {
  private guilds:Record<string,VoiceGuild>={}; private tail:Promise<unknown>=Promise.resolve(); private file:string;
  constructor(directory:string){this.file=path.join(directory,'voice.json');}
  async init(){
    await mkdir(path.dirname(this.file),{recursive:true});
    try{
      const data=JSON.parse(await readFile(this.file,'utf8'));
      if(data.version!==1||!data.guilds||typeof data.guilds!=='object'||Array.isArray(data.guilds))throw new Error('Invalid voice.json; restore the saved file.');
      for(const [id,value] of Object.entries(data.guilds)){
        const v=value as VoiceGuild; if(!snowflake(id)||!v||!v.voices||typeof v.voices!=='object'||Array.isArray(v.voices)||Object.entries(v.voices).some(([user,voice])=>!snowflake(user)||!isVoiceId(voice)))throw new Error('Invalid saved voice preferences.');
        v.config=parseVoiceConfig(v.config);
      }
      this.guilds=data.guilds;
    }catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  }
  get(id:string):VoiceGuild{return structuredClone(this.guilds[id]??{config:defaultVoiceConfig(),voices:{}});}
  mutate<T>(id:string,operation:(guild:VoiceGuild)=>T,authorize?:()=>Promise<void>):Promise<T>{
    if(!snowflake(id))return Promise.reject(new Error('Invalid server.'));
    const task=this.tail.then(async()=>{await authorize?.();const next=structuredClone(this.guilds),guild=next[id]??={config:defaultVoiceConfig(),voices:{}}; const result=operation(guild);await this.write(next);this.guilds=next;return structuredClone(result);});this.tail=task.catch(()=>undefined);return task;
  }
  private async write(guilds:Record<string,VoiceGuild>){
    const tmp=`${this.file}.${randomUUID()}.tmp`;
    try{const f=await open(tmp,'wx',0o600);try{await f.writeFile(JSON.stringify({version:1,guilds}));await f.sync();}finally{await f.close();}await rename(tmp,this.file);}finally{await rm(tmp,{force:true});}
  }
  async flush(){await this.tail;}
  async guildIds(){return Object.keys(this.guilds);}
  async purgeGuild(id:string,guard:()=>boolean=()=>true){const task=this.tail.then(async()=>{if(!guard()||!Object.hasOwn(this.guilds,id))return;const next=structuredClone(this.guilds);delete next[id];await this.write(next);this.guilds=next;});this.tail=task.catch(()=>undefined);await task;}
}
