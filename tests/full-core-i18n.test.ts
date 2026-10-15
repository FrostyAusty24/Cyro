import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Events, MessageFlags, type Client } from 'discord.js';
import { CommandHandler } from '../src/commands/handler.js';
import { AlertService } from '../src/services/alert-service.js';
import { DEFAULT_MESSAGE_TEMPLATE, renderMessage } from '../src/utils/template.js';
import { DEFAULT_UPLOAD_TEMPLATE, renderUploadMessage } from '../src/services/content-alerts.js';
import { botText, botError, BotMessageError, setBotLocaleResolver } from '../src/i18n/index.js';
import { ALL_MESSAGE_ROWS, BOT_TRANSLATIONS } from '../src/i18n/messages.js';
import { TTS_VOICES } from '../src/voice/catalog.js';
import { localizedVoiceName, voiceChoices } from '../src/voice/voice-search.js';
import type { LiveSnapshot, StreamerRecord, UploadSnapshot } from '../src/types.js';

const G='111111111111111111', C='222222222222222222', R='333333333333333333', U='444444444444444444';
const locales=['fr','es','de','pt'] as const;
const logger:any={error:vi.fn(),warn:vi.fn(),info:vi.fn()};
const record=():StreamerRecord=>({id:'stream-one',guildId:G,platform:'twitch',username:'creator',displayName:'Creator {url}',alertChannelId:C,pingRoleId:R,cooldownSeconds:0,messageTemplate:DEFAULT_MESSAGE_TEMPLATE,cleanupMode:'offline',enabled:true,state:'unknown',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'});
const live=():LiveSnapshot=>({sessionId:'session-one',title:'A user title {viewers}',category:'Custom game name',viewerCount:1234,url:'https://twitch.tv/creator',startedAt:'2026-01-01T00:00:00Z'});
const video:UploadSnapshot={id:'video-one',title:'Keep this video title {url}',url:'https://www.youtube.com/watch?v=abcdefghijk',publishedAt:'2026-01-01T00:00:00Z'};
const embed=(payload:any)=>payload.embeds[0].toJSON?.()??payload.embeds[0];
afterEach(()=>{setBotLocaleResolver(()=>'en');vi.clearAllMocks();});

async function command(commandName:string,subcommand:string,locale:string,guildLocale='en-US'){
  const client=new EventEmitter(); const item=record();
  const store:any={forGuild:vi.fn(async()=>[item])};
  const providers:any=Object.fromEntries(['twitch','kick','tiktok','youtube'].map(platform=>[platform,{isConfigured:()=>platform!=='twitch',configurationHint:()=> 'Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env.'}]));
  const analytics:any={snapshot:vi.fn(async()=>({retentionDays:90,updatedAt:null,leaderboards:{'7d':[{streamerId:item.id,platform:'twitch',displayName:'Creator',username:'creator',trackedMilliseconds:3660000,averageViewers:1234.5,peakViewers:null,followersGained:3,viewerTrackedMilliseconds:3660000,followerTrackedMilliseconds:3660000,sessions:1,active:false,lastTrackedAt:'2026-01-01T00:00:00Z'}],'30d':[],all:[]}}))};
  const interaction:any={commandName,guildId:G,guild:{id:G,preferredLocale:guildLocale},locale,user:{id:U},memberPermissions:{has:()=>commandName!=='streamer-leaderboard'},deferred:false,replied:false,
    isAutocomplete:()=>false,isChatInputCommand:()=>true,isRepliable:()=>true,inCachedGuild:()=>true,options:{getSubcommand:()=>subcommand,getString:()=>null},
    deferReply:vi.fn(async()=>{interaction.deferred=true;}),editReply:vi.fn(async()=>{}),reply:vi.fn(async()=>{})};
  const handler=new CommandHandler(client as Client,store,providers,{} as never,{} as never,logger,analytics);
  handler.attach();client.emit(Events.InteractionCreate,interaction);await handler.flush();handler.stop();
  expect(logger.error).not.toHaveBeenCalled();expect(interaction.editReply).toHaveBeenCalledOnce();
  return {interaction,payload:interaction.editReply.mock.calls[0][0],store,analytics};
}

it.each(locales)('localizes actual streamer list/status command replies in private %s locale',async locale=>{
  setBotLocaleResolver(()=>'auto');
  const list=await command('twitch','list',locale);
  expect(list.interaction.deferReply).toHaveBeenCalledWith({flags:MessageFlags.Ephemeral});
  expect(list.store.forGuild).toHaveBeenCalledWith(G,'twitch');
  const listed=embed(list.payload);
  expect(listed.title).toBe(botText(G,'{platform} streamers ({count})',{platform:'Twitch',count:1},locale));
  expect(listed.title).not.toBe('Twitch streamers (1)');expect(listed.description).toContain('Creator {url}');
  expect(listed.description).toContain(`<#${C}>`);expect(listed.description).toContain(`<@&${R}>`);
  expect(listed.description).not.toContain('cleanup:');expect(list.payload.allowedMentions).toEqual({parse:[]});
  const status=await command('streamalerts','status',locale);
  const statusEmbed=embed(status.payload);expect(statusEmbed.title).toBe(botText(G,'Stream Alerts status',{},locale));
  expect(statusEmbed.description).toContain(botText(G,'Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env.',{},locale));
  expect(statusEmbed.fields[0].name).toBe(botText(G,'Tracked',{},locale));expect(statusEmbed.fields[0].value).toBe('1');
  expect(statusEmbed.footer.text).toContain('{streamer}');expect(statusEmbed.footer.text).toContain('{url}');
});

it.each(locales)('renders the public leaderboard in guild %s even when the caller uses English',async locale=>{
  setBotLocaleResolver(()=>'auto');
  const result=await command('streamer-leaderboard','', 'en-US',locale);
  expect(result.interaction.deferReply).toHaveBeenCalledWith();expect(result.analytics.snapshot).toHaveBeenCalledExactlyOnceWith(G);
  const data=embed(result.payload);
  const period=botText(G,'Last {days} UTC days',{days:7},locale);
  expect(data.title).toBe(botText(G,'Streamer leaderboard · {period}',{period},locale));expect(data.title).not.toContain('Streamer leaderboard');
  expect(data.description).toContain('Creator');expect(data.description).toContain('twitch');expect(data.description).toContain('+3');
  expect(data.description).toContain(botText(G,'Unavailable',{},locale));
  expect(data.description).toContain(new Intl.NumberFormat(locale==='pt'?'pt-BR':locale,{maximumFractionDigits:1}).format(1234.5));
  expect(result.payload.allowedMentions).toEqual({parse:[]});
});

it.each(locales)('renders real test/live/offline alert payloads in guild %s without touching creator titles',async locale=>{
  setBotLocaleResolver(()=> 'auto'); let saved=record();
  const message:any={id:'555555555555555555',channelId:C,edit:vi.fn(async()=>{}),delete:vi.fn(async()=>{})};
  const channel:any={guildId:G,isSendable:()=>true,isTextBased:()=>true,send:vi.fn(async()=>message),messages:{fetch:vi.fn(async()=>message)}};
  const guild:any={id:G,preferredLocale:locale,channels:{fetch:vi.fn(async()=>channel)}};
  const client:any={guilds:{fetch:vi.fn(async()=>guild)}};
  const store:any={update:vi.fn(async(_id:string,patch:Partial<StreamerRecord>)=>saved={...saved,...patch}),forGuild:vi.fn(async()=>[saved])};
  const service=new AlertService(client,store,logger);
  await service.testAlert(saved);
  const test=channel.send.mock.calls[0][0], testEmbed=embed(test);
  expect(test.allowedMentions).toEqual({parse:[]});expect(test.content).not.toContain(`<@&${R}>`);
  expect(testEmbed.description).toBe(`**${botText(G,'This is a test live alert',{},locale)}**`);
  expect(testEmbed.fields[0].value).toBe(botText(G,'Test category',{},locale));
  expect(testEmbed.footer.text).toBe(`${botText(G,'Test alert',{},locale)} • creator`);
  await service.markLive(saved,live());
  const posted=channel.send.mock.calls[1][0], postedEmbed=embed(posted);
  expect(posted.allowedMentions).toEqual({parse:[],roles:[R]});expect(posted.content).toContain('Creator {url}');
  expect(postedEmbed.description).toBe('**A user title {viewers}**');expect(postedEmbed.fields[0].value).toBe('Custom game name');
  expect(postedEmbed.fields[1].name).toBe(botText(G,'Viewers',{},locale));
  expect(postedEmbed.fields[1].value).toBe(new Intl.NumberFormat(locale==='pt'?'pt-BR':locale).format(1234));
  expect(postedEmbed.fields[2].value).toMatch(/^<t:\d+:R>$/);
  await service.markOffline(saved);
  expect(message.edit).toHaveBeenCalledOnce();const offline=message.edit.mock.calls[0][0], offEmbed=embed(offline);
  expect(offEmbed.title).toBe(botText(G,'{name} is now offline',{name:'Creator {url}'},locale));
  expect(offEmbed.description).toContain('A user title {viewers}');expect(offEmbed.description).not.toContain('Last stream:');
  expect(offline.allowedMentions).toEqual({parse:[]});expect(logger.error).not.toHaveBeenCalled();
});

it.each(locales)('localizes default live/upload templates in %s and renders custom templates in one pass',locale=>{
  setBotLocaleResolver(id=>id===G?locale:'en'); const item=record();
  const rendered=renderMessage(item,live());expect(rendered).not.toContain('is LIVE on');expect(rendered).toContain('Creator {url}');expect(rendered).toContain(live().url);expect(rendered).toContain(`<@&${R}>`);
  const upload=renderUploadMessage(item,video);expect(upload).not.toContain('uploaded a new video on');expect(upload).toContain(video.title);expect(upload).toContain('Creator {url}');
  const custom=renderMessage({...item,messageTemplate:'KEEP ENGLISH | {streamer} | {title} | {url}'},live());
  expect(custom).toBe('KEEP ENGLISH | Creator {url} | A user title {viewers} | https://twitch.tv/creator');
  const uploadItem={...item,uploads:{enabled:true,channelId:C,messageTemplate:'KEEP ENGLISH | {creator} | {title} | {url}'}} as StreamerRecord;
  expect(renderUploadMessage(uploadItem,video)).toBe(`KEEP ENGLISH | Creator {url} | ${video.title} | ${video.url}`);
  expect(renderMessage({...item,guildId:'666666666666666666'},live())).toContain('is LIVE on');
  expect(renderUploadMessage({...item,uploads:{...uploadItem.uploads!,messageTemplate:DEFAULT_UPLOAD_TEMPLATE}},video)).toBe(upload);
  expect(renderMessage({...item,messageTemplate:'{title}'},{...live(),title:''})).toBe(botText(G,'Untitled stream'));
  expect(renderUploadMessage(uploadItem,{...video,title:''})).toContain(botText(G,'Untitled video'));
  expect(renderMessage({...item,messageTemplate:'{title}'},{...live(),title:'Untitled stream'})).toBe('Untitled stream');
  expect(renderUploadMessage(uploadItem,{...video,title:'Untitled video'})).toContain('Untitled video');
});

it.each(locales)('translates structured failures in %s while redacting unrecognized provider text',locale=>{
  setBotLocaleResolver(()=>'auto');
  const safe=new BotMessageError('That YouTube video exceeds this server’s {minutes}-minute music limit.',{minutes:15});
  expect(safe.message).toBe('That YouTube video exceeds this server’s 15-minute music limit.');
  const text=botError(G,safe,locale);expect(text).toContain('15');expect(text).not.toContain('{minutes}');expect(text).not.toBe(safe.message);
  const maliciousName='{minutes} @everyone';const nested=new BotMessageError('{name} is already configured. Use /{platform} edit instead.',{name:maliciousName,platform:'twitch'});
  const translated=botError(G,nested,locale);expect(translated).toContain(maliciousName);expect(translated).toContain('/twitch edit');
  expect(botError(G,new Error('PRIVATE signed_url?token=SECRET'),locale)).toBe(botText(G,'Something went wrong.',{},locale));
  expect(botError(G,new BotMessageError('A future unmapped failure.'),locale)).toBe(botText(G,'Something went wrong.',{},locale));
});

it.each(locales)('localizes voice descriptions in %s while preserving existing IDs and proper names',locale=>{
  for(const voice of TTS_VOICES){
    const label=localizedVoiceName(voice,locale);expect(label).toContain(voice.name.split(' · ')[0]);
    expect(label).toContain(botText(null,voice.gender==='male'?'Male voice':'Female voice',{},locale));
    const choice=voiceChoices(voice.id,locale).find(item=>item.value===voice.id);expect(choice?.value).toBe(voice.id);expect(choice?.name).toBe(label.slice(0,100));
  }
  expect(TTS_VOICES.slice(0,12).map(v=>v.id)).toEqual(Array.from({length:12},(_,i)=>`voice${i+1}`));
});

it('keeps every merged translation UTF-8 clean with identical placeholder counts and slash command tokens',()=>{
  const placeholders=(text:string)=>[...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(m=>m[1]).sort();
  // Match command-like tokens preceded by whitespace or formatting, never URL paths or prose fractions.
  const commands=(text:string)=>[...text.matchAll(/(?:^|[\s`(*])\/([a-z][a-z0-9]*(?:-[a-z0-9]+)*)(?=$|[\s`.,;:!?)\u2013\u2014]|-[A-ZÄÖÜ])/g)].map(m=>m[1]).sort();
  expect(ALL_MESSAGE_ROWS.length).toBeGreaterThan(300);
  for(const [en,...translations]of ALL_MESSAGE_ROWS){
    expect(translations).toHaveLength(4);
    for(const [index,translation]of translations.entries()){
      const label=`${locales[index]}: ${en}`;
      expect(translation.trim(),label).not.toBe('');expect(translation,label).not.toContain('\uFFFD');
      expect(placeholders(translation),label).toEqual(placeholders(en));expect(commands(translation),label).toEqual(commands(en));
    }
    for(const locale of locales)expect(BOT_TRANSLATIONS[en]?.[locale],`${locale}: ${en}`).toBeTruthy();
  }
});
