import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { ChannelType, Collection } from 'discord.js';
import { VoiceService } from '../src/voice/service.js';
import { defaultVoiceConfig } from '../src/voice/store.js';

const A = '123456789012345678', U = '223456789012345678', C = '323456789012345678';
const folders: string[] = [], services: VoiceService[] = [];
afterEach(async () => { for (const service of services.splice(0)) { service.stop(); await service.flush(); } for (const dir of folders.splice(0)) await rm(dir, { recursive: true, force: true }); });
async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-voice-review-')); folders.push(dir);
  const channel: any = { id: C, guildId: A, type: ChannelType.GuildVoice, permissionsFor: () => ({ has: () => true }), send: vi.fn(async () => ({})) };
  const member: any = { id: U, pending: false, voice: { channelId: C }, permissions: { has: () => true }, user: { id: U, bot: false } };
  const guild: any = { id: A, members: { cache: new Collection([[U, member]]), fetch: vi.fn(async () => member), fetchMe: vi.fn(async () => ({ id: 'bot' })) }, channels: { fetch: vi.fn(async () => channel), cache: new Collection([[C, channel]]) } };
  member.guild = guild; channel.guild = guild;
  const client: any = Object.assign(new EventEmitter(), { guilds: { cache: new Collection([[A, guild]]) }, user: { id: 'bot' } });
  const access: any = { command: vi.fn(async () => {}), commandMember: vi.fn() };
  const output = { play: vi.fn(async () => {}), stop: vi.fn(), close: vi.fn() }, connect = vi.fn(async () => output);
  const service = new VoiceService(client, dir, { warn: vi.fn() } as any, access, connect); services.push(service); await service.init();
  const message = () => ({ id: 'message', guildId: A, channelId: C, guild, member, author: member.user, content: 'Hello call', createdTimestamp: Date.now() + 1, webhookId: null });
  return { service, channel, member, guild, client, access, output, connect, message };
}

it('waits for the TTS disclosure to be posted before reading any call-chat messages', async () => {
  const f = await fixture(); let release!: () => void, notify!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; }), announced = new Promise<void>(resolve => { notify = resolve; });
  f.channel.send.mockImplementationOnce(async () => { notify(); await waiting; return {}; });
  const start = f.service.startTts(f.guild, U); await announced;
  expect(await f.service.readMessage(f.message() as any)).toBe(false);
  expect(f.output.play).not.toHaveBeenCalled();
  release(); await start;
  expect(await f.service.readMessage(f.message() as any)).toBe(true);
});

it('serializes simultaneous TTS starts so a second command cannot bypass the first disclosure', async () => {
  const f = await fixture(); let release!: () => void, notify!: () => void;
  const waiting = new Promise<void>(resolve => { release = resolve; }), announced = new Promise<void>(resolve => { notify = resolve; });
  f.channel.send.mockImplementationOnce(async () => { notify(); await waiting; return {}; });
  const first = f.service.startTts(f.guild, U); await announced;
  let secondDone = false; const second = f.service.startTts(f.guild, U).then(() => { secondDone = true; });
  try {
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(secondDone).toBe(false); expect(await f.service.readMessage(f.message() as any)).toBe(false);
  } finally { release(); await Promise.all([first, second]); }
  expect(f.connect).toHaveBeenCalledOnce(); expect(f.channel.send).toHaveBeenCalledOnce();
});

it('cancels a new voice session if its requester leaves during the connection handshake', async () => {
  for (const mode of ['tts', 'music']) {
    const f = await fixture(); let release!: () => void, notify!: () => void;
    const wait = new Promise<void>(resolve => { release = resolve; }), connecting = new Promise<void>(resolve => { notify = resolve; });
    f.connect.mockImplementationOnce(async () => { notify(); await wait; return f.output; });
    const start = mode === 'tts' ? f.service.startTts(f.guild, U) : f.service.playMusic(f.guild, U, 'https://example.org/music.mp3');
    const result = expect(start).rejects.toThrow('Join');
    await connecting; f.member.voice.channelId = ''; release(); await result;
    expect(f.service.snapshot(A).session).toBeUndefined(); expect(f.output.play).not.toHaveBeenCalled(); expect(f.channel.send).not.toHaveBeenCalled();
  }
});

it('rechecks current command access when queued speech reaches playback', async () => {
  const f = await fixture(); await f.service.startTts(f.guild, U);
  let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; });
  f.output.play.mockImplementationOnce(async () => { await wait; });
  expect(await f.service.readMessage(f.message() as any)).toBe(true);
  const secondId = '423456789012345678';
  const second = { ...f.message(), author: { id: secondId, bot: false }, member: { ...f.member, id: secondId } };
  expect(await f.service.readMessage(second as any)).toBe(true);
  f.access.command.mockImplementation(async (_guild: any, id: string) => { if (id === secondId) throw new Error('Role revoked'); });
  release(); await f.service.sessions.flush();
  expect(f.output.play).toHaveBeenCalledOnce();
});

it('shows unavailable voice capabilities and rejects sessions when host checks fail', async () => {
  const f = await fixture();
  f.service.setRuntimeStatus({ audio: true, tts: true, dave: false });
  expect(f.service.snapshot(A).available).toEqual({ music: false, tts: false });
  await expect(f.service.startTts(f.guild, U)).rejects.toThrow('unavailable');
  await expect(f.service.playMusic(f.guild, U, 'https://example.org/song.mp3')).rejects.toThrow('unavailable');
  expect(f.connect).not.toHaveBeenCalled();
});

it('never tears down a replacement room when an old TTS notice fails late', async () => {
  const f = await fixture(); let reject!: (error: Error) => void, notify!: () => void;
  const wait = new Promise<void>((_resolve, rejectPromise) => { reject = rejectPromise; }), sending = new Promise<void>(resolve => { notify = resolve; });
  f.channel.send.mockImplementationOnce(async () => { notify(); await wait; return {}; });
  const start = f.service.startTts(f.guild, U); const result = expect(start).rejects.toThrow('notice'); await sending;
  f.service.sessions.leave(A);
  await f.service.sessions.join(A, C, 'music', defaultVoiceConfig());
  reject(new Error('Delayed send failed')); await result;
  expect(f.service.snapshot(A).session?.mode).toBe('music');
});
