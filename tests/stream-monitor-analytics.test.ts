import { expect, it, vi } from 'vitest';
import { StreamMonitor } from '../src/services/monitor.js';
import { Logger } from '../src/logger.js';
import { setImmediate } from 'node:timers/promises';

it('breaks analytics continuity on a provider error without changing the stream state', async () => {
  const record = { id: 's', guildId: 'g', enabled: true, platform: 'twitch' };
  const analytics = { pause: vi.fn(async () => undefined), pauseAll: vi.fn(async () => undefined), pauseGuild: vi.fn(async () => undefined) };
  const alerts = { markLive: vi.fn(), markOffline: vi.fn() };
  const monitor = new StreamMonitor({ all: async () => [record] } as never,
    { twitch: { checkMany: async () => new Map([['s', { kind: 'error', error: 'timeout' }]]) } } as never,
    alerts as never, new Logger('error'), 60, () => true, analytics);
  await monitor.check();
  expect(analytics.pause).toHaveBeenCalledWith('s');
  expect(alerts.markLive).not.toHaveBeenCalled();
  expect(alerts.markOffline).not.toHaveBeenCalled();
});

it('pauses statistics for disabled streamers and guilds the bot cannot currently see', async () => {
  const records = [{ id: 'paused', guildId: 'g', enabled: false, platform: 'twitch' }, { id: 'unavailable', guildId: 'absent', enabled: true, platform: 'twitch' }];
  const analytics = { pause: vi.fn(async () => undefined), pauseAll: vi.fn(async () => undefined), pauseGuild: vi.fn(async () => undefined) };
  const checkMany = vi.fn();
  const monitor = new StreamMonitor({ all: async () => records } as never, { twitch: { checkMany } } as never,
    {} as never, new Logger('error'), 60, guildId => guildId === 'g', analytics);
  await monitor.check();
  expect(analytics.pause).toHaveBeenCalledWith('paused');
  expect(analytics.pause).toHaveBeenCalledWith('unavailable');
  expect(checkMany).not.toHaveBeenCalled();
});

it('breaks every baseline when a provider aborts the monitor pass', async () => {
  const analytics = { pause: vi.fn(async () => undefined), pauseAll: vi.fn(async () => undefined), pauseGuild: vi.fn(async () => undefined) };
  const monitor = new StreamMonitor({ all: async () => [{ id: 's', guildId: 'g', enabled: true, platform: 'twitch' }] } as never,
    { twitch: { checkMany: async () => { throw new Error('provider failed'); } } } as never,
    {} as never, new Logger('error'), 60, () => true, analytics);
  await monitor.check();
  expect(analytics.pauseAll).toHaveBeenCalledOnce();
});

it('does not apply a live snapshot if the guild disconnects during the provider request', async () => {
  let connected = true;
  const analytics = { pause: vi.fn(async () => undefined), pauseAll: vi.fn(async () => undefined), pauseGuild: vi.fn(async () => undefined) };
  const alerts = { markLive: vi.fn() };
  const monitor = new StreamMonitor({ all: async () => [{ id: 's', guildId: 'g', enabled: true, platform: 'twitch' }] } as never,
    { twitch: { checkMany: async () => { connected = false; return new Map([['s', { kind: 'live', snapshot: {} }]]); } } } as never,
    alerts as never, new Logger('error'), 60, () => connected, analytics);
  await monitor.check();
  expect(analytics.pause).toHaveBeenCalledWith('s');
  expect(alerts.markLive).not.toHaveBeenCalled();
});

it('a single guild outage breaks only that guild’s baselines', async () => {
  const analytics = { pause: vi.fn(async () => undefined), pauseAll: vi.fn(async () => undefined), pauseGuild:vi.fn(async()=>undefined) };
  const monitor = new StreamMonitor({ all: async () => [{ id: 'a', guildId: 'guild-a' }, { id: 'b', guildId: 'guild-b' }] } as never,
    {} as never, {} as never, new Logger('error'), 60, () => true, analytics);
  await monitor.pauseTracking('guild-a');
  expect(analytics.pauseGuild).toHaveBeenCalledExactlyOnceWith('guild-a');
  expect(analytics.pauseAll).not.toHaveBeenCalled();
});

it('enqueues an outage pause immediately while a provider is in flight', async () => {
  let finish!:()=>void;const gate=new Promise<void>(resolve=>{finish=resolve;});
  const order:string[]=[];
  const analytics={pause:async()=>undefined,pauseGuild:async()=>undefined,pauseAll:async()=>{order.push('pause');}};
  const monitor=new StreamMonitor({all:async()=>[{id:'s',guildId:'g',enabled:true,platform:'twitch'}]} as never,
    {twitch:{checkMany:async()=>{await gate;return new Map([['s',{kind:'live',snapshot:{}}]]);}}} as never,
    {markLive:async()=>{order.push('observe');}} as never,new Logger('error'),60,()=>true,analytics);
  const checking=monitor.check();await setImmediate();
  const pausing=monitor.pauseTracking();
  try { expect(order).toEqual(['pause']); }
  finally {finish();await Promise.all([checking,pausing]);}
  expect(order).toEqual(['pause','observe']);
});
