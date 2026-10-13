import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { Events, PermissionsBitField, PermissionFlagsBits } from 'discord.js';
import { expect, it, vi } from 'vitest';
import { CommunityService } from '../src/community/service.js';
import { CommunityStore } from '../src/community/store.js';
import { Logger } from '../src/logger.js';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

it('drains a role button accepted before shutdown even while acknowledgement precedes its guild queue', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'community-lifecycle-'));
  const acknowledge = deferred(), addRole = deferred();
  const guildId = '111111111111111111', roleId = '222222222222222222';
  const role = { id: roleId, guild: { id: guildId }, managed: false, editable: true, permissions: new PermissionsBitField() };
  const member = { pending: false, roles: { cache: new Map(), add: vi.fn(() => addRole.promise) } };
  const guild = {
    id: guildId,
    members: { fetchMe: async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.ManageRoles) }), fetch: async () => member },
    roles: { fetch: async (id?: string) => id ? role : new Map([[roleId, role]]) },
  };
  const client = Object.assign(new EventEmitter(), { isReady: () => false, guilds: { fetch: async () => guild } });
  const service = new CommunityService(client as never, directory, new Logger('error'));
  try {
    await service.init();
    await service.updateConfig(guildId, { selfRoles: { roles: [{ roleId, label: 'Member' }] } });
    service.attach();
    const interaction = {
      isChatInputCommand: () => false, isButton: () => true, inCachedGuild: () => true,
      customId: `community:role:${guildId}:${roleId}`, guildId, guild, user: { id: 'member' },
      deferReply: vi.fn(() => acknowledge.promise), editReply: vi.fn(async () => undefined),
    };
    client.emit(Events.InteractionCreate, interaction);
    service.stop();
    client.emit(Events.InteractionCreate, interaction);
    let drained = false;
    const flushing = service.flush().then(() => { drained = true; });
    await setImmediate();
    expect(drained).toBe(false);
    acknowledge.resolve();
    await setImmediate();
    expect(member.roles.add).toHaveBeenCalledOnce();
    expect(drained).toBe(false);
    addRole.resolve();
    await flushing;
    expect(interaction.deferReply).toHaveBeenCalledOnce();
    expect(interaction.editReply).toHaveBeenCalledOnce();
    expect(client.listenerCount(Events.InteractionCreate)).toBe(0);
  } finally {
    acknowledge.resolve(); addRole.resolve(); service.stop(); await service.flush();
    await rm(directory, { recursive: true, force: true });
  }
});

it('does not restore a pending invite baseline after the bot is removed from the guild', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'community-baseline-race-'));
  const fetching = deferred();
  const guildId = '111111111111111111';
  let refreshing = false;
  const guild = {
    id: guildId, available: true, memberCount: 1,
    members: { fetchMe: async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.ManageGuild) }), fetch: async () => new Map() },
    invites: { fetch: vi.fn(async () => {
      if (refreshing) await fetching.promise;
      return new Map([['invite', { code: 'invite', uses: 0, inviterId: 'inviter' }]]);
    }) },
  };
  const client = Object.assign(new EventEmitter(), { isReady: () => false, guilds: { fetch: async () => guild } });
  const service = new CommunityService(client as never, directory, new Logger('error'));
  try {
    await service.init(); await service.updateConfig(guildId, { invites: { enabled: true } }); service.attach();
    refreshing = true;
    client.emit(Events.GuildCreate, guild);
    await vi.waitFor(() => expect(guild.invites.fetch).toHaveBeenCalledTimes(2));
    client.emit(Events.GuildDelete, guild);
    fetching.resolve(); await service.flush();
    expect((await service.snapshot(guildId)).inviteTracking.ready).toBe(false);
  } finally {
    fetching.resolve(); service.stop(); await service.flush(); await rm(directory, { recursive: true, force: true });
  }
});

it('does not restore or credit an invite observation invalidated while its fetch is pending', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'community-invite-race-'));
  const fetching = deferred();
  const guildId = '111111111111111111';
  let joining = false;
  const guild = {
    id: guildId, available: true, memberCount: 1,
    members: { fetchMe: async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.ManageGuild) }), fetch: async () => new Map() },
    invites: { fetch: vi.fn(async () => {
      if (joining) await fetching.promise;
      return new Map([['invite', { code: 'invite', uses: joining ? 1 : 0, inviterId: 'inviter' }]]);
    }) },
  };
  const client = Object.assign(new EventEmitter(), { isReady: () => false, guilds: { fetch: async () => guild } });
  const service = new CommunityService(client as never, directory, new Logger('error'));
  try {
    await service.init(); await service.updateConfig(guildId, { invites: { enabled: true } }); service.attach();
    joining = true;
    client.emit(Events.GuildMemberAdd, { id: 'new-member', user: { bot: false }, guild });
    await vi.waitFor(() => expect(guild.invites.fetch).toHaveBeenCalledTimes(2));
    guild.available = false;
    client.emit(Events.GuildUnavailable, guild);
    fetching.resolve(); await service.flush();
    const snapshot = await service.snapshot(guildId);
    expect(snapshot.inviteTracking.ready).toBe(false);
    expect(snapshot.inviteLeaderboard).toEqual([]);
  } finally {
    fetching.resolve(); service.stop(); await service.flush(); await rm(directory, { recursive: true, force: true });
  }
});

it('invalidates invite observations during a guild outage and baselines again on availability', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'community-outage-'));
  const guildId = '111111111111111111';
  const fetchInvites = vi.fn(async () => new Map([['invite', { code: 'invite', uses: 0, inviterId: 'inviter' }]]));
  const guild = {
    id: guildId, available: true, memberCount: 1,
    members: { fetchMe: async () => ({ permissions: new PermissionsBitField(PermissionFlagsBits.ManageGuild) }), fetch: async () => new Map() },
    invites: { fetch: fetchInvites },
  };
  const client = Object.assign(new EventEmitter(), { isReady: () => false, guilds: { fetch: async () => guild } });
  const service = new CommunityService(client as never, directory, new Logger('error'));
  try {
    await service.init();
    await service.updateConfig(guildId, { invites: { enabled: true } });
    service.attach();
    guild.available = false;
    client.emit(Events.GuildUnavailable, guild);
    expect((await service.snapshot(guildId)).inviteTracking.ready).toBe(false);
    guild.available = true;
    client.emit(Events.GuildAvailable, guild);
    await service.flush();
    expect((await service.snapshot(guildId)).inviteTracking.ready).toBe(true);
    expect(fetchInvites).toHaveBeenCalledTimes(2);
  } finally {
    service.stop(); await service.flush(); await rm(directory, { recursive: true, force: true });
  }
});

it('checks the purge cancellation predicate after earlier store writes finish', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'community-purge-'));
  const writing = deferred();
  const store = new CommunityStore(directory, async () => { await writing.promise; });
  try {
    await store.init();
    const update = store.mutate('one', state => { state.counting.current = 42; });
    let removed = true;
    const purge = store.purgeGuild('one', () => removed);
    removed = false;
    writing.resolve();
    await Promise.all([update, purge]);
    expect(store.get('one').counting.current).toBe(42);
  } finally {
    writing.resolve(); await store.flush(); await rm(directory, { recursive: true, force: true });
  }
});
