import { randomUUID } from 'node:crypto';
import { ChannelType, Events, MessageFlags, PermissionFlagsBits, type CategoryChannel, type Client, type Guild, type GuildMember, type Interaction, type OverwriteResolvable, type VoiceChannel, type VoiceState } from 'discord.js';
import type { AccessService } from '../control/access.js';
import type { Logger } from '../logger.js';
import { TempVoiceStore } from './store.js';
import { parseTempVoiceConfig, roomName, type TempRoom, type TempVoiceConfig } from './types.js';

type Overwrite = { id: string; type: 0 | 1; allow: bigint; deny: bigint };
const CONNECT = PermissionFlagsBits.Connect;
const BOT_PERMISSIONS = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.MoveMembers];
const missingChannel = (error: unknown) => (error as { code?: number })?.code === 10003;
const copyOverwrites = (channel: CategoryChannel | VoiceChannel): Overwrite[] => [...channel.permissionOverwrites.cache.values()].map(value => ({ id: value.id, type: value.type, allow: value.allow.bitfield, deny: value.deny.bitfield }));

/** Only Connect changes. View Channel and every other permission retain the current channel value. */
export function roomOverwrites(current: Overwrite[], room: TempRoom, guildId: string, botId: string): Overwrite[] {
  const result = new Map(current.map(value => [value.id, { ...value }]));
  if (room.locked && !result.has(guildId)) result.set(guildId, { id: guildId, type: 0, allow: 0n, deny: 0n });
  for (const id of [room.ownerId, botId, ...room.allowed, ...room.blocked]) if (!result.has(id)) result.set(id, { id, type: 1, allow: 0n, deny: 0n });
  for (const [id, value] of result) {
    const before = room.connectBaseline[id];
    if (before) { value.allow = (value.allow & ~CONNECT) | (before.allow ? CONNECT : 0n); value.deny = (value.deny & ~CONNECT) | (before.deny ? CONNECT : 0n); }
    if (room.locked) { value.allow &= ~CONNECT; value.deny |= CONNECT; }
    if (room.locked && [botId, room.ownerId, ...room.allowed].includes(id)) { value.deny &= ~CONNECT; value.allow |= CONNECT; }
    if (room.blocked.includes(id) && id !== botId && id !== room.ownerId) { value.allow &= ~CONNECT; value.deny |= CONNECT; }
    if (!room.locked && before && !before.existed && !value.allow && !value.deny) result.delete(id);
  }
  if (result.size > 100) throw new Error('This room has reached Discord’s channel permission limit. Remove a member exception first.');
  return [...result.values()];
}

export class TempVoiceService {
  private readonly store: TempVoiceStore;
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly active = new Set<Promise<unknown>>();
  private readonly warnings = new Map<string, string>();
  private readonly cooldowns = new Map<string, number>();
  private stopped = false;
  private attached = false;
  private timer?: ReturnType<typeof setInterval>;
  private sweep?: Promise<void>;
  constructor(private readonly client: Client, dataDir: string, private readonly logger: Logger, private readonly access: AccessService) { this.store = new TempVoiceStore(dataDir); }
  async init(): Promise<void> { await this.store.init(); }
  getConfig(guildId: string): TempVoiceConfig { return this.store.get(guildId).config; }
  snapshot(guildId: string) {
    const data = this.store.get(guildId);
    return { config: data.config, rooms: data.rooms.filter(room => room.channelId).map(room => ({ channelId: room.channelId, ownerId: room.ownerId, name: room.name, locked: room.locked, state: room.state })), pending: data.rooms.filter(room => room.state === 'creating').length, warnings: this.warnings.has(guildId) ? [this.warnings.get(guildId)!] : [] };
  }
  private assertRunning(): void { if (this.stopped) throw new Error('Temporary voice rooms are stopping. Try again shortly.'); }
  private operational(guild: Guild): boolean { return !this.stopped && this.client.isReady() && guild.available && this.client.guilds.cache.get(guild.id) === guild; }
  private enqueue<T>(id: string, work: () => Promise<T>): Promise<T> {
    const task = (this.queues.get(id) ?? Promise.resolve()).catch(() => undefined).then(work); this.queues.set(id, task);
    void task.finally(() => { if (this.queues.get(id) === task) this.queues.delete(id); }).catch(() => undefined); return task;
  }
  private track(task: Promise<unknown>): void { this.active.add(task); void task.finally(() => this.active.delete(task)).catch(() => undefined); }
  private async forget(guildId: string, id: string): Promise<void> { await this.store.mutate(guildId, value => { value.rooms = value.rooms.filter(room => room.id !== id); }); }
  private async saveRoom(guildId: string, room: TempRoom): Promise<void> { await this.store.mutate(guildId, value => { const index = value.rooms.findIndex(item => item.id === room.id); if (index < 0) throw new Error('This temporary room is no longer tracked.'); value.rooms[index] = room; }); }
  private async configuredChannels(guild: Guild, config: TempVoiceConfig): Promise<{ lobby: VoiceChannel; category: CategoryChannel; bot: GuildMember }> {
    const lobby = config.lobbyChannelId ? await guild.channels.fetch(config.lobbyChannelId) : null;
    const category = config.categoryId ? await guild.channels.fetch(config.categoryId) : null;
    if (!lobby || lobby.guild.id !== guild.id || lobby.type !== ChannelType.GuildVoice) throw new Error('Choose a normal voice channel in this server for the join-to-create lobby.');
    if (!category || category.guild.id !== guild.id || category.type !== ChannelType.GuildCategory) throw new Error('Choose a category in this server for new rooms.');
    const bot = await guild.members.fetchMe({ force: true });
    if (!category.permissionsFor(bot)?.has(BOT_PERMISSIONS) || !lobby.permissionsFor(bot)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.MoveMembers])) throw new Error('Cyro needs View Channel, Connect, Manage Channels, Manage Permissions, and Move Members in the room category, plus View Channel, Connect, and Move Members in the lobby.');
    if (category.permissionOverwrites.cache.size > 97) throw new Error('Choose a category with fewer than 98 permission overwrites.');
    return { lobby, category, bot };
  }
  async updateConfig(guild: Guild, input: unknown, authorize?: () => Promise<void>): Promise<TempVoiceConfig> {
    this.assertRunning(); const config = parseTempVoiceConfig(input);
    return this.enqueue(guild.id, async () => {
      if (config.enabled) {
        await this.configuredChannels(guild, config);
        if (this.store.get(guild.id).rooms.some(room => room.channelId === config.lobbyChannelId)) throw new Error('Use a permanent voice channel as the lobby, not a temporary room.');
      }
      await authorize?.(); this.assertRunning();
      await this.store.mutate(guild.id, value => { value.config = config; }); return config;
    });
  }
  private async voiceChannel(guild: Guild, id: string): Promise<VoiceChannel | null> {
    let channel; try { channel = await guild.channels.fetch(id, { force: true }); } catch (error) { if (missingChannel(error)) return null; throw error; }
    if (!channel) return null;
    if (channel.guild.id !== guild.id || channel.type !== ChannelType.GuildVoice) throw new Error('The saved temporary room is not a voice channel in this server.');
    return channel;
  }
  private async applyPermissions(guild: Guild, channel: VoiceChannel, room: TempRoom, authorize?: () => Promise<void>): Promise<void> {
    const previous = this.store.get(guild.id).rooms.find(item => item.id === room.id);
    if (!previous) throw new Error('This room is no longer tracked.');
    const bot = await guild.members.fetchMe({ force: true });
    if (!channel.permissionsFor(bot)?.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles])) throw new Error('Cyro needs Manage Channels and Manage Permissions in this room.');
    const current = copyOverwrites(channel);
    // Persist the previous Connect bits before changing any overwrite, so a crash can restore them.
    for (const value of current) room.connectBaseline[value.id] ??= { type: value.type, existed: true, allow: Boolean(value.allow & CONNECT), deny: Boolean(value.deny & CONNECT) };
    for (const id of [guild.id, room.ownerId, bot.id, ...room.allowed, ...room.blocked]) room.connectBaseline[id] ??= { type: id === guild.id ? 0 : 1, existed: false, allow: false, deny: false };
    const next = roomOverwrites(current, room, guild.id, bot.id);
    room.permissionsPending = true; await this.saveRoom(guild.id, room);
    try { await authorize?.(); } catch (error) { await this.saveRoom(guild.id, previous); throw error; }
    this.assertRunning();
    const unchanged = current.length === next.length && next.every(value => current.some(old => old.id === value.id && old.type === value.type && old.allow === value.allow && old.deny === value.deny));
    if (!unchanged) await channel.permissionOverwrites.set(next as OverwriteResolvable[], 'Cyro temporary room owner controls');
    room.permissionsPending = false;
    if (!room.locked) room.connectBaseline = Object.fromEntries(Object.entries(room.connectBaseline).filter(([id]) => room.blocked.includes(id)));
    await this.saveRoom(guild.id, room);
  }
  /** Called from the Gateway. Queueing by guild prevents duplicate rooms and capacity races. */
  async joinLobby(guild: Guild, userId: string): Promise<void> {
    if (!this.operational(guild)) return;
    return this.enqueue(guild.id, async () => {
      const config = this.getConfig(guild.id);
      if (!config.enabled || !this.operational(guild)) return;
      const member = await guild.members.fetch({ user: userId, force: true });
      if (member.guild.id !== guild.id || member.user.bot || member.pending || member.voice.channelId !== config.lobbyChannelId) return;
      const { lobby, category, bot } = await this.configuredChannels(guild, config);
      if (!lobby.permissionsFor(member)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]) || !category.permissionsFor(member)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect])) throw new Error('The member needs access to both the lobby and the destination category.');
      let existing = this.store.get(guild.id).rooms.find(room => room.ownerId === userId);
      if (existing?.state === 'creating') { await this.recoverCreation(guild, existing); existing = this.store.get(guild.id).rooms.find(room => room.ownerId === userId); }
      if (existing) {
        if (!existing.channelId || existing.state !== 'active') throw new Error('A previous room operation is still being checked. Cyro will not create a duplicate.');
        const channel = await this.voiceChannel(guild, existing.channelId);
        if (channel) {
          if (!channel.permissionsFor(member)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect])) throw new Error('Your existing room is no longer accessible. Ask server staff to check its permissions.');
          if (this.operational(guild) && member.voice.channelId === lobby.id) await member.voice.setChannel(channel, 'Cyro returning to existing temporary room');
          return;
        }
        await this.forget(guild.id, existing.id);
      }
      const key = `${guild.id}:${userId}`, now = Date.now();
      if ((this.cooldowns.get(key) ?? 0) > now) throw new Error('Please wait 20 seconds before creating another room.');
      if (this.store.get(guild.id).rooms.length >= config.maxRooms) throw new Error('The temporary room limit has been reached. Wait for an empty room to close.');
      if (category.children.cache.size >= 50) throw new Error('The room category is full. Ask staff to select another category.');
      const id = randomUUID().replaceAll('-', '');
      const room: TempRoom = { id, ownerId: userId, channelId: null, categoryId: category.id, creationName: `cyro-room-${id}`, name: roomName(config.nameTemplate, member.displayName), createdAt: now, state: 'creating', locked: false, permissionsPending: false, allowed: [], blocked: [], connectBaseline: {} };
      this.cooldowns.set(key, now + 20_000);
      await this.store.mutate(guild.id, value => { value.rooms.push(room); });
      const overwrites = copyOverwrites(category);
      for (const memberId of [bot.id, member.id]) { let overwrite = overwrites.find(value => value.id === memberId); if (!overwrite) { overwrite = { id: memberId, type: 1, allow: 0n, deny: 0n }; overwrites.push(overwrite); } overwrite.allow |= CONNECT; overwrite.deny &= ~CONNECT; }
      if (!this.operational(guild) || member.voice.channelId !== lobby.id) { await this.forget(guild.id, room.id); return; }
      let channel: VoiceChannel;
      try {
        // The unpredictable receipt name is retained until its channel ID is durably saved.
        channel = await guild.channels.create({ name: room.creationName, type: ChannelType.GuildVoice, parent: category.id, userLimit: config.userLimit, permissionOverwrites: overwrites as OverwriteResolvable[], reason: 'Cyro temporary voice room requested by its owner' });
      } catch (error) {
        // Definite API rejections created no channel; network/timeout failures remain reserved for reconciliation.
        if ([50001, 50013, 50035, 30013, 30030].includes((error as { code?: number }).code ?? 0)) await this.forget(guild.id, room.id);
        throw error;
      }
      room.channelId = channel.id; room.state = 'active'; await this.saveRoom(guild.id, room);
      if (!this.operational(guild)) return;
      await channel.setName(room.name, 'Cyro temporary voice room name');
      if (member.voice.channelId === lobby.id) await member.voice.setChannel(channel, 'Cyro join-to-create voice room');
      this.warnings.delete(guild.id);
    });
  }
  private async recoverCreation(guild: Guild, room: TempRoom): Promise<void> {
    await guild.channels.fetch();
    const matches = [...guild.channels.cache.values()].filter(channel => channel.type === ChannelType.GuildVoice && channel.name === room.creationName && channel.parentId === room.categoryId && channel.createdTimestamp >= room.createdAt - 5000 && channel.createdTimestamp <= room.createdAt + 600_000);
    if (matches.length !== 1) { this.warnings.set(guild.id, 'A room creation has an uncertain result. Cyro has reserved its owner’s slot to avoid creating duplicates. Staff should check the server and Cyro logs before clearing saved recovery data.'); return; }
    const channel = matches[0] as VoiceChannel;
    if (!channel.permissionOverwrites.cache.get(room.ownerId)?.allow.has(CONNECT) || !channel.permissionOverwrites.cache.get(this.client.user!.id)?.allow.has(CONNECT)) return;
    room.channelId = channel.id; room.state = 'active'; await this.saveRoom(guild.id, room);
    if (!this.operational(guild)) return;
    await channel.setName(room.name, 'Cyro recovered temporary room creation');
    const member = await guild.members.fetch({ user: room.ownerId, force: true }).catch(() => null);
    if (member && !member.pending && member.voice.channelId === this.getConfig(guild.id).lobbyChannelId && channel.permissionsFor(member)?.has([PermissionFlagsBits.ViewChannel, CONNECT])) await member.voice.setChannel(channel, 'Cyro recovered join-to-create room');
  }
  private async reconcileGuild(guild: Guild): Promise<void> {
    if (!this.operational(guild)) return;
    for (const receipt of this.store.get(guild.id).rooms) {
      if (!this.operational(guild)) return;
      if (receipt.state === 'creating') { await this.recoverCreation(guild, receipt); continue; }
      const channel = await this.voiceChannel(guild, receipt.channelId!);
      if (!channel) { await this.forget(guild.id, receipt.id); continue; }
      // Only receipt-backed channels are eligible. A grace period covers the create-and-move interval.
      if (channel.members.size === 0 && !guild.voiceStates.cache.some(state => state.channelId === channel.id) && Date.now() - receipt.createdAt >= 15_000) {
        receipt.state = 'deleting'; await this.saveRoom(guild.id, receipt);
        if (!this.operational(guild) || channel.members.size || guild.voiceStates.cache.some(state => state.channelId === channel.id)) continue;
        try { await channel.delete('Cyro temporary voice room is empty'); } catch (error) { if (!missingChannel(error)) throw error; }
        await this.forget(guild.id, receipt.id);
      } else {
        if (receipt.state === 'deleting') { receipt.state = 'active'; await this.saveRoom(guild.id, receipt); }
        if (receipt.locked || receipt.permissionsPending) await this.applyPermissions(guild, channel, receipt);
      }
    }
  }
  reconcile(): Promise<void> {
    if (this.sweep) return this.sweep;
    this.sweep = (async () => { for (const id of await this.store.guildIds()) { const guild = this.client.guilds.cache.get(id); if (!guild || !this.operational(guild)) continue; await this.enqueue(id, () => this.reconcileGuild(guild)).catch(() => { this.warnings.set(id, 'Some temporary room changes are waiting. Check Cyro’s channel permissions; it will retry safely.'); this.logger.warn('Temporary voice reconciliation could not complete.', { guildId: id }); }); } })().finally(() => { this.sweep = undefined; }); return this.sweep;
  }
  /** Service boundary used by commands and tests; always refreshes membership and room ownership. */
  async control(guild: Guild, actorId: string, action: 'info' | 'lock' | 'unlock' | 'name' | 'limit' | 'permit' | 'revoke', value?: string | number): Promise<string> {
    this.assertRunning();
    if (!['info', 'lock', 'unlock', 'name', 'limit', 'permit', 'revoke'].includes(action)) throw new Error('Choose a valid room action.');
    return this.enqueue(guild.id, async () => {
      const actor = await this.access.member(guild, actorId); this.access.commandMember(actor, 'room', true);
      if (actor.guild.id !== guild.id || actor.id !== actorId || actor.user.bot || actor.pending) throw new Error('Use this command as a current server member.');
      const room = this.store.get(guild.id).rooms.find(item => item.channelId === actor.voice.channelId && item.state === 'active');
      if (!room) throw new Error('Join your temporary voice room before using /room.');
      const staff = actor.permissions.has(PermissionFlagsBits.ManageChannels);
      if (room.ownerId !== actorId && !staff) throw new Error('Only this room’s owner or staff with Manage Channels can change it.');
      if (!this.getConfig(guild.id).ownerControls && !staff) throw new Error('Room owner controls are disabled for this server. Ask staff for help.');
      const channel = await this.voiceChannel(guild, room.channelId!);
      if (!channel || !channel.permissionsFor(actor)?.has(staff ? [PermissionFlagsBits.ViewChannel] : [PermissionFlagsBits.ViewChannel, CONNECT])) throw new Error('This room is no longer accessible.');
      const authorize = async () => {
        const current = await this.access.member(guild, actorId); this.access.commandMember(current, 'room', true);
        const currentRoom = this.store.get(guild.id).rooms.find(item => item.id === room.id);
        const isStaff = current.permissions.has(PermissionFlagsBits.ManageChannels);
        if (current.guild.id !== guild.id || current.id !== actorId || current.user.bot || current.pending || current.voice.channelId !== channel.id || !currentRoom || currentRoom.state !== 'active'
          || (currentRoom.ownerId !== actorId && !isStaff) || (!this.getConfig(guild.id).ownerControls && !isStaff) || !channel.permissionsFor(current)?.has(isStaff ? [PermissionFlagsBits.ViewChannel] : [PermissionFlagsBits.ViewChannel, CONNECT])) throw new Error('Your room access changed. Rejoin your room and try again.');
      };
      if (action === 'info') return `Room owner: <@${room.ownerId}>. ${room.locked ? 'Locked' : 'Open'} · ${channel.userLimit ? `${channel.userLimit} members` : 'No member limit'}. Use /room lock, unlock, name, limit, permit, or revoke. Empty rooms close automatically. Administrators can bypass room locks.`;
      if (action === 'name') {
        if (typeof value !== 'string' || !value.trim() || value.length > 80) throw new Error('Choose a room name between 1 and 80 characters.');
        const key = `name:${guild.id}:${channel.id}`; if ((this.cooldowns.get(key) ?? 0) > Date.now()) throw new Error('Wait 5 minutes before renaming this room again.');
        await authorize(); this.cooldowns.set(key, Date.now() + 300_000); this.assertRunning();
        const name = roomName(value, ''); await channel.setName(name, 'Cyro temporary room owner renamed their room'); room.name = name; await this.saveRoom(guild.id, room); return `Room renamed to ${name}.`;
      }
      if (action === 'limit') { if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 99) throw new Error('Choose a member limit between 0 and 99.'); await authorize(); this.assertRunning(); await channel.setUserLimit(Number(value), 'Cyro temporary room member limit'); return Number(value) ? `Room limit set to ${value} members.` : 'Room member limit removed.'; }
      if (action === 'permit' || action === 'revoke') {
        if (typeof value !== 'string' || !/^\d{17,20}$/.test(value)) throw new Error('Choose a server member.');
        const target = await guild.members.fetch({ user: value, force: true });
        if (target.guild.id !== guild.id || target.pending || target.user.bot || target.id === room.ownerId) throw new Error('Choose another current human member who has completed server screening.');
        const category = await guild.channels.fetch(room.categoryId);
        if (!category || category.type !== ChannelType.GuildCategory || category.guild.id !== guild.id || !category.permissionsFor(target)?.has([PermissionFlagsBits.ViewChannel, CONNECT])) throw new Error('That member must already have access to this room’s category.');
        room.allowed = room.allowed.filter(id => id !== value); room.blocked = room.blocked.filter(id => id !== value);
        (action === 'permit' ? room.allowed : room.blocked).push(value);
        if (room.allowed.length > 50 || room.blocked.length > 50) throw new Error('A room supports up to 50 allowed and 50 blocked members.');
      } else room.locked = action === 'lock';
      await authorize(); this.assertRunning(); await this.applyPermissions(guild, channel, room, authorize);
      return action === 'lock' ? 'Room locked. Permitted members and Discord administrators can still join; current members stay in the call.' : action === 'unlock' ? 'Room unlocked. Normal join permissions are restored; individually blocked members remain blocked.' : action === 'permit' ? 'Member permitted to join while the room is locked. Existing category visibility still applies.' : 'Member blocked from joining. This does not disconnect someone already in the call, and Discord administrators bypass channel denies.';
    });
  }
  async handleInteraction(interaction: Interaction): Promise<boolean> {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'room') return false;
    try {
      if (!interaction.inCachedGuild()) { await interaction.reply({ content: 'Use /room inside your Discord server.', flags: MessageFlags.Ephemeral }); return true; }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const action = interaction.options.getSubcommand() as Parameters<TempVoiceService['control']>[2];
      const value = action === 'name' ? interaction.options.getString('name', true) : action === 'limit' ? interaction.options.getInteger('members', true) : ['permit', 'revoke'].includes(action) ? interaction.options.getUser('member', true).id : undefined;
      const content = await this.control(interaction.guild, interaction.user.id, action, value);
      await interaction.editReply({ embeds: [{ title: action === 'info' ? 'Your temporary room' : 'Room updated', description: content, color: 0x85cae5 }], allowedMentions: { parse: [] } });
    } catch (error) {
      this.logger.warn('Temporary voice command could not complete.', { guildId: interaction.guildId });
      const content = error instanceof Error && error.name === 'Error' ? error.message.slice(0, 1800) : 'Cyro could not change this room. Check its channel permissions and try again.';
      try { if (interaction.deferred) await interaction.editReply({ content, allowedMentions: { parse: [] } }); else if (!interaction.replied) await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } }); } catch { /* Interaction may have expired. */ }
    }
    return true;
  }
  private readonly onInteraction = (interaction: Interaction): void => { if (!this.stopped) this.track(this.handleInteraction(interaction)); };
  private readonly onVoice = (oldState: VoiceState, next: VoiceState): void => {
    if (this.stopped || oldState.channelId === next.channelId) return;
    const guild = next.guild, config = this.getConfig(guild.id);
    if (config.enabled && next.channelId === config.lobbyChannelId) this.track(this.joinLobby(guild, next.id).catch(() => { this.warnings.set(guild.id, 'A member could not enter their room. Check the lobby and category permissions, room capacity, or pending recovery below.'); this.logger.warn('Temporary room entry could not complete.', { guildId: guild.id }); }));
    if (oldState.channelId && this.store.get(guild.id).rooms.some(room => room.channelId === oldState.channelId)) this.track(this.enqueue(guild.id, () => this.reconcileGuild(guild)).catch(() => this.logger.warn('Empty temporary room cleanup is waiting.', { guildId: guild.id })));
  };
  private readonly onReady = (): void => { if (!this.stopped) this.track(this.reconcile()); };
  attach(): void {
    if (this.attached || this.stopped) return; this.attached = true;
    this.client.on(Events.VoiceStateUpdate, this.onVoice); this.client.on(Events.InteractionCreate, this.onInteraction); this.client.on(Events.ClientReady, this.onReady); this.client.on(Events.GuildCreate, this.onReady);
    this.timer = setInterval(() => { for (const [key, until] of this.cooldowns) if (until < Date.now()) this.cooldowns.delete(key); this.onReady(); }, 15_000); this.timer.unref(); this.onReady();
  }
  stop(): void { this.stopped = true; if (this.timer) clearInterval(this.timer); if (!this.attached) return; this.attached = false; this.client.off(Events.VoiceStateUpdate, this.onVoice); this.client.off(Events.InteractionCreate, this.onInteraction); this.client.off(Events.ClientReady, this.onReady); this.client.off(Events.GuildCreate, this.onReady); }
  async flush(): Promise<void> { while (this.queues.size || this.active.size || this.sweep) await Promise.allSettled([...this.queues.values(), ...this.active, ...(this.sweep ? [this.sweep] : [])]); await this.store.flush(); }
  async guildIds(): Promise<string[]> { return this.store.guildIds(); }
  async purgeGuild(guildId: string, guard: () => boolean = () => true): Promise<void> { await this.enqueue(guildId, () => this.store.purgeGuild(guildId, guard)); this.warnings.delete(guildId); }
}
