import { expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
const mocks=vi.hoisted(()=>({join:vi.fn(),enters:vi.fn()}));
vi.mock('@discordjs/voice',()=>({joinVoiceChannel:mocks.join,entersState:mocks.enters,VoiceConnectionStatus:{Ready:'ready',Destroyed:'destroyed',Disconnected:'disconnected'},AudioPlayerStatus:{Idle:'idle',Playing:'playing'},NoSubscriberBehavior:{Stop:'stop'},StreamType:{Raw:'raw'},createAudioPlayer:()=>Object.assign(new EventEmitter(),{stop:vi.fn(),play:vi.fn()}),createAudioResource:vi.fn()}));
vi.mock('../src/voice/audio.js',()=>({loadMusicSource:vi.fn(),pcmSpeech:vi.fn()}));
import { connectVoice } from '../src/voice/transport.js';
it('closes an incomplete Discord voice connection immediately when the session is cancelled',async()=>{
  const connection=Object.assign(new EventEmitter(),{destroy:vi.fn(),subscribe:vi.fn(),state:{status:'connecting'}});mocks.join.mockReturnValue(connection);mocks.enters.mockImplementation(async()=>new Promise(()=>{}));
  const client={guilds:{cache:new Map([['guild',{voiceAdapterCreator:()=>{}}]])}};
  const abort=new AbortController();const pending=connectVoice(client as never,'guild','channel',abort.signal,()=>{});abort.abort();
  await expect(pending).rejects.toThrow();expect(connection.destroy).toHaveBeenCalledOnce();
});
