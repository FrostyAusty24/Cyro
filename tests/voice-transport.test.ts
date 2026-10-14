import { expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
const mocks=vi.hoisted(()=>({join:vi.fn(),enters:vi.fn()}));
vi.mock('@discordjs/voice',()=>({joinVoiceChannel:mocks.join,entersState:mocks.enters,VoiceConnectionStatus:{Ready:'ready',Destroyed:'destroyed',Disconnected:'disconnected'},AudioPlayerStatus:{Idle:'idle',Playing:'playing'},NoSubscriberBehavior:{Stop:'stop'},StreamType:{Raw:'raw'},createAudioPlayer:()=>Object.assign(new EventEmitter(),{stop:vi.fn(),play:vi.fn()}),createAudioResource:vi.fn()}));
vi.mock('../src/voice/audio.js',()=>({loadMusicSource:vi.fn(),pcmSpeech:vi.fn()}));
import { connectVoice } from '../src/voice/transport.js';
import { pcmSpeech } from '../src/voice/audio.js';
import { defaultVoiceConfig } from '../src/voice/store.js';
it('closes an incomplete Discord voice connection immediately when the session is cancelled',async()=>{
  const connection=Object.assign(new EventEmitter(),{destroy:vi.fn(),subscribe:vi.fn(),state:{status:'connecting'}});mocks.join.mockReturnValue(connection);mocks.enters.mockImplementation(async()=>new Promise(()=>{}));
  const client={guilds:{cache:new Map([['guild',{voiceAdapterCreator:()=>{}}]])}};
  const abort=new AbortController();const pending=connectVoice(client as never,'guild','channel',abort.signal,()=>{});abort.abort();
  await expect(pending).rejects.toThrow();expect(connection.destroy).toHaveBeenCalledOnce();
});

it('passes the speaker name into audio only while the server toggle is on at playback',async()=>{
  const connection=Object.assign(new EventEmitter(),{destroy:vi.fn(),subscribe:vi.fn(),state:{status:'ready'}});
  mocks.join.mockReturnValue(connection);mocks.enters.mockResolvedValue(connection);
  const client={guilds:{cache:new Map([['guild',{voiceAdapterCreator:()=>{}}]])}};
  const abort=new AbortController(),output=await connectVoice(client as never,'guild','channel',abort.signal,()=>{});
  const speech=vi.mocked(pcmSpeech);speech.mockClear();speech.mockRejectedValue(new Error('Stop before audio decoding'));
  try{
    for(const announceSpeaker of [true,false]){
      await expect(output.play({kind:'tts',title:'Spoken chat message',text:'Hello everyone.',voice:'voice3',speakerName:'Frosty'},{...defaultVoiceConfig(),announceSpeaker},abort.signal)).rejects.toThrow('Stop before audio decoding');
      expect(speech).toHaveBeenLastCalledWith('Hello everyone.','voice3',expect.any(AbortSignal),announceSpeaker?'Frosty':undefined);
    }
  }finally{output.close();}
});
