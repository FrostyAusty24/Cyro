import { EventEmitter } from 'node:events';
import { Events, type Client } from 'discord.js';
import { expect, it, vi } from 'vitest';
import { CommandHandler } from '../src/commands/handler.js';
import { commandBuilders } from '../src/commands/builders.js';
import { Logger } from '../src/logger.js';

it('lets guild members read their own streamer leaderboard without granting management access', async () => {
  const client=new EventEmitter();
  const snapshot=vi.fn(async()=>({retentionDays:90,updatedAt:null,leaderboards:{'7d':[{streamerId:'s',platform:'twitch',displayName:'Creator',username:'creator',trackedMilliseconds:3600000,averageViewers:25,peakViewers:40,followersGained:3,viewerTrackedMilliseconds:3600000,followerTrackedMilliseconds:3600000,sessions:1,active:false,lastTrackedAt:'2026-10-12T12:00:00Z'}],'30d':[],all:[]}}));
  const interaction={commandName:'streamer-leaderboard',guildId:'guild-a',guild:{id:'guild-a',preferredLocale:'en-US'},isAutocomplete:()=>false,isChatInputCommand:()=>true,inCachedGuild:()=>true,
    memberPermissions:{has:()=>false},options:{getString:()=>null},deferReply:vi.fn(async()=>undefined),editReply:vi.fn(async()=>undefined)};
  const handler=new CommandHandler(client as Client,{} as never,{} as never,{} as never,{} as never,new Logger('error'),{snapshot} as never);
  handler.attach();client.emit(Events.InteractionCreate,interaction);await handler.flush();handler.stop();
  expect(snapshot).toHaveBeenCalledExactlyOnceWith('guild-a');
  expect(interaction.editReply).toHaveBeenCalledWith(expect.objectContaining({allowedMentions:{parse:[]},embeds:expect.any(Array)}));
  expect(commandBuilders.some(command=>command.name==='streamer-leaderboard')).toBe(true);
});
