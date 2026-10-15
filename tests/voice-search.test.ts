import { afterEach, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Collection, Events } from 'discord.js';
import { voiceChoices } from '../src/voice/voice-search.js';
import { TTS_VOICES } from '../src/voice/catalog.js';
import { VoiceService } from '../src/voice/service.js';
import { createRegistrationPlan } from '../src/commands/register.js';
import * as speech from '../src/voice/tts.js';

it('keeps every voice searchable within Discord’s 25-result limit',()=>{
  expect(voiceChoices('')).toHaveLength(Math.min(25,TTS_VOICES.length));
  for(const voice of TTS_VOICES) expect(voiceChoices(voice.id).some(choice=>choice.value===voice.id)).toBe(true);
  expect(voiceChoices('not-a-real-voice')).toEqual([]);
});

it('searches native language names and accents without matching female for male',()=>{
  expect(voiceChoices('francais').map(item=>item.value)).toContain('fr-siwis');
  expect(voiceChoices('PORTUGUÊS').map(item=>item.value)).toContain('pt-dora');
  expect(voiceChoices('Spanish male').map(item=>item.value)).toEqual(['es-alex','es-santa']);
  expect(voiceChoices('', 'pt-BR')[0]?.value).toBe('pt-dora');
  expect(voiceChoices('', 'en', id=>id==='voice12')).toEqual([{name:'Sarah · American female',value:'voice12'}]);
});

it('registers autocomplete without fixed choices and preserves twelve voice shortcuts',()=>{
  const plan=createRegistrationPlan({discordClientId:'123456789012345678',commandScope:'global'});
  const voice=plan.body.find(command=>command.name==='ttsvoice')?.options?.[0];
  expect(voice).toMatchObject({name:'voice',required:true,autocomplete:true,max_length:100});
  expect(voice).toHaveProperty('choices', undefined);
  for(let number=1;number<=12;number++)expect(plan.body.some(command=>command.name===`ttsvoice${number}`)).toBe(true);
});

const directories:string[]=[];
afterEach(async()=>{for(const directory of directories.splice(0))await rm(directory,{recursive:true,force:true});vi.restoreAllMocks();});
it('answers autocomplete without joining a call or reading member preferences',async()=>{
  vi.spyOn(speech,'voiceAvailable').mockReturnValue(true);
  const directory=await mkdtemp(path.join(os.tmpdir(),'cyro-voice-search-'));directories.push(directory);
  const client=Object.assign(new EventEmitter(),{guilds:{cache:new Collection()},user:{id:'bot'}});
  const access={command:vi.fn(),commandMember:vi.fn()};
  const connect=vi.fn();
  const service=new VoiceService(client as never,directory,{warn:vi.fn()} as never,access as never,connect);
  await service.init();service.attach();
  const respond=vi.fn(async()=>{});
  const input={isAutocomplete:()=>true,commandName:'ttsvoice',inCachedGuild:()=>true,guildId:'123456789012345678',locale:'en-US',options:{getFocused:()=>({name:'voice',value:'Daniel'})},respond};
  client.emit(Events.InteractionCreate,input);
  await service.flush();
  expect(respond).toHaveBeenCalledWith([{name:'Daniel · British male',value:'voice1'}]);
  expect(connect).not.toHaveBeenCalled();expect(access.command).not.toHaveBeenCalled();
  respond.mockClear();client.emit(Events.InteractionCreate,{...input,inCachedGuild:()=>false});await service.flush();expect(respond).toHaveBeenCalledWith([]);
  service.stop();await service.flush();
});
