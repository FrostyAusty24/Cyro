import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionRow, ButtonComponent, Collection, ChannelType, MessageFlags, MessageType, PermissionFlagsBits, PermissionsBitField, REST, Routes } from 'discord.js';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { TempVoiceService, roomOverwrites } from '../src/temp-voice/service.js';
import { TempVoiceStore } from '../src/temp-voice/store.js';
import { defaultTempVoiceConfig, parseTempVoiceConfig, roomName, type TempRoom } from '../src/temp-voice/types.js';
import { tempVoiceCommands } from '../src/temp-voice/commands.js';

const guildId = '111111111111111111', ownerId = '222222222222222222', otherId = '333333333333333333', botId = '444444444444444444', lobbyId = '555555555555555555', categoryId = '666666666666666666', channelId = '777777777777777777', roleId = '888888888888888888';
const P = PermissionFlagsBits;
let nextPickerId = 922222222222222222n;
const directories: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true }); });
const temporary = async () => { const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-temp-voice-')); directories.push(dir); return dir; };
const receipt = (): TempRoom => ({ id: 'a'.repeat(32), ownerId, channelId, categoryId, creationName: `cyro-room-${'a'.repeat(32)}`, name: 'Example room', createdAt: Date.now() - 30_000, state: 'active', locked: false, permissionsPending: false, allowed: [], blocked: [], connectBaseline: {} });
const overwrite = (id: string, type: 0 | 1, allow = 0n, deny = 0n) => ({ id, type, allow: new PermissionsBitField(allow), deny: new PermissionsBitField(deny) });

async function fixture(options: { ready?: boolean } = {}) {
  const dir = await temporary(), channels = new Collection<string, any>(), members = new Map<string, any>();
  let nextMessageId = 911111111111111111n;
  const bot = { id: botId, user: { bot: true }, pending: false, permissions: { has: () => true } } as any;
  const guild = { id: guildId, available: true, channels: {}, members: {}, roles: { fetch: vi.fn() }, voiceStates: { cache: new Collection() } } as any;
  const member = (id: string, name: string, staff = false) => ({ id, guild, displayName: name, user: { bot: false }, pending: false, permissions: { has: (bit: bigint) => staff || ![P.ManageChannels, P.Administrator].includes(bit) }, voice: { id, guild, channelId: lobbyId,
    setChannel: vi.fn(async (channel: any) => { const value = members.get(id); value.voice.channelId = channel.id; channel.members.set(id, value); }),
    disconnect: vi.fn(async () => { const value = members.get(id); channels.get(value.voice.channelId)?.members.delete(id); value.voice.channelId = null; }) } });
  const owner = member(ownerId, 'Example'), other = member(otherId, 'Other'); members.set(ownerId, owner); members.set(otherId, other); bot.guild = guild; members.set(botId, bot);
  const channel = (id: string, type: number, name = id) => {
    const value: any = { id, guild, type, name, parentId: type === ChannelType.GuildVoice ? categoryId : null, createdTimestamp: Date.now(), members: new Collection(), children: { cache: new Collection() }, userLimit: 0, permissionsFor: vi.fn(() => ({ has: () => true })), permissionOverwrites: { cache: new Collection([[guildId, overwrite(guildId, 0, P.ViewChannel | P.Connect)]]) } };
    value.permissionOverwrites.set = vi.fn(async (items: any[]) => { value.permissionOverwrites.cache = new Collection(items.map(item => [item.id, overwrite(item.id, item.type, item.allow, item.deny)])); });
    value.setName = vi.fn(async (name: string) => { value.name = name; return value; }); value.setUserLimit = vi.fn(async (limit: number) => { value.userLimit = limit; return value; }); value.delete = vi.fn(async () => { channels.delete(id); });
    const messages = new Collection<string, any>();
    value.messages = { cache: messages, fetch: vi.fn(async (input: any) => {
      if (input.limit) return new Collection([...messages.entries()].slice(-input.limit));
      const message = messages.get(typeof input === 'string' ? input : input.message);
      if (!message) throw Object.assign(new Error('Unknown Message'), { code: 10008 }); return message;
    }) };
    value.send = vi.fn(async (payload: any) => { const message: any = { id: String(nextMessageId++), author: { id: botId }, guildId, channelId: id, type: MessageType.Default, webhookId: null, embeds: payload.embeds, components: payload.components };
      message.edit = vi.fn(async (input: any) => { message.embeds = input.embeds; message.components = input.components; return message; }); messages.set(message.id, message); return message; });
    channels.set(id, value); return value;
  };
  const lobby = channel(lobbyId, ChannelType.GuildVoice), category = channel(categoryId, ChannelType.GuildCategory);
  guild.channels = { cache: channels, fetch: vi.fn(async (id?: string) => id ? channels.get(id) ?? null : channels), create: vi.fn(async (input: any) => {
    const room = channel(channelId, ChannelType.GuildVoice, input.name); room.parentId = input.parent; room.userLimit = input.userLimit;
    room.permissionOverwrites.cache = new Collection(input.permissionOverwrites.map((value: any) => [value.id, overwrite(value.id, value.type, value.allow, value.deny)])); return room;
  }) };
  guild.members = { fetchMe: vi.fn(async () => bot), fetch: vi.fn(async (input: any) => { const value = members.get(typeof input === 'string' ? input : input.user); if (!value) throw Object.assign(new Error('Unknown member'), { code: 10007 }); return value; }) };
  guild.voiceStates.fetch = vi.fn(async (id: string) => { const member = members.get(id); if (!member?.voice?.channelId) throw Object.assign(new Error('Unknown voice state'), { code: 10065 }); return member.voice; });
  const client = { token: 'unit-test-only-token', guilds: { cache: new Collection([[guildId, guild]]) }, user: { id: botId }, isReady: () => options.ready !== false, on: vi.fn(), off: vi.fn() } as any;
  const disconnectRequest = vi.spyOn(REST.prototype, 'patch').mockImplementation(async (route: any) => { const target = members.get(route.split('/').at(-1)); if (!target) throw new Error('Unknown target'); await target.voice.disconnect(); return {}; });
  const access = { member: vi.fn(async (target: any, id: string) => target.members.fetch({ user: id, force: true })), commandMember: vi.fn() } as any;
  const logger = { warn: vi.fn(), info: vi.fn() } as any;
  const service = new TempVoiceService(client, dir, logger, access); await service.init();
  await service.updateConfig(guild, { ...defaultTempVoiceConfig(), enabled: true, lobbyChannelId: lobbyId, categoryId });
  return { dir, guild, client, access, service, owner, other, bot, lobby, category, channel, channels, members, disconnectRequest };
}

function panelButton(f: Awaited<ReturnType<typeof fixture>>, code: 'l' | 'u' | 'n' | 'm' | 'a' | 'r', actorId = ownerId) {
  const channel = f.channels.get(channelId), message = channel.messages.cache.last();
  const customId = message.components.flatMap((row: any) => row.toJSON().components).find((button: any) => button.custom_id.endsWith(`:${code}`)).custom_id;
  const pickerMessage = { id: String(nextPickerId++), author: { id: botId }, guildId, channelId, webhookId: botId, type: MessageType.ChatInputCommand, flags: { has: (flag: bigint) => flag === MessageFlags.Ephemeral } };
  const interaction: any = { customId, guild: f.guild, guildId, channelId, user: { id: actorId }, member: f.members.get(actorId), message, deferred: false, replied: false,
    isChatInputCommand: () => false, isButton: () => true, isModalSubmit: () => false, isUserSelectMenu: () => false, inCachedGuild: () => true, pickerMessage,
    deferReply: vi.fn(async () => { interaction.deferred = true; }), editReply: vi.fn(async () => pickerMessage),
    reply: vi.fn(async () => { interaction.replied = true; }), showModal: vi.fn(async () => { interaction.replied = true; }) };
  return interaction;
}
function pickerSubmission(button: any, targetId = otherId) {
  const interaction: any = { ...button, customId: button.editReply.mock.calls[0][0].components[0].toJSON().components[0].custom_id, message: button.pickerMessage, values: [targetId], deferred: false, replied: false,
    isButton: () => false, isModalSubmit: () => false, isUserSelectMenu: () => true,
    deferUpdate: vi.fn(async () => { interaction.deferred = true; }), editReply: vi.fn(async () => undefined), reply: vi.fn(async () => { interaction.replied = true; }) };
  return interaction;
}
function modalSubmission(button: any, value: string) {
  const interaction: any = { ...button, customId: button.showModal.mock.calls[0][0].toJSON().custom_id, deferred: false, replied: false,
    isButton: () => false, isModalSubmit: () => true, isFromMessage: () => true, fields: { getTextInputValue: () => value },
    deferReply: vi.fn(async () => { interaction.deferred = true; }), editReply: vi.fn(async () => undefined), reply: vi.fn(async () => { interaction.replied = true; }), showModal: vi.fn() };
  return interaction;
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

describe('temporary voice room panels', () => {
  it('posts one durable four-button panel after moving the member, including concurrent reconciliation and restart', async () => {
    const f = await fixture(); await Promise.all([f.service.joinLobby(f.guild, ownerId), f.service.joinLobby(f.guild, ownerId)]);
    const channel = f.channels.get(channelId), payload = channel.send.mock.calls[0][0];
    expect(channel.send).toHaveBeenCalledOnce(); expect(f.owner.voice.setChannel.mock.invocationCallOrder[0]).toBeLessThan(channel.send.mock.invocationCallOrder[0]);
    expect(payload.allowedMentions).toEqual({ parse: [] }); expect(payload.embeds[0].color).toBe(0x85cae5);
    expect(payload.components[0].toJSON().components.map((button: any) => button.label)).toEqual(['Lock', 'Unlock', 'Rename', 'Member limit']);
    const data = JSON.parse(await readFile(path.join(f.dir, 'temp-voice.json'), 'utf8'));
    expect(data.guilds[guildId].rooms[0].panel.messageId).toBe(channel.messages.cache.first().id);
    const restored = new TempVoiceService(f.client, f.dir, { warn: vi.fn() } as any, f.access); await restored.init();
    await Promise.all([restored.reconcile(), restored.reconcile()]); expect(channel.send).toHaveBeenCalledOnce(); expect(restored.snapshot(guildId).warnings).toEqual([]);
  });
  it('adds a panel to occupied legacy room records without altering their settings or ownership', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); await f.service.control(f.guild, ownerId, 'lock');
    const filename = path.join(f.dir, 'temp-voice.json'), data = JSON.parse(await readFile(filename, 'utf8')); delete data.guilds[guildId].rooms[0].panel;
    f.channels.get(channelId).messages.cache.clear(); await writeFile(filename, JSON.stringify(data));
    const restored = new TempVoiceService(f.client, f.dir, { warn: vi.fn() } as any, f.access); await restored.init(); await restored.reconcile();
    expect(f.channels.get(channelId).messages.cache.size).toBe(1); expect(restored.snapshot(guildId).rooms[0]).toMatchObject({ ownerId, locked: true });
  });
  it('recovers an accepted send with a lost response by its bot-owned footer, without nonce or reposting', async () => {
    const f = await fixture(), create = f.guild.channels.create.getMockImplementation();
    f.guild.channels.create.mockImplementation(async (input: any) => { const room = await create(input), send = room.send.getMockImplementation(); room.send.mockImplementation(async (payload: any) => { await send(payload); throw new Error('Network timeout after acceptance'); }); return room; });
    await f.service.joinLobby(f.guild, ownerId); expect(f.owner.voice.channelId).toBe(channelId); expect(f.service.snapshot(guildId).warnings.join(' ')).toContain('unconfirmed');
    const restored = new TempVoiceService(f.client, f.dir, { warn: vi.fn() } as any, f.access); await restored.init(); await restored.reconcile();
    const room = f.channels.get(channelId); expect(room.send).toHaveBeenCalledOnce(); expect(restored.snapshot(guildId).warnings).toEqual([]);
    const button = panelButton(f, 'l'); await restored.handleInteraction(button); expect(button.editReply.mock.calls[0][0].embeds[0].description).toContain('locked');
  });
  it('never retries an unknown send or trusts a matching footer on a webhook, foreign author or foreign channel', async () => {
    const f = await fixture(), create = f.guild.channels.create.getMockImplementation();
    f.guild.channels.create.mockImplementation(async (input: any) => { const room = await create(input); room.send.mockRejectedValue(new Error('Network timeout')); return room; });
    await f.service.joinLobby(f.guild, ownerId); const room = f.channels.get(channelId), payload = room.send.mock.calls[0][0];
    const base = { author: { id: botId }, guildId, channelId, type: MessageType.Default, embeds: payload.embeds };
    room.messages.cache.set('900000000000000001', { ...base, id: '900000000000000001', webhookId: otherId });
    room.messages.cache.set('900000000000000002', { ...base, id: '900000000000000002', author: { id: otherId } });
    room.messages.cache.set('900000000000000003', { ...base, id: '900000000000000003', channelId: lobbyId });
    const restored = new TempVoiceService(f.client, f.dir, { warn: vi.fn() } as any, f.access); await restored.init(); await restored.reconcile();
    const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + 61_000); await restored.reconcile();
    expect(room.send).toHaveBeenCalledOnce(); expect(restored.snapshot(guildId).warnings.join(' ')).toContain('not post a duplicate');
  });
  it('does not prevent movement or cleanup when panel permissions are missing, and clears its warning when restored', async () => {
    const f = await fixture(), create = f.guild.channels.create.getMockImplementation();
    f.guild.channels.create.mockImplementation(async (input: any) => { const room = await create(input); room.permissionsFor.mockImplementation(() => ({ has: (bits: bigint | bigint[]) => !(Array.isArray(bits) ? bits : [bits]).includes(P.SendMessages) })); return room; });
    await f.service.joinLobby(f.guild, ownerId); const room = f.channels.get(channelId);
    expect(f.owner.voice.channelId).toBe(channelId); expect(room.send).not.toHaveBeenCalled(); expect(f.service.snapshot(guildId).warnings.join(' ')).toContain('Send Messages');
    const reads = f.guild.members.fetchMe.mock.calls.length; await f.service.reconcile(); expect(f.guild.members.fetchMe).toHaveBeenCalledTimes(reads);
    room.permissionsFor.mockImplementation(() => ({ has: () => true })); const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + 61_000);
    await f.service.reconcile(); expect(room.send).toHaveBeenCalledOnce(); expect(f.service.snapshot(guildId).warnings).toEqual([]);
    room.members.clear(); f.owner.voice.channelId = null; await f.service.reconcile(); expect(room.delete).toHaveBeenCalledOnce();
  });
  it('does not send before its intent is durably saved, while allowing the owner to enter', async () => {
    const f = await fixture(), store = (f.service as any).store, mutate = store.mutate.bind(store); let calls = 0;
    vi.spyOn(store, 'mutate').mockImplementation((...args: any[]) => ++calls === 3 ? Promise.reject(new Error('Disk full')) : mutate(...args));
    await f.service.joinLobby(f.guild, ownerId); expect(f.owner.voice.channelId).toBe(channelId); expect(f.channels.get(channelId).send).not.toHaveBeenCalled();
    const data = JSON.parse(await readFile(path.join(f.dir, 'temp-voice.json'), 'utf8')); expect(data.guilds[guildId].rooms[0].panel).toBeUndefined();
  });
  it('recovers a panel if saving its message ID fails after Discord accepts it', async () => {
    const f = await fixture(), store = (f.service as any).store, mutate = store.mutate.bind(store); let calls = 0;
    vi.spyOn(store, 'mutate').mockImplementation((...args: any[]) => ++calls === 4 ? Promise.reject(new Error('Disk full')) : mutate(...args));
    await f.service.joinLobby(f.guild, ownerId); const room = f.channels.get(channelId); expect(room.send).toHaveBeenCalledOnce();
    const data = JSON.parse(await readFile(path.join(f.dir, 'temp-voice.json'), 'utf8')); expect(data.guilds[guildId].rooms[0].panel.messageId).toBeNull();
    const restored = new TempVoiceService(f.client, f.dir, { warn: vi.fn() } as any, f.access); await restored.init(); await restored.reconcile();
    expect(room.send).toHaveBeenCalledOnce(); expect(restored.snapshot(guildId).warnings).toEqual([]);
  });
  it('replaces a confirmed deleted panel once and refuses its stale controls', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const old = panelButton(f, 'l'), room = f.channels.get(channelId); room.messages.cache.clear();
    const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + 61_000); await f.service.reconcile();
    expect(room.send).toHaveBeenCalledTimes(2); expect(room.messages.cache.size).toBe(1);
    await f.service.handleInteraction(old); expect(old.reply.mock.calls[0][0].content).toContain('no longer active'); expect(room.permissionOverwrites.set).not.toHaveBeenCalled();
  });
  it('locks and unlocks using panel buttons with fresh command authorization', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId);
    const lock = panelButton(f, 'l'); await f.service.handleInteraction(lock); expect(lock.deferReply).toHaveBeenCalledOnce(); expect(f.service.snapshot(guildId).rooms[0]?.locked).toBe(true);
    const unlock = panelButton(f, 'u'); await f.service.handleInteraction(unlock); expect(f.service.snapshot(guildId).rooms[0]?.locked).toBe(false); expect(f.access.member).toHaveBeenCalled();
    expect(unlock.editReply.mock.calls[0][0]).toMatchObject({ embeds: [{ description: expect.stringContaining('unlocked') }], allowedMentions: { parse: [] } });
  });
  it('opens bounded rename and limit modals immediately without fetching or deferring, then applies submissions', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const reads = f.guild.members.fetch.mock.calls.length, name = panelButton(f, 'n');
    await f.service.handleInteraction(name); expect(name.deferReply).not.toHaveBeenCalled(); expect(name.showModal).toHaveBeenCalledOnce(); expect(f.guild.members.fetch).toHaveBeenCalledTimes(reads);
    const definition = name.showModal.mock.calls[0][0].toJSON(); expect(definition.custom_id.length).toBeLessThanOrEqual(100); expect(definition.components[0].components[0]).toMatchObject({ min_length: 1, max_length: 80 });
    const rename = modalSubmission(name, 'A shared space'); await f.service.handleInteraction(rename); expect(f.channels.get(channelId).name).toBe('A shared space');
    const limit = panelButton(f, 'm'); await f.service.handleInteraction(limit); expect(limit.deferReply).not.toHaveBeenCalled();
    const change = modalSubmission(limit, '6'); await f.service.handleInteraction(change); expect(f.channels.get(channelId).userLimit).toBe(6);
    const unlimited = modalSubmission(limit, '0'); await f.service.handleInteraction(unlimited); expect(f.channels.get(channelId).userLimit).toBe(0);
  });
  it.each(['-1', '100', '2.5', 'abc', '', '1e1', 'Infinity'])('rejects invalid member limit %j without a channel mutation', async value => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const button = panelButton(f, 'm'); await f.service.handleInteraction(button);
    const submit = modalSubmission(button, value); await f.service.handleInteraction(submit); expect(submit.reply.mock.calls[0][0].content).toContain('whole number'); expect(f.channels.get(channelId).setUserLimit).not.toHaveBeenCalled();
  });
  it.each(['', 'x'.repeat(81)])('rejects an out-of-bounds room name', async value => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const button = panelButton(f, 'n'); await f.service.handleInteraction(button);
    const submit = modalSubmission(button, value); await f.service.handleInteraction(submit); expect(submit.editReply.mock.calls[0][0].content).toContain('1 and 80'); expect(f.channels.get(channelId).setName).toHaveBeenCalledTimes(1);
  });
  it('refuses non-owners and disconnected users before opening a modal', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); f.other.voice.channelId = channelId;
    const other = panelButton(f, 'n', otherId); await f.service.handleInteraction(other); expect(other.showModal).not.toHaveBeenCalled(); expect(other.reply.mock.calls[0][0].content).toContain('Only this room');
    f.owner.voice.channelId = lobbyId; const left = panelButton(f, 'm'); await f.service.handleInteraction(left); expect(left.showModal).not.toHaveBeenCalled(); expect(left.reply.mock.calls[0][0].content).toContain('Join the room');
  });
  it('rechecks command access and membership on submit after a form was opened', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const button = panelButton(f, 'm'); await f.service.handleInteraction(button);
    f.access.commandMember.mockImplementation(() => { throw new Error('Command access revoked'); });
    const denied = modalSubmission(button, '3'); await f.service.handleInteraction(denied); expect(denied.editReply.mock.calls[0][0].content).toContain('revoked'); expect(f.channels.get(channelId).setUserLimit).not.toHaveBeenCalled();
    f.access.commandMember.mockReset(); f.owner.voice.channelId = lobbyId;
    const left = modalSubmission(button, '3'); await f.service.handleInteraction(left); expect(left.editReply.mock.calls[0][0].content).toContain('Join your temporary'); expect(f.channels.get(channelId).setUserLimit).not.toHaveBeenCalled();
  });
  it('never changes a different current room using an old room panel or modal', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const button = panelButton(f, 'm'); await f.service.handleInteraction(button);
    const secondId = '777777777777777778', second = f.channel(secondId, ChannelType.GuildVoice); f.owner.permissions.has = () => true; f.owner.voice.channelId = secondId;
    await (f.service as any).store.mutate(guildId, (state: any) => { state.rooms.push({ ...receipt(), id: 'b'.repeat(32), creationName: `cyro-room-${'b'.repeat(32)}`, ownerId: otherId, channelId: secondId }); });
    const submit = modalSubmission(button, '3'); await f.service.handleInteraction(submit); expect(submit.editReply.mock.calls[0][0].content).toContain('this control panel belongs');
    const lock = panelButton(f, 'l'); await f.service.handleInteraction(lock); expect(lock.editReply.mock.calls[0][0].content).toContain('this control panel belongs'); expect(second.setUserLimit).not.toHaveBeenCalled(); expect(second.permissionOverwrites.set).not.toHaveBeenCalled();
  });
  it('rejects cross-guild, wrong-channel and substituted-message panels', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId);
    const foreign = panelButton(f, 'l'); foreign.customId = foreign.customId.replace(guildId, otherId); await f.service.handleInteraction(foreign); expect(foreign.reply.mock.calls[0][0].content).toContain('no longer active');
    const moved = panelButton(f, 'l'); moved.channelId = lobbyId; await f.service.handleInteraction(moved); expect(moved.reply.mock.calls[0][0].content).toContain('original Cyro');
    const forged = panelButton(f, 'l'); forged.message = { ...forged.message, author: { id: otherId } }; await f.service.handleInteraction(forged); expect(forged.reply.mock.calls[0][0].content).toContain('original Cyro');
    expect(f.channels.get(channelId).permissionOverwrites.set).not.toHaveBeenCalled();
  });
  it('checks ownerControls on opening and submission while allowing joined staff', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const opened = panelButton(f, 'm'); await f.service.handleInteraction(opened);
    await f.service.updateConfig(f.guild, { ...f.service.getConfig(guildId), ownerControls: false });
    const denied = modalSubmission(opened, '3'); await f.service.handleInteraction(denied); expect(denied.editReply.mock.calls[0][0].content).toContain('disabled');
    const blocked = panelButton(f, 'n'); await f.service.handleInteraction(blocked); expect(blocked.showModal).not.toHaveBeenCalled(); expect(blocked.reply.mock.calls[0][0].content).toContain('disabled');
    f.other.voice.channelId = channelId; f.other.permissions.has = () => true; const staff = panelButton(f, 'm', otherId); await f.service.handleInteraction(staff);
    const accepted = modalSubmission(staff, '4'); await f.service.handleInteraction(accepted); expect(f.channels.get(channelId).userLimit).toBe(4);
  });
  it('rechecks joined presence immediately before a panel mutation', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); let reads = 0;
    f.access.member.mockImplementation(async () => { if (++reads > 1) f.owner.voice.channelId = lobbyId; return f.owner; });
    const lock = panelButton(f, 'l'); await f.service.handleInteraction(lock); expect(lock.editReply.mock.calls[0][0].content).toContain('access changed'); expect(f.channels.get(channelId).permissionOverwrites.set).not.toHaveBeenCalled();
  });
});

describe('room member picker controls', () => {
  it('upgrades an occupied 2.20 panel in place with two new buttons and preserves its receipt', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const room = f.channels.get(channelId), panel = room.messages.cache.first(), id = panel.id;
    panel.components = [new ActionRow<ButtonComponent>(panel.components[0].toJSON())]; panel.embeds[0].description = 'Old four-button panel';
    const restored = new TempVoiceService(f.client, f.dir, { warn: vi.fn() } as any, f.access); await restored.init(); await restored.reconcile();
    expect(panel.edit).toHaveBeenCalledOnce(); expect(panel.id).toBe(id); expect(room.send).toHaveBeenCalledOnce();
    expect(panel.components[1].toJSON().components.map((button: any) => button.label)).toEqual(['Remove member', 'Allow member']);
    const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + 61_000); await restored.reconcile(); expect(panel.edit).toHaveBeenCalledOnce();
  });
  it('reconciles an uncertain panel edit without posting or editing the accepted upgrade again', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const room = f.channels.get(channelId), panel = room.messages.cache.first(), edit = panel.edit.getMockImplementation(); panel.components = [panel.components[0]];
    panel.edit.mockImplementation(async (payload: any) => { await edit(payload); throw new Error('Connection reset after edit'); });
    const restored = new TempVoiceService(f.client, f.dir, { warn: vi.fn() } as any, f.access); await restored.init(); await restored.reconcile(); expect(restored.snapshot(guildId).warnings).toHaveLength(1);
    const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + 61_000); await restored.reconcile(); expect(panel.edit).toHaveBeenCalledOnce(); expect(room.send).toHaveBeenCalledOnce(); expect(restored.snapshot(guildId).warnings).toEqual([]);
  });
  it('offers a private searchable single-user picker only after checking fresh room authority', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const button = panelButton(f, 'r'); await f.service.handleInteraction(button);
    expect(button.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral }); expect(f.access.member).toHaveBeenCalled();
    const payload = button.editReply.mock.calls[0][0]; expect(payload.embeds[0].description).toContain('does not kick or ban'); expect(payload.embeds[0].description).toContain('2 minutes');
    expect(payload.components[0].toJSON().components[0]).toMatchObject({ type: 5, min_values: 1, max_values: 1 }); expect(payload.components[0].toJSON().components[0].custom_id.length).toBeLessThanOrEqual(100);
    f.other.voice.channelId = channelId; const outsider = panelButton(f, 'a', otherId); await f.service.handleInteraction(outsider); expect(outsider.editReply.mock.calls[0][0].content).toContain('Only this room');
  });
  it('allows one eligible member into a locked room without moving them or broadening visibility', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); await f.service.control(f.guild, ownerId, 'lock');
    const room = f.channels.get(channelId), before = room.permissionOverwrites.cache.get(guildId).allow.bitfield;
    const button = panelButton(f, 'a'); await f.service.handleInteraction(button); const selection = pickerSubmission(button); await f.service.handleInteraction(selection);
    expect(room.permissionOverwrites.cache.get(otherId).allow.has(P.Connect)).toBe(true); expect(room.permissionOverwrites.cache.get(guildId).allow.bitfield).toBe(before);
    expect(f.other.voice.channelId).toBe(lobbyId); expect(f.other.voice.setChannel).not.toHaveBeenCalled(); expect(selection.editReply.mock.calls[0][0]).toMatchObject({ components: [], embeds: [{ description: expect.stringContaining('permitted') }] });
    const updates = room.permissionOverwrites.set.mock.calls.length; const replay = pickerSubmission(button); await f.service.handleInteraction(replay); expect(replay.reply.mock.calls[0][0].content).toContain('already used'); expect(room.permissionOverwrites.set).toHaveBeenCalledTimes(updates);
  });
  it('disconnects a current room member exactly once without a ban or permission change', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); f.other.voice.channelId = channelId; f.channels.get(channelId).members.set(otherId, f.other);
    const button = panelButton(f, 'r'); await f.service.handleInteraction(button); const selection = pickerSubmission(button); await f.service.handleInteraction(selection);
    expect(f.guild.voiceStates.fetch).toHaveBeenCalledWith(otherId, { force: true }); expect(f.other.voice.disconnect).toHaveBeenCalledOnce(); expect(f.other.voice.channelId).toBeNull();
    expect(f.disconnectRequest).toHaveBeenCalledWith(Routes.guildMember(guildId, otherId), expect.objectContaining({ body: { channel_id: null }, signal: expect.any(AbortSignal) }));
    const rest = f.disconnectRequest.mock.contexts[0] as REST; expect(rest.options.retries).toBe(0); expect(typeof rest.options.rejectOnRateLimit).toBe('function'); expect((rest.options.rejectOnRateLimit as Function)({})).toBe(true);
    expect(f.channels.get(channelId).permissionOverwrites.set).not.toHaveBeenCalled(); expect(selection.editReply.mock.calls[0][0].embeds[0].description).toContain('can rejoin');
    const replay = pickerSubmission(button); await f.service.handleInteraction(replay); expect(replay.reply.mock.calls[0][0].content).toContain('already used'); expect(f.other.voice.disconnect).toHaveBeenCalledOnce();
    const saved = JSON.parse(await readFile(path.join(f.dir, 'temp-voice.json'), 'utf8')); expect(saved.guilds[guildId].rooms[0].blocked).toEqual([]);
  });
  it.each(['actor', 'guild', 'channel', 'message', 'author', 'public'])('rejects a picker with the wrong %s binding without consuming its rightful owner’s choice', async which => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const button = panelButton(f, 'a'); await f.service.handleInteraction(button); const invalid = pickerSubmission(button);
    if (which === 'actor') invalid.user = { id: otherId }; if (which === 'guild') invalid.guildId = otherId; if (which === 'channel') invalid.channelId = lobbyId;
    if (which === 'message') invalid.message = { ...invalid.message, id: '999999999999999999' }; if (which === 'author') invalid.message = { ...invalid.message, author: { id: otherId } }; if (which === 'public') invalid.message = { ...invalid.message, flags: { has: () => false } };
    await f.service.handleInteraction(invalid); expect(invalid.reply.mock.calls[0][0].content).toContain('another person or room'); expect(f.channels.get(channelId).permissionOverwrites.set).not.toHaveBeenCalled();
    const valid = pickerSubmission(button); await f.service.handleInteraction(valid); expect(valid.editReply.mock.calls[0][0].embeds[0].description).toContain('permitted');
  });
  it('rejects a picker after its original panel was replaced', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const button = panelButton(f, 'a'); await f.service.handleInteraction(button);
    f.channels.get(channelId).messages.cache.clear(); const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + 61_000); await f.service.reconcile();
    const submit = pickerSubmission(button); await f.service.handleInteraction(submit); expect(submit.reply.mock.calls[0][0].content).toContain('no longer active'); expect(f.channels.get(channelId).permissionOverwrites.set).not.toHaveBeenCalled();
  });
  it('rejects expired, previously replaced and pre-restart member pickers', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); const old = panelButton(f, 'a'); await f.service.handleInteraction(old); const fresh = panelButton(f, 'a'); await f.service.handleInteraction(fresh);
    const replaced = pickerSubmission(old); await f.service.handleInteraction(replaced); expect(replaced.reply.mock.calls[0][0].content).toContain('expired');
    const restored = new TempVoiceService(f.client, f.dir, { warn: vi.fn() } as any, f.access); await restored.init(); const restarted = pickerSubmission(fresh); await restored.handleInteraction(restarted); expect(restarted.reply.mock.calls[0][0].content).toContain('expired');
    const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + 120_001); const expired = pickerSubmission(fresh); await f.service.handleInteraction(expired); expect(expired.reply.mock.calls[0][0].content).toContain('expired');
    expect(f.channels.get(channelId).permissionOverwrites.set).not.toHaveBeenCalled();
  });
  it('honors picker expiry even while an action is waiting on authorization', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); f.other.voice.channelId = channelId; const button = panelButton(f, 'r'); await f.service.handleInteraction(button);
    const now = Date.now(), member = f.access.member.getMockImplementation(); f.access.member.mockImplementation(async (...args: any[]) => { vi.spyOn(Date, 'now').mockReturnValue(now + 120_001); return member(...args); });
    const selection = pickerSubmission(button); await f.service.handleInteraction(selection); expect(selection.editReply.mock.calls[0][0].content).toContain('expired'); expect(f.other.voice.disconnect).not.toHaveBeenCalled();
  });
  it('refuses a target in another channel or one who moves during the final voice-state refresh', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); let button = panelButton(f, 'r'); await f.service.handleInteraction(button);
    let selection = pickerSubmission(button); await f.service.handleInteraction(selection); expect(selection.editReply.mock.calls[0][0].content).toContain('no longer in this room');
    f.other.voice.channelId = channelId; button = panelButton(f, 'r'); await f.service.handleInteraction(button);
    f.guild.voiceStates.fetch.mockImplementation(async () => { f.other.voice.channelId = lobbyId; return f.other.voice; });
    selection = pickerSubmission(button); await f.service.handleInteraction(selection); expect(selection.editReply.mock.calls[0][0].content).toContain('no longer in this room'); expect(f.other.voice.disconnect).not.toHaveBeenCalled();
  });
  it('refuses an owner who leaves or loses command access while the target voice-state refresh is running', async () => {
    for (const loss of ['leave', 'command']) {
      const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); f.other.voice.channelId = channelId; const button = panelButton(f, 'r'); await f.service.handleInteraction(button);
      f.guild.voiceStates.fetch.mockImplementation(async () => { if (loss === 'leave') f.owner.voice.channelId = lobbyId; else f.access.commandMember.mockImplementation(() => { throw new Error('Command access revoked'); }); return f.other.voice; });
      const selection = pickerSubmission(button); await f.service.handleInteraction(selection); expect(selection.editReply.mock.calls[0][0].content).toMatch(/access changed|revoked/); expect(f.other.voice.disconnect).not.toHaveBeenCalled();
    }
  });
  it('refuses removals after owner controls are disabled or the owner switches to another room', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); f.other.voice.channelId = channelId; const button = panelButton(f, 'r'); await f.service.handleInteraction(button);
    await f.service.updateConfig(f.guild, { ...f.service.getConfig(guildId), ownerControls: false }); const disabled = pickerSubmission(button); await f.service.handleInteraction(disabled); expect(disabled.editReply.mock.calls[0][0].content).toContain('disabled'); expect(f.other.voice.disconnect).not.toHaveBeenCalled();
  });
  it.each(['pending', 'bot', 'owner', 'self', 'missing'])('refuses an ineligible %s target', async kind => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); f.other.voice.channelId = channelId;
    const actor = kind === 'owner' ? otherId : ownerId; if (kind === 'owner') f.other.permissions.has = () => true;
    const button = panelButton(f, 'r', actor); await f.service.handleInteraction(button);
    let target = otherId; if (kind === 'pending') f.other.pending = true; if (kind === 'bot') f.other.user.bot = true; if (kind === 'owner' || kind === 'self') target = ownerId; if (kind === 'missing') f.members.delete(otherId);
    const selection = pickerSubmission(button, target); await f.service.handleInteraction(selection); expect(selection.editReply.mock.calls[0][0].content).toBeTruthy(); expect(f.other.voice.disconnect).not.toHaveBeenCalled(); expect(f.owner.voice.disconnect).not.toHaveBeenCalled();
  });
  it.each(['guild-owner', 'admin', 'manage-channels'])('protects a %s target from an ordinary room owner', async kind => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); f.other.voice.channelId = channelId;
    if (kind === 'guild-owner') f.guild.ownerId = otherId; else f.other.permissions.has = (bit: bigint) => bit === (kind === 'admin' ? P.Administrator : P.ManageChannels);
    const button = panelButton(f, 'r'); await f.service.handleInteraction(button); const selection = pickerSubmission(button); await f.service.handleInteraction(selection);
    expect(selection.editReply.mock.calls[0][0].content).toMatch(/server owner|server staff/); expect(f.other.voice.disconnect).not.toHaveBeenCalled();
  });
  it('requires a staff actor’s own Move Members permission for staff targets and always protects the server owner', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); f.other.voice.channelId = channelId; f.owner.permissions.has = () => true; f.other.permissions.has = () => true;
    const room = f.channels.get(channelId); room.permissionsFor.mockImplementation((member: any) => ({ has: (bits: bigint | bigint[]) => member.id !== ownerId || !(Array.isArray(bits) ? bits : [bits]).includes(P.MoveMembers) }));
    let button = panelButton(f, 'r'); await f.service.handleInteraction(button); let selection = pickerSubmission(button); await f.service.handleInteraction(selection); expect(selection.editReply.mock.calls[0][0].content).toContain('own Move Members'); expect(f.other.voice.disconnect).not.toHaveBeenCalled();
    room.permissionsFor.mockImplementation(() => ({ has: () => true })); f.guild.ownerId = otherId;
    button = panelButton(f, 'r'); await f.service.handleInteraction(button); selection = pickerSubmission(button); await f.service.handleInteraction(selection); expect(selection.editReply.mock.calls[0][0].content).toContain('server owner'); expect(f.other.voice.disconnect).not.toHaveBeenCalled();
    f.guild.ownerId = '999999999999999999'; button = panelButton(f, 'r'); await f.service.handleInteraction(button); selection = pickerSubmission(button); await f.service.handleInteraction(selection); expect(f.other.voice.disconnect).toHaveBeenCalledOnce();
  });
  it('requires Cyro’s Move Members permission both before and after the final read', async () => {
    for (const loss of ['before', 'during']) {
      const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); f.other.voice.channelId = channelId; const room = f.channels.get(channelId), button = panelButton(f, 'r'); await f.service.handleInteraction(button);
      const deny = () => room.permissionsFor.mockImplementation((member: any) => ({ has: (bits: bigint | bigint[]) => member.id !== botId || !(Array.isArray(bits) ? bits : [bits]).includes(P.MoveMembers) }));
      if (loss === 'before') deny(); else f.guild.voiceStates.fetch.mockImplementation(async () => { deny(); return f.other.voice; });
      const selection = pickerSubmission(button); await f.service.handleInteraction(selection); expect(selection.editReply.mock.calls[0][0].content).toContain('Cyro needs Move Members'); expect(f.other.voice.disconnect).not.toHaveBeenCalled();
    }
  });
  it.each(['definite', 'uncertain'])('never retries a %s disconnect failure from the same picker', async failure => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); f.other.voice.channelId = channelId;
    f.other.voice.disconnect.mockRejectedValue(failure === 'definite' ? Object.assign(new Error('Forbidden'), { code: 50013 }) : new Error('Socket closed after sending request'));
    const button = panelButton(f, 'r'); await f.service.handleInteraction(button); const selection = pickerSubmission(button); await f.service.handleInteraction(selection);
    expect(selection.editReply.mock.calls[0][0].content).toContain(failure === 'definite' ? 'Discord could not remove' : 'will not retry');
    const replay = pickerSubmission(button); await f.service.handleInteraction(replay); expect(replay.reply.mock.calls[0][0].content).toContain('already used'); await f.service.reconcile(); expect(f.other.voice.disconnect).toHaveBeenCalledOnce();
  });
  it('rolls back a pending allow when the selected member stops being eligible during authorization', async () => {
    const f = await fixture(); await f.service.joinLobby(f.guild, ownerId); await f.service.control(f.guild, ownerId, 'lock'); const button = panelButton(f, 'a'); await f.service.handleInteraction(button);
    let reads = 0; const fetch = f.guild.members.fetch.getMockImplementation(); f.guild.members.fetch.mockImplementation(async (input: any) => { if (input.user === otherId && ++reads === 2) f.other.pending = true; return fetch(input); });
    const room = f.channels.get(channelId), mutations = room.permissionOverwrites.set.mock.calls.length, selection = pickerSubmission(button); await f.service.handleInteraction(selection);
    expect(selection.editReply.mock.calls[0][0].content).toContain('no longer eligible'); expect(room.permissionOverwrites.set).toHaveBeenCalledTimes(mutations);
    const saved = JSON.parse(await readFile(path.join(f.dir, 'temp-voice.json'), 'utf8')); expect(saved.guilds[guildId].rooms[0].allowed).toEqual([]); expect(saved.guilds[guildId].rooms[0].permissionsPending).toBe(false);
  });
});
