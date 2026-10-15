import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { VoiceStore, defaultVoiceConfig, parseVoiceConfig } from '../src/voice/store.js';
import { VoiceSessions } from '../src/voice/sessions.js';
import { spokenText, VoiceService } from '../src/voice/service.js';
import { EventEmitter } from 'node:events';
import { ChannelType, Collection, PermissionFlagsBits } from 'discord.js';

const directories: string[] = [];
afterEach(async () => { for (const dir of directories.splice(0)) await rm(dir, {recursive:true,force:true}); });
it('keeps voice settings and personal voice choices isolated and durable per server', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(),'cyro-voice-')); directories.push(dir);
  const store = new VoiceStore(dir); await store.init();
  await store.mutate('123456789012345678', state => { state.config.musicEnabled=false; state.voices['223456789012345678']='voice3'; });
  const restart = new VoiceStore(dir); await restart.init();
  expect(restart.get('123456789012345678').config.musicEnabled).toBe(false);
  expect(restart.get('123456789012345678').voices['223456789012345678']).toBe('voice3');
  expect(restart.get('323456789012345678')).toEqual({config:defaultVoiceConfig(),voices:{}});
  expect(() => parseVoiceConfig({...defaultVoiceConfig(),volume:101})).toThrow();
  expect(() => parseVoiceConfig({...defaultVoiceConfig(),defaultVoice:['voice1']})).toThrow();
});
it('requires membership, channel permissions, and current command access before joining TTS',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'cyro-tts-'));directories.push(dir);
  const guildId='123456789012345678',userId='223456789012345678',channelId='323456789012345678';
  const channel={id:channelId,guildId,type:ChannelType.GuildVoice,permissionsFor:()=>({has:()=>true}),send:vi.fn(async()=>({}))};
  const member={id:userId,pending:false,voice:{channelId},permissions:{has:()=>true}};
  const guild={id:guildId,members:{fetch:vi.fn(async()=>member),fetchMe:vi.fn(async()=>({id:'bot'}))},channels:{fetch:vi.fn(async()=>channel)}};
  const client=Object.assign(new EventEmitter(),{guilds:{cache:new Collection([[guildId,guild]])},user:{id:'bot'}});
  const access={command:vi.fn(async()=>{}),commandMember:vi.fn()};
  const output={play:vi.fn(async()=>{}),stop:vi.fn(),close:vi.fn()};const connect=vi.fn(async()=>output);
  const service=new VoiceService(client as never,dir,{warn:vi.fn()} as never,access as never,connect);await service.init();
  member.voice.channelId='';await expect(service.startTts(guild as never,userId)).rejects.toThrow('Join');expect(connect).not.toHaveBeenCalled();
  member.voice.channelId=channelId;access.command.mockRejectedValueOnce(new Error('denied'));await expect(service.startTts(guild as never,userId)).rejects.toThrow('denied');
  await service.startTts(guild as never,userId);expect(connect).toHaveBeenCalledOnce();expect(service.snapshot(guildId).session?.mode).toBe('tts');expect(channel.send).toHaveBeenCalledOnce();
  service.stop();await service.flush();
});
it('reads safe plain text without expanding mentions, links, spoilers, or commands',()=>{
  expect(spokenText('hello <@123456789012345678> https://example.com/a ||private|| <:wave:123456789012345678>')).toBe('hello someone link spoiler wave');
  expect(spokenText('/confess private')).toBe('');
  expect(spokenText('x'.repeat(401))).toHaveLength(400);
  expect(spokenText('Bonjour <@123456789012345678> https://example.com ||secret||', 'fr')).toBe('Bonjour quelqu’un lien contenu masqué');
  expect(spokenText('Hola <@123456789012345678> https://example.com ||secreto||', 'es')).toBe('Hola alguien enlace contenido oculto');
  expect(spokenText('x'.repeat(399) + '🎵')).toBe('x'.repeat(399));
});
it('reserves one channel and mode per guild while connection is pending', async () => {
  let finish!:()=>void; const wait=new Promise<void>(resolve=>{finish=resolve;});
  const output={play:vi.fn(async()=>{}),stop:vi.fn(),close:vi.fn()};
  const connect=vi.fn(async()=>{await wait;return output;});
  const sessions=new VoiceSessions(connect);
  const first=sessions.join('one','channel1','music',defaultVoiceConfig());
  await expect(sessions.join('one','channel2','music',defaultVoiceConfig())).rejects.toThrow('another voice channel');
  await expect(sessions.join('one','channel1','tts',defaultVoiceConfig())).rejects.toThrow('music');
  const other=sessions.join('two','channel2','tts',defaultVoiceConfig()); finish(); await Promise.all([first,other]);
  expect(connect).toHaveBeenCalledTimes(2); expect(sessions.snapshot('one')?.channelId).toBe('channel1');
  sessions.stopAll(); await sessions.flush(); expect(output.close).toHaveBeenCalledTimes(2);
});
it('reads only new call-chat messages from human members of that same call',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'cyro-tts-msg-'));directories.push(dir);
  const guildId='123456789012345678',channelId='323456789012345678';
  const access={commandMember:vi.fn(),command:vi.fn(async()=>{})};const client=Object.assign(new EventEmitter(),{guilds:{cache:new Collection()},user:{id:'bot'}});
  const output={play:vi.fn(async()=>{}),stop:vi.fn(),close:vi.fn()};
  const service=new VoiceService(client as never,dir,{warn:vi.fn()} as never,access as never,async()=>output);await service.init();
  await service.sessions.join(guildId,channelId,'tts',defaultVoiceConfig());
  // Model a successfully posted notice; connecting alone must no longer authorize speech.
  service.sessions.activateTts(guildId,channelId,service.sessions.assertChannel(guildId,channelId));
  const member={voice:{channelId},pending:false};const channel={id:channelId,guildId,type:ChannelType.GuildVoice,permissionsFor:()=>({has:()=>true})};
  const guild={id:guildId,members:{fetch:async()=>member,fetchMe:async()=>({})},channels:{fetch:async()=>channel}};
  const message={id:'m',guildId,channelId,guild,member,author:{id:'223456789012345678',bot:false},content:'hello call',createdTimestamp:Date.now()+1,webhookId:null};
  expect(await service.readMessage({...message,channelId:'wrong'} as never)).toBe(false);
  expect(await service.readMessage({...message,author:{...message.author,bot:true}} as never)).toBe(false);
  expect(await service.readMessage({...message,createdTimestamp:1} as never)).toBe(false);
  member.voice.channelId='wrong';expect(await service.readMessage(message as never)).toBe(false);member.voice.channelId=channelId;
  expect(await service.readMessage(message as never)).toBe(true);await service.sessions.flush();expect(output.play).toHaveBeenCalledOnce();
  expect(await service.readMessage(message as never)).toBe(false);
  service.stop();await service.flush();
});
it('registers music, TTS voices, and anonymous confession as guild-install commands with input bounds', async()=>{
  const {createRegistrationPlan}=await import('../src/commands/register.js');
  const plan=createRegistrationPlan({discordClientId:'123456789012345678',commandScope:'global'});
  const names=plan.body.map(x=>x.name);
  for(const name of ['playmusic','musicqueue','skipmusic','stopmusic','addtts','stoptts','ttsvoice','ttsvoice1','ttsvoice2','ttsvoice3','ttsvoice4','confess'])expect(names).toContain(name);
  const confession=plan.body.find(x=>x.name==='confess');expect(confession?.options?.[0]).toMatchObject({name:'confession',required:true,max_length:1500});
});
it('rejects unsupported music pages before connecting and only queues accepted audio links',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'cyro-music-'));directories.push(dir);
  const guildId='123456789012345678',userId='223456789012345678',channelId='323456789012345678';
  const channel={id:channelId,guildId,type:ChannelType.GuildVoice,permissionsFor:()=>({has:()=>true})};
  const member={id:userId,pending:false,voice:{channelId},permissions:{has:()=>true}};
  const guild={id:guildId,members:{fetch:async()=>member,fetchMe:async()=>({})},channels:{fetch:async()=>channel}};
  const output={play:vi.fn(async()=>{}),stop:vi.fn(),close:vi.fn()},connect=vi.fn(async()=>output);
  const client=Object.assign(new EventEmitter(),{guilds:{cache:new Collection([[guildId,guild]])},user:{id:'bot'}});
  const service=new VoiceService(client as never,dir,{warn:vi.fn()} as never,{command:vi.fn(async()=>{})} as never,connect);await service.init();
  await expect(service.playMusic(guild as never,userId,'https://youtube.com/watch?v=test')).rejects.toThrow();expect(connect).not.toHaveBeenCalled();
  await service.playMusic(guild as never,userId,'https://example.org/song.mp3');expect(output.play).toHaveBeenCalledWith(expect.objectContaining({kind:'music',url:'https://example.org/song.mp3'}),expect.anything(),expect.any(AbortSignal));
  service.stop();await service.flush();
});
