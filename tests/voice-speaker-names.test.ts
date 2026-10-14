import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { ChannelType, Collection } from 'discord.js';
import { VoiceStore, defaultVoiceConfig, parseVoiceConfig } from '../src/voice/store.js';
import { VoiceService } from '../src/voice/service.js';
import { prepareSpeechText, speechSpeakerName, TTS_SPEAKER_MAX_CHARACTERS } from '../src/voice/speech-text.js';
import { synthesizeSpeech } from '../src/voice/tts.js';
import { NeuralTtsQueue } from '../src/voice/neural-runtime.js';

const A = '123456789012345678', B = '223456789012345678', U = '323456789012345678';
const directories: string[] = [], services: VoiceService[] = [];
afterEach(async () => {
  for (const service of services.splice(0)) { service.stop(); await service.flush(); }
  for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});
async function directory() { const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-speaker-')); directories.push(dir); return dir; }

it('migrates old voice settings with names off and rejects non-boolean toggles', async () => {
  const dir = await directory();
  const { announceSpeaker, ...legacy } = defaultVoiceConfig();
  expect(announceSpeaker).toBe(false);
  await writeFile(path.join(dir, 'voice.json'), JSON.stringify({ version: 1, guilds: { [A]: { config: legacy, voices: { [U]: 'voice3' } } } }));
  const store = new VoiceStore(dir); await store.init();
  expect(store.get(A)).toEqual({ config: defaultVoiceConfig(), voices: { [U]: 'voice3' } });
  for (const value of [null, 0, 1, 'true', {}, []]) expect(() => parseVoiceConfig({ ...legacy, announceSpeaker: value })).toThrow();
  expect(parseVoiceConfig({ ...legacy, announceSpeaker: true }).announceSpeaker).toBe(true);
});

it('persists the toggle per guild without changing the member’s other server or voice choice', async () => {
  const dir = await directory(); const store = new VoiceStore(dir); await store.init();
  await store.mutate(A, state => { state.config.announceSpeaker = true; state.voices[U] = 'voice12'; });
  await store.mutate(B, state => { state.voices[U] = 'voice1'; });
  const restart = new VoiceStore(dir); await restart.init();
  expect(restart.get(A)).toMatchObject({ config: { announceSpeaker: true }, voices: { [U]: 'voice12' } });
  expect(restart.get(B)).toMatchObject({ config: { announceSpeaker: false }, voices: { [U]: 'voice1' } });
  expect(await readFile(path.join(dir, 'voice.json'), 'utf8')).not.toContain('speakerName');
});

it('cleans speaker labels with a bounded nickname, username fallback, and no markup or hidden controls', () => {
  expect(speechSpeakerName('**Frosty**')).toBe('Frosty');
  expect(speechSpeakerName('Fr\u202eosty\u0000 <@123456789012345678> @everyone https://example.org/foo')).toBe('Fr osty');
  expect(speechSpeakerName('|| <@&123456789012345678> ||', 'frosty_austy')).toBe('frosty austy');
  expect(speechSpeakerName('😀', '___')).toBe('Someone');
  expect(speechSpeakerName('Élodie’s-name')).toBe('Élodie’s-name');
  expect(speechSpeakerName('名'.repeat(200))).toHaveLength(TTS_SPEAKER_MAX_CHARACTERS);
});

it('adds the speaker label without taking any of the existing 400-character message budget', async () => {
  const original = 'x'.repeat(400), name = 'F'.repeat(TTS_SPEAKER_MAX_CHARACTERS);
  expect(prepareSpeechText(original, name)).toBe(`${name} said: ${original}`);
  expect(prepareSpeechText(original)).toBe(original);
  expect(() => prepareSpeechText(' '.repeat(10), name)).toThrow(/1–400/);
  expect(() => prepareSpeechText(original + 'x', name)).toThrow(/1–400/);
  expect(() => prepareSpeechText('Hello', name + 'x')).toThrow(/speaker name/);
  expect(() => prepareSpeechText('Hello', {} as never)).toThrow(/speaker name/);
  const synthesis = vi.spyOn(NeuralTtsQueue.prototype, 'synthesize').mockResolvedValue(Buffer.from('audio'));
  await synthesizeSpeech(original, 'voice3', undefined, name);
  expect(synthesis).toHaveBeenCalledExactlyOnceWith(original, 'af_heart', undefined, name);
  await expect(synthesizeSpeech(original + 'x', 'voice3', undefined, name)).rejects.toThrow(/1–400/);
  expect(synthesis).toHaveBeenCalledTimes(1);
});

it('names ordinary eligible call chat only when that server opts in, retaining each member’s chosen voice', async () => {
  const dir = await directory(); let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now);
  const outputs = new Map<string, { play: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> }>();
  const client = Object.assign(new EventEmitter(), { guilds: { cache: new Collection() }, user: { id: 'bot' } });
  const access = { command: vi.fn(async () => {}), commandMember: vi.fn() };
  const service = new VoiceService(client as never, dir, { warn: vi.fn() } as never, access as never, async id => {
    const output = { play: vi.fn(async () => {}), stop: vi.fn(), close: vi.fn() }; outputs.set(id, output); return output;
  }); services.push(service); await service.init(); service.setRuntimeStatus({ audio: true, tts: true, dave: true });
  const makeGuild = (id: string, displayName: string) => {
    const channel = { id: id === A ? '423456789012345678' : '523456789012345678', guildId: id, type: ChannelType.GuildVoice, permissionsFor: () => ({ has: () => true }), send: vi.fn(async () => ({})) };
    const member = { id: U, displayName, pending: false, voice: { channelId: channel.id } };
    const guild = { id, members: { fetch: async () => member, fetchMe: async () => ({}) }, channels: { fetch: async () => channel } };
    const message = (content: string) => ({ id: `message-${now}`, guildId: id, guild, channelId: channel.id, member, author: { id: U, username: 'user_name', bot: false }, content, createdTimestamp: now + 1, webhookId: null });
    return { guild, member, message };
  };
  const first = makeGuild(A, '**Frosty**'), second = makeGuild(B, 'Another nickname');
  await service.updateConfig(A, { ...defaultVoiceConfig(), announceSpeaker: true });
  await service.setVoice(first.guild as never, U, 'voice12');
  await service.startTts(first.guild as never, U); await service.startTts(second.guild as never, U);
  expect(await service.readMessage(first.message('/confess private') as never)).toBe(false);
  expect(await service.readMessage(first.message('   ') as never)).toBe(false);
  expect(await service.readMessage(first.message('x'.repeat(400)) as never)).toBe(true);
  expect(await service.readMessage(second.message('Hello everyone.') as never)).toBe(true);
  await service.sessions.flush();
  expect(outputs.get(A)!.play).toHaveBeenCalledWith(expect.objectContaining({ text: 'x'.repeat(400), speakerName: 'Frosty', voice: 'voice12' }), expect.anything(), expect.any(AbortSignal));
  expect(outputs.get(B)!.play).toHaveBeenCalledWith(expect.objectContaining({ text: 'Hello everyone.', speakerName: undefined, voice: 'voice1' }), expect.anything(), expect.any(AbortSignal));
  now += 2001; await service.updateConfig(A, { ...service.getConfig(A), announceSpeaker: false });
  expect(await service.readMessage(first.message('Just the message.') as never)).toBe(true); await service.sessions.flush();
  expect(outputs.get(A)!.play).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Just the message.', speakerName: undefined, voice: 'voice12' }), expect.objectContaining({ announceSpeaker: false }), expect.any(AbortSignal));
});
