import { expect, it } from 'vitest';
import { commandBuilders } from '../src/commands/builders.js';
import { communityCommands } from '../src/community/commands.js';
import { moderationCommands } from '../src/moderation/index.js';
import { DashboardStreams } from '../src/dashboard/streams.js';
import type { Guild } from 'discord.js';

it('serializes all community and moderation commands without collisions',()=>{
  const commands=[...commandBuilders,...communityCommands,...moderationCommands].map(c=>c.toJSON());
  expect(new Set(commands.map(c=>c.name)).size).toBe(commands.length);
  expect(commands.map(c=>c.name)).toEqual(expect.arrayContaining(['twitch','kick','tiktok','counting','invites','ticket','moderate','apply','staff-leaderboard']));
});

it('rejects editing or removing another guilds stream and rejects state injection',async()=>{
  const streams=new DashboardStreams({get:async()=>({id:'stream',guildId:'other'})} as never,{} as never,{} as never,{withLock:async(fn:()=>Promise<unknown>)=>fn()} as never);
  const guild={id:'own'} as Guild;
  await expect(streams.update(guild,'stream',{enabled:false})).rejects.toThrow('not found');
  await expect(streams.remove(guild,'stream')).rejects.toThrow('not found');
  await expect(streams.update(guild,'stream',{guildId:'own',state:'live'})).rejects.toThrow('Unknown stream setting');
});
