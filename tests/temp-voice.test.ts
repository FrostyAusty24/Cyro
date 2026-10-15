import { afterEach, describe, expect, it, vi } from 'vitest';
import { Collection, ChannelType, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { TempVoiceService, roomOverwrites } from '../src/temp-voice/service.js';
import { TempVoiceStore } from '../src/temp-voice/store.js';
import { defaultTempVoiceConfig, parseTempVoiceConfig, roomName, type TempRoom } from '../src/temp-voice/types.js';
import { tempVoiceCommands } from '../src/temp-voice/commands.js';

const guildId = '111111111111111111', ownerId = '222222222222222222', otherId = '333333333333333333', botId = '444444444444444444', lobbyId = '555555555555555555', categoryId = '666666666666666666', channelId = '777777777777777777', roleId = '888888888888888888';
const P = PermissionFlagsBits;
const directories: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true }); });
const temporary = async () => { const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-temp-voice-')); directories.push(dir); return dir; };
const receipt = (): TempRoom => ({ id: 'a'.repeat(32), ownerId, channelId, categoryId, creationName: `cyro-room-${'a'.repeat(32)}`, name: 'Example room', createdAt: Date.now() - 30_000, state: 'active', locked: false, permissionsPending: false, allowed: [], blocked: [], connectBaseline: {} });
const overwrite = (id: string, type: 0 | 1, allow = 0n, deny = 0n) => ({ id, type, allow: new PermissionsBitField(allow), deny: new PermissionsBitField(deny) });

async function fixture(options: { ready?: boolean } = {}) {
  const dir = await temporary(), channels = new Collection<string, any>(), members = new Map<string, any>();
  const bot = { id: botId, user: { bot: true }, pending: false, permissions: { has: () => true } } as any;
  const guild = { id: guildId, available: true, channels: {}, members: {}, roles: { fetch: vi.fn() }, voiceStates: { cache: new Collection() } } as any;
  const member = (id: string, name: string, staff = false) => ({ id, guild, displayName: name, user: { bot: false }, pending: false, permissions: { has: (bit: bigint) => staff || bit !== P.ManageChannels }, voice: { channelId: lobbyId, setChannel: vi.fn(async (channel: any) => { const value = members.get(id); value.voice.channelId = channel.id; channel.members.set(id, value); }) } });
  const owner = member(ownerId, 'Example'), other = member(otherId, 'Other'); members.set(ownerId, owner); members.set(otherId, other); bot.guild = guild; members.set(botId, bot);
  const channel = (id: string, type: number, name = id) => {
    const value: any = { id, guild, type, name, parentId: type === ChannelType.GuildVoice ? categoryId : null, createdTimestamp: Date.now(), members: new Collection(), children: { cache: new Collection() }, userLimit: 0, permissionsFor: vi.fn(() => ({ has: () => true })), permissionOverwrites: { cache: new Collection([[guildId, overwrite(guildId, 0, P.ViewChannel | P.Connect)]]) } };
    value.permissionOverwrites.set = vi.fn(async (items: any[]) => { value.permissionOverwrites.cache = new Collection(items.map(item => [item.id, overwrite(item.id, item.type, item.allow, item.deny)])); });
    value.setName = vi.fn(async (name: string) => { value.name = name; return value; }); value.setUserLimit = vi.fn(async (limit: number) => { value.userLimit = limit; return value; }); value.delete = vi.fn(async () => { channels.delete(id); }); channels.set(id, value); return value;
  };
  const lobby = channel(lobbyId, ChannelType.GuildVoice), category = channel(categoryId, ChannelType.GuildCategory);
  guild.channels = { cache: channels, fetch: vi.fn(async (id?: string) => id ? channels.get(id) ?? null : channels), create: vi.fn(async (input: any) => {
    const room = channel(channelId, ChannelType.GuildVoice, input.name); room.parentId = input.parent; room.userLimit = input.userLimit;
    room.permissionOverwrites.cache = new Collection(input.permissionOverwrites.map((value: any) => [value.id, overwrite(value.id, value.type, value.allow, value.deny)])); return room;
  }) };
  guild.members = { fetchMe: vi.fn(async () => bot), fetch: vi.fn(async (input: any) => { const value = members.get(typeof input === 'string' ? input : input.user); if (!value) throw Object.assign(new Error('Unknown member'), { code: 10007 }); return value; }) };
  const client = { guilds: { cache: new Collection([[guildId, guild]]) }, user: { id: botId }, isReady: () => options.ready !== false, on: vi.fn(), off: vi.fn() } as any;
  const access = { member: vi.fn(async (target: any, id: string) => target.members.fetch({ user: id, force: true })), commandMember: vi.fn() } as any;
  const logger = { warn: vi.fn(), info: vi.fn() } as any;
  const service = new TempVoiceService(client, dir, logger, access); await service.init();
  await service.updateConfig(guild, { ...defaultTempVoiceConfig(), enabled: true, lobbyChannelId: lobbyId, categoryId });
  return { dir, guild, client, access, service, owner, other, bot, lobby, category, channel, channels, members };
}

describe('temporary voice configuration and storage', () => {
  it('starts disabled, validates bounded settings, and limits name substitutions', () => {
    expect(defaultTempVoiceConfig().enabled).toBe(false);
    expect(() => parseTempVoiceConfig({ ...defaultTempVoiceConfig(), enabled: true })).toThrow('lobby');
    expect(() => parseTempVoiceConfig({ ...defaultTempVoiceConfig(), maxRooms: 26 })).toThrow();
    expect(() => parseTempVoiceConfig({ ...defaultTempVoiceConfig(), unexpected: true })).toThrow();
    expect(roomName('{name} room', 'Example\n\u202e')).toBe('Example room');
    expect(roomName('{name} room', 'x'.repeat(200))).toHaveLength(96);
  });
  it('persists recovery receipts with guild isolation and guards purge', async () => {
    const dir = await temporary(), store = new TempVoiceStore(dir); await store.init();
    await store.mutate(guildId, value => { value.rooms.push(receipt()); });
    const restored = new TempVoiceStore(dir); await restored.init(); expect(restored.get(guildId).rooms).toHaveLength(1); expect(restored.get(otherId).rooms).toEqual([]);
    await restored.purgeGuild(guildId, () => false); expect(await restored.guildIds()).toEqual([guildId]); await restored.purgeGuild(guildId); expect(await restored.guildIds()).toEqual([]);
  });
  it('refuses corrupted room records instead of resetting server data', async () => {
    const dir = await temporary(); await writeFile(path.join(dir, 'temp-voice.json'), JSON.stringify({ version: 1, guilds: { [guildId]: { config: defaultTempVoiceConfig(), rooms: [{ ...receipt(), channelId: 'bad' }] } } }));
    await expect(new TempVoiceStore(dir).init()).rejects.toThrow('Invalid temporary voice');
  });
  it('registers only guild-install room commands with bounded options', () => { const command = tempVoiceCommands[0]!.toJSON(); expect(command.name).toBe('room'); expect(command.contexts).toEqual([0]); expect(command.integration_types).toEqual([0]); expect(command.options).toHaveLength(7); });
});

describe('temporary voice lifecycle', () => {
  it('serializes duplicate joins and inherits category visibility without granting owners management', async () => {
    const f = await fixture(); f.category.permissionOverwrites.cache.set(roleId, overwrite(roleId, 0, 0n, P.ViewChannel));
    await Promise.all([f.service.joinLobby(f.guild, ownerId), f.service.joinLobby(f.guild, ownerId)]);
    expect(f.guild.channels.create).toHaveBeenCalledTimes(1); expect(f.owner.voice.channelId).toBe(channelId);
    const input = f.guild.channels.create.mock.calls[0][0]; expect(input.permissionOverwrites.find((v: any) => v.id === roleId).deny).toBe(P.ViewChannel);
    expect(input.permissionOverwrites.find((v: any) => v.id === ownerId).allow).toBe(P.Connect);
    expect(f.service.snapshot(guildId).rooms).toHaveLength(1);
    f.owner.voice.channelId = lobbyId; await f.service.joinLobby(f.guild, ownerId); expect(f.guild.channels.create).toHaveBeenCalledTimes(1);
  });
  it('enforces capacity across competing owners and rejects foreign configuration', async () => {
    const f = await fixture(); await f.service.updateConfig(f.guild, { ...f.service.getConfig(guildId), maxRooms: 1 });
    const result = await Promise.allSettled([f.service.joinLobby(f.guild, ownerId), f.service.joinLobby(f.guild, otherId)]);
    expect(result.filter(item => item.status === 'fulfilled')).toHaveLength(1); expect(f.guild.channels.create).toHaveBeenCalledTimes(1);
    f.lobby.guild = { id: otherId }; await expect(f.service.updateConfig(f.guild, f.service.getConfig(guildId))).rejects.toThrow('this server');
  });
  it('rechecks dashboard authorization before persisting configuration', async () => {
    const f = await fixture(); await expect(f.service.updateConfig(f.guild, { ...f.service.getConfig(guildId), maxRooms: 3 }, async () => { throw new Error('Access revoked'); })).rejects.toThrow('Access revoked'); expect(f.service.getConfig(guildId).maxRooms).toBe(10);
  });
  it('does not create for screening members, bots, or members unable to enter the category', async () => {
    const f = await fixture(); f.owner.pending = true; await f.service.joinLobby(f.guild, ownerId); f.owner.pending = false; f.owner.user.bot = true; await f.service.joinLobby(f.guild, ownerId); f.owner.user.bot = false;
    f.category.permissionsFor.mockImplementation((member: any) => ({ has: () => member.id === botId })); await expect(f.service.joinLobby(f.guild, ownerId)).rejects.toThrow('member needs access'); expect(f.guild.channels.create).not.toHaveBeenCalled();
  });
  it('retains an uncertain creation slot and recovers exactly its nonce-named channel', async () => {
    const f = await fixture(), create = f.guild.channels.create.getMockImplementation();
    f.guild.channels.create.mockImplementation(async (input: any) => { await create(input); throw new Error('Network timeout after acceptance'); });
    await expect(f.service.joinLobby(f.guild, ownerId)).rejects.toThrow('timeout'); expect(f.service.snapshot(guildId).pending).toBe(1);
    const restored = new TempVoiceService(f.client, f.dir, { warn: vi.fn() } as any, f.access); await restored.init(); await restored.reconcile();
    expect(restored.snapshot(guildId).pending).toBe(0); expect(restored.snapshot(guildId).rooms[0]?.channelId).toBe(channelId); expect(f.owner.voice.channelId).toBe(channelId); expect(f.guild.channels.create).toHaveBeenCalledTimes(1);
  });
  it('never retries an ambiguous create when no matching channel is confirmed', async () => {
    const f = await fixture(); f.guild.channels.create.mockRejectedValue(new Error('Network timeout'));
    await expect(f.service.joinLobby(f.guild, ownerId)).rejects.toThrow('timeout'); await expect(f.service.joinLobby(f.guild, ownerId)).rejects.toThrow('previous room operation'); expect(f.guild.channels.create).toHaveBeenCalledTimes(1); expect(f.service.snapshot(guildId).pending).toBe(1);
  });
  it('cleans only saved empty rooms and leaves all unrelated channels alone', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const room = f.channels.get(channelId); room.members.clear(); f.owner.voice.channelId = null;
    const unknown = f.channel('999999999999999999', ChannelType.GuildVoice, 'Another empty room'); const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + 30_000);
    await f.service.reconcile(); expect(room.delete).toHaveBeenCalledOnce(); expect(unknown.delete).not.toHaveBeenCalled(); expect(f.service.snapshot(guildId).rooms).toEqual([]);
  });
  it('keeps occupied rooms across restart and handles manually deleted tracked channels', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const room = f.channels.get(channelId); await f.service.reconcile(); expect(room.delete).not.toHaveBeenCalled(); f.channels.delete(channelId); await f.service.reconcile(); expect(f.service.snapshot(guildId).rooms).toEqual([]);
  });
  it('drains an in-flight create after stop without moving members or starting another mutation', async () => {
    const f = await fixture(); let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); const create = f.guild.channels.create.getMockImplementation(); f.guild.channels.create.mockImplementation(async (input: any) => { await gate; return create(input); });
    const joining = f.service.joinLobby(f.guild, ownerId); await vi.waitFor(() => expect(f.guild.channels.create).toHaveBeenCalledOnce()); f.service.stop(); release(); await joining; await f.service.flush(); expect(f.service.snapshot(guildId).rooms).toHaveLength(1); expect(f.owner.voice.setChannel).not.toHaveBeenCalled();
  });
});

describe('temporary room controls', () => {
  it('locks every role/member Connect allow while preserving visibility and other permissions', () => {
    const room = { ...receipt(), locked: true, allowed: [otherId] };
    const current = [{ id: guildId, type: 0 as const, allow: P.ViewChannel | P.Connect, deny: 0n }, { id: roleId, type: 0 as const, allow: P.Connect | P.Speak, deny: 0n }, { id: '999999999999999999', type: 1 as const, allow: P.Connect, deny: P.ViewChannel }];
    const next = roomOverwrites(current, room, guildId, botId); for (const id of [guildId, roleId, '999999999999999999']) { const value = next.find(item => item.id === id)!; expect(value.allow & P.Connect).toBe(0n); expect(value.deny & P.Connect).toBe(P.Connect); }
    expect(next.find(item => item.id === roleId)?.allow & P.Speak).toBe(P.Speak); expect(next.find(item => item.id === '999999999999999999')?.deny & P.ViewChannel).toBe(P.ViewChannel);
    for (const id of [ownerId, botId, otherId]) expect(next.find(item => item.id === id)?.allow & P.Connect).toBe(P.Connect);
  });
  it('requires fresh command access and actual room ownership, even for someone sharing the room', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); f.other.voice.channelId = channelId;
    await expect(f.service.control(f.guild, otherId, 'lock')).rejects.toThrow('Only this room'); expect(f.access.commandMember).toHaveBeenCalled();
    f.access.commandMember.mockImplementation(() => { throw new Error('Command access revoked'); }); await expect(f.service.control(f.guild, ownerId, 'lock')).rejects.toThrow('revoked'); expect(f.channels.get(channelId).permissionOverwrites.set).not.toHaveBeenCalled();
  });
  it('locks, permits, blocks, unlocks and restores the pre-lock Connect bits', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const room = f.channels.get(channelId); room.permissionOverwrites.cache.set(roleId, overwrite(roleId, 0, P.Connect | P.Speak));
    await f.service.control(f.guild, ownerId, 'lock'); expect(room.permissionOverwrites.cache.get(roleId).deny.has(P.Connect)).toBe(true);
    await f.service.control(f.guild, ownerId, 'permit', otherId); expect(room.permissionOverwrites.cache.get(otherId).allow.has(P.Connect)).toBe(true);
    await f.service.control(f.guild, ownerId, 'revoke', otherId); expect(room.permissionOverwrites.cache.get(otherId).deny.has(P.Connect)).toBe(true);
    await f.service.control(f.guild, ownerId, 'unlock'); expect(room.permissionOverwrites.cache.get(roleId).allow.has(P.Connect)).toBe(true); expect(room.permissionOverwrites.cache.get(roleId).deny.has(P.Connect)).toBe(false); expect(room.permissionOverwrites.cache.get(otherId).deny.has(P.Connect)).toBe(true);
    await f.service.control(f.guild, ownerId, 'permit', otherId); expect(room.permissionOverwrites.cache.has(otherId)).toBe(false);
  });
  it('cannot permit members who lack category access or act after leaving the room', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); f.category.permissionsFor.mockImplementation((member: any) => ({ has: () => member.id !== otherId }));
    await expect(f.service.control(f.guild, ownerId, 'permit', otherId)).rejects.toThrow('already have access');
    let reads = 0; f.access.member.mockImplementation(async () => { if (++reads > 1) f.owner.voice.channelId = lobbyId; return f.owner; }); await expect(f.service.control(f.guild, ownerId, 'lock')).rejects.toThrow('access changed'); expect(f.channels.get(channelId).permissionOverwrites.set).not.toHaveBeenCalled();
  });
  it('rolls back permission intent when final command authority is revoked before Discord mutation', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); let checks = 0;
    f.access.commandMember.mockImplementation(() => { if (++checks === 3) throw new Error('Command access revoked'); });
    await expect(f.service.control(f.guild, ownerId, 'lock')).rejects.toThrow('revoked'); expect(f.service.snapshot(guildId).rooms[0]?.locked).toBe(false); await f.service.reconcile(); expect(f.channels.get(channelId).permissionOverwrites.set).not.toHaveBeenCalled();
  });
  it('bounds names and member limits, and never gives the owner a server management permission', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); await f.service.control(f.guild, ownerId, 'name', 'Gaming together'); await f.service.control(f.guild, ownerId, 'limit', 6); expect(f.channels.get(channelId).userLimit).toBe(6);
    await expect(f.service.control(f.guild, ownerId, 'limit', 100)).rejects.toThrow('0 and 99'); await expect(f.service.control(f.guild, ownerId, 'name', 'Another name')).rejects.toThrow('5 minutes');
    const persisted = JSON.parse(await readFile(path.join(f.dir, 'temp-voice.json'), 'utf8')); expect(persisted.guilds[guildId].rooms[0].name).toBe('Gaming together');
  });
  it('allows joined staff to unlock a room after its lock denies their Connect permission', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const room = f.channels.get(channelId);
    f.other.voice.channelId = channelId; f.other.permissions.has = () => true;
    await f.service.control(f.guild, otherId, 'lock');
    room.permissionsFor.mockImplementation((member: any) => ({ has: (bits: bigint | bigint[]) => member.id !== otherId || !(Array.isArray(bits) ? bits : [bits]).includes(P.Connect) }));
    await expect(f.service.control(f.guild, otherId, 'unlock')).resolves.toContain('unlocked');
    f.other.voice.channelId = lobbyId; await expect(f.service.control(f.guild, otherId, 'lock')).rejects.toThrow('Join your temporary');
  });
  it('defers room commands and responds with a readable embed without pinging the owner', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId);
    const interaction: any = { guild: f.guild, guildId, user: { id: ownerId }, commandName: 'room', isChatInputCommand: () => true, inCachedGuild: () => true, deferred: false,
      options: { getSubcommand: () => 'info' }, deferReply: vi.fn(async () => { interaction.deferred = true; }), editReply: vi.fn(async () => undefined) };
    expect(await f.service.handleInteraction(interaction)).toBe(true); expect(interaction.deferReply).toHaveBeenCalledOnce();
    expect(interaction.editReply.mock.calls[0][0]).toMatchObject({ embeds: [{ title: 'Your temporary room', description: expect.stringContaining('Room owner:') }], allowedMentions: { parse: [] } });
    expect(interaction.editReply.mock.calls[0][0].content).toBeUndefined();
  });
});
