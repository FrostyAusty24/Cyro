import { afterEach, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ChannelType, Collection } from 'discord.js';
import { VoiceService } from '../src/voice/service.js';
import { defaultVoiceConfig } from '../src/voice/store.js';
import { resolveYouTubeSource, YouTubeSourceError } from '../src/voice/youtube.js';
import { openYouTubeAudioStream } from '../src/voice/urls.js';
import { loadMusicSource } from '../src/voice/audio.js';
import { VoiceSessions } from '../src/voice/sessions.js';

vi.mock('../src/voice/youtube.js', async importOriginal => ({ ...await importOriginal<object>(), resolveYouTubeSource: vi.fn(), youtubeAvailable: () => true }));
vi.mock('../src/voice/urls.js', async importOriginal => ({ ...await importOriginal<object>(), openYouTubeAudioStream: vi.fn() }));
const directories: string[] = [];
const services: VoiceService[] = [];
afterEach(async () => { for (const service of services.splice(0)) { service.stop(); await service.flush(); } for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true }); vi.clearAllMocks(); });
const link = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ';
const source = { url: link, id: 'aqz-KE-bpKQ', title: 'Public video', durationSeconds: 120, mediaUrl: 'https://r1.googlevideo.com/videoplayback?signature=private' };
async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-youtube-service-')); directories.push(dir);
  const guildId = '123456789012345678', userId = '223456789012345678', channelId = '323456789012345678';
  const channel = { id: channelId, guildId, type: ChannelType.GuildVoice, permissionsFor: () => ({ has: () => true }) };
  const member = { id: userId, pending: false, voice: { channelId }, permissions: { has: () => true } };
  const guild = { id: guildId, members: { fetch: async () => member, fetchMe: async () => ({}) }, channels: { fetch: async () => channel } };
  const client = Object.assign(new EventEmitter(), { guilds: { cache: new Collection([[guildId, guild]]) }, user: { id: 'bot' } });
  const output = { play: vi.fn(async () => {}), stop: vi.fn(), close: vi.fn() }, connect = vi.fn(async () => output);
  const access = { command: vi.fn(async () => {}) };
  const service = new VoiceService(client as never, dir, { warn: vi.fn() } as never, access as never, connect);
  await service.init(); service.setRuntimeStatus({ audio: true, tts: true, dave: true }); services.push(service);
  return { service, guild: guild as never, guildId, userId, channelId, member, connect, output, access };
}
it('authorizes before source extraction and queues only canonical links, never signed media', async () => {
  const f = await fixture(); const resolver = vi.mocked(resolveYouTubeSource).mockResolvedValue(source);
  f.access.command.mockRejectedValueOnce(new Error('denied'));
  await expect(f.service.playMusic(f.guild, f.userId, link)).rejects.toThrow('denied'); expect(resolver).not.toHaveBeenCalled();
  await f.service.playMusic(f.guild, f.userId, 'https://youtu.be/aqz-KE-bpKQ?t=30'); await f.service.sessions.flush();
  expect(f.output.play).toHaveBeenCalledWith(expect.objectContaining({ title: 'Public video · YouTube', url: link }), expect.anything(), expect.any(AbortSignal));
  expect(JSON.stringify(f.output.play.mock.calls)).not.toContain('signature=private');
});
it('keeps dashboard disable responsive and cancels slow preflight before joining voice', async () => {
  const f = await fixture();
  vi.mocked(resolveYouTubeSource).mockImplementation((_url, options) => new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new YouTubeSourceError('cancelled')), { once: true })));
  const pending = f.service.playMusic(f.guild, f.userId, link); const rejected = expect(pending).rejects.toThrow(/cancelled/);
  await vi.waitFor(() => expect(resolveYouTubeSource).toHaveBeenCalledOnce());
  await f.service.updateConfig(f.guildId, { ...defaultVoiceConfig(), musicEnabled: false });
  await rejected; expect(f.connect).not.toHaveBeenCalled();
});
it('rechecks command authorization after metadata loading and cancels work during shutdown', async () => {
  const f = await fixture();
  vi.mocked(resolveYouTubeSource).mockImplementation(async () => { f.access.command.mockRejectedValueOnce(new Error('permission revoked')); return source; });
  await expect(f.service.playMusic(f.guild, f.userId, link)).rejects.toThrow('permission revoked'); expect(f.connect).not.toHaveBeenCalled();
  vi.mocked(resolveYouTubeSource).mockImplementation((_url, options) => new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new YouTubeSourceError('cancelled')), { once: true })));
  const pending = f.service.playMusic(f.guild, f.userId, link); const rejected = expect(pending).rejects.toThrow(/cancelled/);
  await vi.waitFor(() => expect(resolveYouTubeSource).toHaveBeenCalledTimes(2)); f.service.stop(); await rejected;
});
it('resolves signed media again on every playback and sends delivery through the protected downloader', async () => {
  vi.mocked(resolveYouTubeSource).mockResolvedValueOnce({ ...source, mediaUrl: `${source.mediaUrl}-first` }).mockResolvedValueOnce({ ...source, mediaUrl: `${source.mediaUrl}-fresh` });
  vi.mocked(openYouTubeAudioStream).mockRejectedValue(new Error('host refused'));
  await expect(loadMusicSource(link)).rejects.toThrow(/YouTube refused/);
  await expect(loadMusicSource(link)).rejects.toThrow(/YouTube refused/);
  expect(resolveYouTubeSource).toHaveBeenCalledTimes(2);
  expect(vi.mocked(openYouTubeAudioStream).mock.calls.map(([url]) => url)).toEqual([`${source.mediaUrl}-first`, `${source.mediaUrl}-fresh`]);
});
it('reports source failure privately and advances to the next queued track', async () => {
  const f = await fixture(); vi.mocked(resolveYouTubeSource).mockResolvedValue(source);
  f.output.play.mockRejectedValueOnce(new YouTubeSourceError('YouTube host refused this video.'));
  const notice = vi.fn(async () => {});
  await f.service.playMusic(f.guild, f.userId, link, notice); await f.service.sessions.flush();
  expect(notice).toHaveBeenCalledWith('YouTube host refused this video.', expect.any(AbortSignal));
  await f.service.playMusic(f.guild, f.userId, 'https://example.org/audio.mp3'); await f.service.sessions.flush();
  expect(f.output.play).toHaveBeenCalledTimes(2);
});
it('cancels a stalled private failure notification when the call stops', async () => {
  const output = { play: vi.fn(async () => { throw new Error('failed'); }), stop: vi.fn(), close: vi.fn() };
  const sessions = new VoiceSessions(async () => output); await sessions.join('guild', 'channel', 'music', defaultVoiceConfig());
  let noticeSignal: AbortSignal | undefined;
  sessions.enqueue('guild', 'channel', { kind: 'music', title: 'Source', url: link, onFailure: async (_error, signal) => { noticeSignal = signal; await new Promise(() => {}); } });
  await vi.waitFor(() => expect(noticeSignal).toBeDefined()); sessions.stopAll(); await sessions.flush();
  expect(noticeSignal?.aborted).toBe(true);
});
