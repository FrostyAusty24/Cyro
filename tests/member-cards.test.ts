import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultGuild } from '../src/community/types.js';
import { mergeConfig } from '../src/community/config.js';
import { CommunityStore } from '../src/community/store.js';
import { CommunityService } from '../src/community/service.js';
import * as cards from '../src/community/member-card.js';
import { Logger } from '../src/logger.js';

const directories: string[] = [];
const services: CommunityService[] = [];
const guildId = '111111111111111111', channelId = '222222222222222222', memberId = '333333333333333333';
const avatarUrl = `https://cdn.discordapp.com/avatars/${memberId}/${'a'.repeat(32)}.png?size=256`;
async function directory() { const path = await mkdtemp(join(tmpdir(), 'member-cards-')); directories.push(path); return path; }
afterEach(async () => {
  for (const service of services.splice(0)) { service.stop(); await service.flush(); }
  vi.restoreAllMocks();
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

async function setup() {
  const send = vi.fn(async (_message: unknown) => undefined);
  let permissions = new PermissionsBitField([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]);
  const channel = { guildId, isTextBased: () => true, isThread: () => false, permissionsFor: () => permissions, send };
  const guild = { id: guildId, name: 'The @everyone Server', memberCount: 42, members: { fetchMe: async () => ({ permissions: new PermissionsBitField() }) }, channels: { fetch: async () => channel } };
  const client = Object.assign(new EventEmitter(), { isReady: () => false, guilds: { fetch: async () => guild } });
  const logger = new Logger('error'); vi.spyOn(logger, 'error').mockImplementation(() => undefined);
  const service = new CommunityService(client as never, await directory(), logger); services.push(service); await service.init(); service.attach();
  const member = { id: memberId, guild, displayName: 'Example', displayAvatarURL: () => avatarUrl, user: { bot: false, username: 'example' }, roles: { add: vi.fn() } };
  return { service, client, member, send, channel, setPermissions: (value: PermissionsBitField) => { permissions = value; } };
}

describe('member card configuration', () => {
  it('preserves legacy text greetings and goodbye behavior across store reload', async () => {
    const path = await directory(), state = defaultGuild();
    const legacy = state.config.welcome as unknown as Record<string, unknown>;
    delete legacy.joinFormat; delete legacy.goodbyeFormat; delete legacy.card;
    legacy.goodbyeMessage = 'Bye {user}';
    await writeFile(join(path, 'community.json'), JSON.stringify({ version: 1, guilds: { [guildId]: state } }));
    const store = new CommunityStore(path); await store.init();
    expect(store.config(guildId).welcome).toMatchObject({ joinFormat: 'text', goodbyeFormat: 'text', goodbyeMessage: 'Bye {user}', card: { accentColor: '#63D7FF' } });
    expect(store.config('444444444444444444').welcome.goodbyeFormat).toBe('off');
    expect(JSON.parse(await readFile(join(path, 'community.json'), 'utf8')).guilds[guildId].config.welcome.card).toBeUndefined();
  });
  it('accepts separate display modes and validates heading, background and hex color', () => {
    const base = defaultGuild().config;
    const updated = mergeConfig(base, { welcome: { joinFormat: 'both', goodbyeFormat: 'card', card: { joinHeading: 'Hello {user}', accentColor: '#abcdef', background: 'aurora' } } });
    expect(updated.welcome.card.accentColor).toBe('#ABCDEF'); expect(updated.welcome.goodbyeFormat).toBe('card');
    for (const welcome of [{ joinFormat: 'off' }, { goodbyeFormat: 'unknown' }, { card: { background: 'http://localhost/' } }, { card: { accentColor: 'red' } }, { card: { leaveHeading: 'x\ny' } }, { card: { imageUrl: 'https://example.com' } }]) expect(() => mergeConfig(base, { welcome })).toThrow();
    expect(base.welcome.joinFormat).toBe('text');
  });
  it('requires Attach Files when enabling cards and leaves saved settings unchanged on failure', async () => {
    const fixture = await setup();
    fixture.setPermissions(new PermissionsBitField([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]));
    await expect(fixture.service.updateConfig(guildId, { welcome: { enabled: true, channelId, joinFormat: 'card' } })).rejects.toThrow('Attach Files');
    expect((await fixture.service.getConfig(guildId)).welcome.enabled).toBe(false);
    await expect(fixture.service.updateConfig(guildId, { welcome: { enabled: true, channelId, joinFormat: 'text' } })).resolves.toBeDefined();
  });
});

describe('local PNG rendering and avatar boundary', () => {
  it('renders a real bounded PNG with the bundled font and handles long member names', async () => {
    const fetcher = vi.fn();
    const image = await cards.renderMemberCard({ kind: 'join', displayName: 'Example '.repeat(40), serverName: '<script>@everyone</script>', memberCount: 42, settings: defaultGuild().config.welcome.card }, fetcher);
    expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(image.readUInt32BE(16)).toBe(960); expect(image.readUInt32BE(20)).toBe(340); expect(image.length).toBeLessThan(2 * 1024 * 1024);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects non-Discord or non-avatar URLs without issuing any request', async () => {
    const fetcher = vi.fn();
    for (const url of ['http://127.0.0.1/', 'https://cdn.discordapp.com.evil.test/embed/avatars/1.png', 'https://cdn.discordapp.com:444/embed/avatars/1.png', 'https://cdn.discordapp.com/attachments/1/2/a.png', 'https://user@cdn.discordapp.com/embed/avatars/1.png', 'https://cdn.discordapp.com/embed/avatars/1.svg', 'not a url']) expect(await cards.fetchDiscordAvatar(url, fetcher)).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('fetches PNG avatars with a deadline, a fixed size, and redirects disabled', async () => {
    const png = createCanvas(2, 2).toBuffer('image/png');
    const fetcher = vi.fn(async () => new Response(png, { headers: { 'content-type': 'image/png' } }));
    expect(await cards.fetchDiscordAvatar(avatarUrl.replace('256', '4096'), fetcher)).toEqual(png);
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.search).toBe('?size=256'); expect(init.redirect).toBe('error'); expect(init.signal).toBeInstanceOf(AbortSignal);
  });
  it('bounds response bytes and decoded dimensions before loading the native image decoder', async () => {
    const png = createCanvas(2, 2).toBuffer('image/png'); png.writeUInt32BE(4096, 16);
    expect(await cards.fetchDiscordAvatar(avatarUrl, vi.fn(async () => new Response(png, { headers: { 'content-type': 'image/png' } })))).toBeUndefined();
    expect(await cards.fetchDiscordAvatar(avatarUrl, vi.fn(async () => new Response(new Uint8Array(2 * 1024 * 1024 + 1), { headers: { 'content-type': 'image/png' } })))).toBeUndefined();
    expect(await cards.fetchDiscordAvatar(avatarUrl, vi.fn(async () => new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } })))).toBeUndefined();
  });
  it('uses initials when fetching the avatar fails', async () => {
    const image = await cards.renderMemberCard({ kind: 'leave', displayName: 'Example', serverName: 'Cyro', memberCount: 41, avatarUrl, settings: defaultGuild().config.welcome.card }, vi.fn(async () => { throw new Error('Network down'); }));
    expect(image.readUInt32BE(16)).toBe(960);
  });
});

describe('Discord greeting delivery', () => {
  it('sends an image-only join with safe attachment metadata and no text', async () => {
    const fixture = await setup(); const render = vi.spyOn(cards, 'renderMemberCard').mockResolvedValue(Buffer.from('png'));
    await fixture.service.updateConfig(guildId, { welcome: { enabled: true, channelId, joinFormat: 'card' } });
    fixture.client.emit('guildMemberAdd', fixture.member); await fixture.service.flush();
    expect(render).toHaveBeenCalledWith(expect.objectContaining({ kind: 'join', displayName: 'Example', avatarUrl }));
    const sent = fixture.send.mock.calls[0]![0] as any;
    expect(sent.content).toBeUndefined(); expect(sent.files[0].name).toBe('cyro-welcome.png');
    expect(sent.allowedMentions).toEqual({ parse: [], users: [memberId] });
  });
  it('supports leave-only cards without a goodbye message and sends both when selected', async () => {
    const fixture = await setup(); vi.spyOn(cards, 'renderMemberCard').mockResolvedValue(Buffer.from('png'));
    await fixture.service.updateConfig(guildId, { welcome: { enabled: true, channelId, goodbyeFormat: 'card' } });
    fixture.client.emit('guildMemberRemove', fixture.member); await fixture.service.flush();
    expect(fixture.send.mock.calls[0]![0]).toMatchObject({ files: [expect.objectContaining({ name: 'cyro-goodbye.png' })], allowedMentions: { parse: [], users: [] } });
    expect(fixture.send.mock.calls[0]![0]).not.toHaveProperty('content');
    await fixture.service.updateConfig(guildId, { welcome: { goodbyeFormat: 'both', goodbyeMessage: 'Goodbye {user} from {server}' } });
    fixture.client.emit('guildMemberRemove', fixture.member); await fixture.service.flush();
    expect(fixture.send.mock.calls[1]![0]).toMatchObject({ content: `Goodbye <@${memberId}> from The @everyone Server`, files: [expect.anything()], allowedMentions: { parse: [], users: [] } });
  });
  it('falls back before sending on renderer failure or revoked Attach Files permission', async () => {
    const fixture = await setup(); const render = vi.spyOn(cards, 'renderMemberCard').mockRejectedValue(new Error('Font missing'));
    await fixture.service.updateConfig(guildId, { welcome: { enabled: true, channelId, joinFormat: 'card' } });
    fixture.client.emit('guildMemberAdd', fixture.member); await fixture.service.flush();
    expect(fixture.send.mock.calls[0]![0]).toMatchObject({ content: expect.stringContaining(`<@${memberId}>`) });
    expect(fixture.send.mock.calls[0]![0]).not.toHaveProperty('files');
    fixture.setPermissions(new PermissionsBitField([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]));
    fixture.client.emit('guildMemberAdd', fixture.member); await fixture.service.flush();
    expect(fixture.send).toHaveBeenCalledTimes(2); expect(render).toHaveBeenCalledTimes(1);
  });
  it('never retries a potentially delivered card message after an uncertain send error', async () => {
    const fixture = await setup(); vi.spyOn(cards, 'renderMemberCard').mockResolvedValue(Buffer.from('png'));
    await fixture.service.updateConfig(guildId, { welcome: { enabled: true, channelId, joinFormat: 'card' } });
    fixture.send.mockRejectedValue(new Error('Request timed out after send'));
    fixture.client.emit('guildMemberAdd', fixture.member); await fixture.service.flush();
    expect(fixture.send).toHaveBeenCalledTimes(1);
  });
  it('does not send disabled goodbye announcements or announcements in a different guild channel', async () => {
    const fixture = await setup();
    await fixture.service.updateConfig(guildId, { welcome: { enabled: true, channelId } });
    fixture.client.emit('guildMemberRemove', fixture.member); await fixture.service.flush();
    fixture.channel.guildId = '444444444444444444';
    fixture.client.emit('guildMemberAdd', fixture.member); await fixture.service.flush();
    expect(fixture.send).not.toHaveBeenCalled();
  });
});

