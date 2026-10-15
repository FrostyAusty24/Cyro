import { botText } from '../i18n/index.js';
import { Events, PermissionFlagsBits, type Client, type Guild, type GuildMember, type PartialGuildMember, type Presence, type Role } from 'discord.js';
import { assertSafeRole } from '../community/config.js';
import { assertNotAccessRole, type AccessService } from '../control/access.js';
import type { Logger } from '../logger.js';
import { StatusRoleStore } from './store.js';
import { assignmentKey, parseStatusRoleConfig, statusMatches, type Assignment } from './types.js';

export class StatusRoleService {
  private readonly store: StatusRoleStore;
  private readonly pending = new Map<string, { dirty: boolean; task: Promise<void> }>();
  private readonly configQueues = new Map<string, Promise<unknown>>();
  private readonly warnings = new Map<string, string>();
  private readonly departed = new Set<string>();
  private stopped = false;
  private attached = false;
  private timer?: ReturnType<typeof setInterval>;
  private sweep?: Promise<void>;
  private cursor = '';
  private running = 0;
  private waiters: Array<() => void> = [];
  constructor(private readonly client: Client, dataDir: string, private readonly logger: Logger, private readonly access: AccessService, private readonly presenceAvailable: boolean) { this.store = new StatusRoleStore(dataDir); }
  async init(): Promise<void> { await this.store.init(); }
  getConfig(guildId: string) { return this.store.get(guildId).config; }
  /** Internal access-policy guard: cleanup receipts remain automatic reward sources until resolved. */
  automaticRoleIds(guildId: string): string[] {
    const state = this.store.get(guildId);
    return [...new Set([state.config.roleId, ...Object.values(state.assignments).map(value => value.roleId)].filter((value): value is string => Boolean(value)))];
  }
  snapshot(guildId: string) {
    const state = this.store.get(guildId), counts = { assigned: 0, pendingAdd: 0, pendingRemove: 0 };
    for (const value of Object.values(state.assignments)) counts[value.state === 'assigned' ? 'assigned' : value.state === 'pending-add' ? 'pendingAdd' : 'pendingRemove']++;
    const warnings: string[] = [];
    if (!this.presenceAvailable) warnings.push('Status roles need the Presence Intent enabled for Cyro, followed by a bot restart.');
    const warning = [...this.warnings.entries()].find(([key]) => key.startsWith(`${guildId}:`))?.[1]; if (warning) warnings.push(warning);
    return { config: state.config, available: this.presenceAvailable, counts, warnings };
  }
  private async safeRole(guild: Guild, roleId: string): Promise<Role | undefined> {
    await guild.roles.fetch();
    const bot = await guild.members.fetchMe({ force: true });
    if (bot.guild.id !== guild.id || !bot.permissions.has(PermissionFlagsBits.ManageRoles)) throw new Error('Cyro needs Manage Roles in this server.');
    const role = guild.roles.cache.get(roleId); if (!role) return;
    if (role.guild.id !== guild.id) throw new Error('Choose a role belonging to this server.');
    assertNotAccessRole(guild.id, roleId);
    if (this.access.protectedRole(guild.id, roleId)) throw new Error('Dashboard and command access roles cannot be status rewards.');
    assertSafeRole(role);
    return role;
  }
  async updateConfig(guildId: string, input: unknown, authorize?: () => Promise<void>) {
    if (this.stopped) throw new Error('Status roles are stopping. Try again shortly.');
    const config = parseStatusRoleConfig(input);
    const task = (this.configQueues.get(guildId) ?? Promise.resolve()).catch(() => undefined).then(async () => {
      if (config.enabled && !this.presenceAvailable) throw new Error('Enable the Presence Intent for Cyro and restart the bot before enabling status roles.');
      // A disabled rule can always be cleared to recover from a deleted or unsafe old role.
      if (config.roleId && config.enabled) {
        const guild = await this.client.guilds.fetch(guildId);
        if (guild.id !== guildId || !guild.available || !await this.safeRole(guild, config.roleId)) throw new Error('Choose an available, safe role belonging to this server.');
      }
      if (authorize) await authorize();
      if (this.stopped) throw new Error('Status roles are stopping. Try again shortly.');
      await this.store.mutate(guildId, state => { state.config = config; });
      this.onReady();
      return structuredClone(config);
    });
    this.configQueues.set(guildId, task);
    void task.finally(() => { if (this.configQueues.get(guildId) === task) this.configQueues.delete(guildId); }).catch(() => undefined);
    return task;
  }
  private observed(guild: Guild, memberId: string, roleId: string): boolean | null {
    const config = this.getConfig(guild.id);
    if (!config.enabled || config.roleId !== roleId) return false;
    if (!this.presenceAvailable) return null;
    return statusMatches(config, guild.presences.cache.get(memberId));
  }
  private operational(guild: Guild): boolean { return !this.stopped && this.client.isReady() && guild.available && this.client.guilds.cache.get(guild.id) === guild; }
  private async forget(guildId: string, memberId: string, roleId?: string): Promise<void> {
    const current = Object.values(this.store.get(guildId).assignments).some(value => value.memberId === memberId && (!roleId || value.roleId === roleId));
    if (!current) return;
    await this.store.mutate(guildId, state => { for (const [key, value] of Object.entries(state.assignments)) if (value.memberId === memberId && (!roleId || value.roleId === roleId)) delete state.assignments[key]; });
  }
  private async receipt(guildId: string, memberId: string, roleId: string, state: Assignment['state']): Promise<void> {
    await this.store.mutate(guildId, guild => { guild.assignments[assignmentKey(memberId, roleId)] = { memberId, roleId, state }; });
  }
  private async mutationMember(guild: Guild, memberId: string, roleId: string, desired: boolean): Promise<GuildMember | undefined> {
    let member: GuildMember;
    try { member = await guild.members.fetch({ user: memberId, force: true }); }
    catch (error) { if ((error as { code?: number }).code === 10007) { await this.forget(guild.id, memberId); return; } throw error; }
    if (member.guild.id !== guild.id || member.id !== memberId || member.user.bot || member.pending) return;
    const role = await this.safeRole(guild, roleId);
    if (!role) { await this.forget(guild.id, memberId, roleId); return; }
    if (!this.operational(guild) || this.observed(guild, memberId, roleId) !== desired) return;
    // Access settings can change while the Discord reads above are in flight.
    assertNotAccessRole(guild.id, roleId);
    if (this.access.protectedRole(guild.id, roleId)) throw new Error('Dashboard and command access roles cannot be status rewards.');
    assertSafeRole(role);
    return member;
  }
  private finalCheck(guild: Guild, memberId: string, roleId: string, desired: boolean): boolean {
    if (this.departed.has(`${guild.id}:${memberId}`) || !this.operational(guild) || this.observed(guild, memberId, roleId) !== desired) return false;
    const role = guild.roles.cache.get(roleId); if (!role) return false;
    assertNotAccessRole(guild.id, roleId);
    if (this.access.protectedRole(guild.id, roleId)) throw new Error('Dashboard and command access roles cannot be status rewards.');
    assertSafeRole(role); return true;
  }
  private async processMember(guildId: string, memberId: string): Promise<void> {
    if (this.departed.has(`${guildId}:${memberId}`)) { await this.forget(guildId, memberId); return; }
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild || !this.operational(guild)) return;
    const before = this.store.get(guildId);
    const tracked = Object.values(before.assignments).some(value => value.memberId === memberId);
    if (!tracked && (!before.config.enabled || !this.presenceAvailable || statusMatches(before.config, guild.presences.cache.get(memberId)) !== true)) return;
    let member: GuildMember;
    try { member = await guild.members.fetch({ user: memberId, force: true }); }
    catch (error) { if ((error as { code?: number }).code === 10007) { await this.forget(guildId, memberId); return; } throw error; }
    if (!this.operational(guild) || member.guild.id !== guildId || member.id !== memberId) return;
    if (member.user.bot || member.pending) return;
    // Clear old rules first. Only assignments recorded by this module are eligible for removal.
    for (const assignment of Object.values(this.store.get(guildId).assignments).filter(value => value.memberId === memberId)) {
      const desired = this.observed(guild, memberId, assignment.roleId);
      if (desired === null) continue;
      if (!member.roles.cache.has(assignment.roleId)) {
        if (desired === false) await this.forget(guildId, memberId, assignment.roleId);
        continue;
      }
      if (desired) {
        if (assignment.state !== 'assigned') await this.receipt(guildId, memberId, assignment.roleId, 'assigned');
        continue;
      }
      const role = await this.safeRole(guild, assignment.roleId);
      if (!role) { await this.forget(guildId, memberId, assignment.roleId); continue; }
      if (!this.operational(guild) || this.observed(guild, memberId, assignment.roleId) !== false) continue;
      await this.receipt(guildId, memberId, assignment.roleId, 'pending-remove');
      if (!this.operational(guild) || this.observed(guild, memberId, assignment.roleId) !== false) continue;
      const current = await this.mutationMember(guild, memberId, assignment.roleId, false); if (!current || !this.finalCheck(guild, memberId, assignment.roleId, false)) continue;
      // Single-role DELETE is idempotent and never replaces the member's other roles.
      await current.roles.remove(assignment.roleId, botText(guildId, 'Cyro custom status role no longer matches', {}, guild.preferredLocale));
      await this.forget(guildId, memberId, assignment.roleId);
    }
    const config = this.getConfig(guildId), roleId = config.roleId;
    if (!roleId || this.observed(guild, memberId, roleId) !== true || !this.operational(guild)) return;
    // A role present before our receipt belongs to the server/staff; never claim or revoke it.
    if (member.roles.cache.has(roleId)) return;
    if (!await this.safeRole(guild, roleId)) throw new Error('The status reward role no longer exists.');
    if (!this.operational(guild) || this.observed(guild, memberId, roleId) !== true) return;
    await this.receipt(guildId, memberId, roleId, 'pending-add');
    if (!this.operational(guild) || this.observed(guild, memberId, roleId) !== true) return;
    const current = await this.mutationMember(guild, memberId, roleId, true); if (!current || !this.finalCheck(guild, memberId, roleId, true)) return;
    // Single-role PUT is idempotent; a persisted uncertain receipt can safely reconcile on restart.
    await current.roles.add(roleId, botText(guildId, 'Cyro custom status role matched', {}, guild.preferredLocale));
    await this.receipt(guildId, memberId, roleId, 'assigned');
  }
  private async withCapacity(operation: () => Promise<void>): Promise<void> {
    if (this.running >= 4) await new Promise<void>(resolve => this.waiters.push(resolve));
    else this.running++;
    try { await operation(); } finally {
      // Hand the existing permit directly to a waiter; a new arrival cannot steal its slot.
      const next = this.waiters.shift(); if (next) next(); else this.running--;
    }
  }
  /** Coalesces repeated presence updates; the current cached presence is read again before each mutation. */
  reconcileMember(guildId: string, memberId: string): Promise<void> {
    if (this.stopped) return Promise.resolve();
    const key = `${guildId}:${memberId}`, existing = this.pending.get(key);
    if (existing) { existing.dirty = true; return existing.task; }
    const entry = { dirty: false, task: Promise.resolve() };
    entry.task = Promise.resolve().then(async () => {
      do { entry.dirty = false; await this.withCapacity(() => this.processMember(guildId, memberId)); } while (entry.dirty && !this.stopped);
      this.warnings.delete(key);
    }).catch(error => {
      this.warnings.set(key, 'Some status role changes are waiting. Check Cyro’s Manage Roles permission, role order, and reward role permissions. Cyro will retry safely.');
      this.logger.warn('Status role reconciliation could not complete.', { guildId }); throw error;
    }).finally(() => { this.pending.delete(key); });
    this.pending.set(key, entry); return entry.task;
  }
  /** Visits at most 50 members per pass, advancing across all guilds without requesting their full member lists. */
  reconcile(): Promise<void> {
    if (this.sweep) return this.sweep;
    if (this.stopped || !this.client.isReady()) return Promise.resolve();
    this.sweep = (async () => {
      const candidates = new Set<string>();
      for (const guildId of await this.store.guildIds()) {
        const guild = this.client.guilds.cache.get(guildId); if (!guild || !guild.available) continue;
        const state = this.store.get(guildId);
        for (const assignment of Object.values(state.assignments)) candidates.add(`${guildId}:${assignment.memberId}`);
        if (this.presenceAvailable && state.config.enabled) for (const [memberId, presence] of guild.presences.cache) {
          if (statusMatches(state.config, presence) === true) candidates.add(`${guildId}:${memberId}`);
        }
      }
      const sorted = [...candidates].sort(), later = sorted.filter(key => key > this.cursor), earlier = sorted.filter(key => key <= this.cursor);
      for (const key of [...later, ...earlier].slice(0, 50)) {
        if (this.stopped) break;
        this.cursor = key; const [guildId, memberId] = key.split(':');
        await this.reconcileMember(guildId!, memberId!).catch(() => undefined);
      }
    })().finally(() => { this.sweep = undefined; });
    return this.sweep;
  }
  private readonly onReady = (): void => { if (this.attached && !this.stopped) void this.reconcile().catch(() => this.logger.warn('Status role reconciliation could not start.')); };
  private readonly onPresence = (_old: Presence | null, current: Presence): void => {
    if (!current.guild || !this.presenceAvailable) return;
    const state = this.store.get(current.guild.id);
    if (!state.config.enabled && !Object.values(state.assignments).some(value => value.memberId === current.userId)) return;
    void this.reconcileMember(current.guild.id, current.userId).catch(() => undefined);
  };
  private readonly onMemberUpdate = (_old: GuildMember | PartialGuildMember, member: GuildMember): void => {
    const config = this.getConfig(member.guild.id);
    if (config.enabled || Object.values(this.store.get(member.guild.id).assignments).some(value => value.memberId === member.id)) void this.reconcileMember(member.guild.id, member.id).catch(() => undefined);
  };
  private readonly onMemberRemove = (member: GuildMember | PartialGuildMember): void => {
    const key = `${member.guild.id}:${member.id}`; this.departed.add(key);
    void this.reconcileMember(member.guild.id, member.id).finally(() => this.departed.delete(key)).catch(() => undefined);
  };
  private readonly onMemberAdd = (member: GuildMember): void => {
    const prior = this.pending.get(`${member.guild.id}:${member.id}`)?.task ?? Promise.resolve();
    void prior.catch(() => undefined).then(() => this.reconcileMember(member.guild.id, member.id)).catch(() => undefined);
  };
  attach(): void {
    if (this.attached || this.stopped) return;
    this.attached = true;
    this.client.on(Events.PresenceUpdate, this.onPresence);
    this.client.on(Events.GuildMemberUpdate, this.onMemberUpdate);
    this.client.on(Events.GuildMemberRemove, this.onMemberRemove);
    this.client.on(Events.GuildMemberAdd, this.onMemberAdd);
    this.client.on(Events.ClientReady, this.onReady);
    this.client.on(Events.GuildCreate, this.onReady);
    this.timer = setInterval(this.onReady, 15_000); this.timer.unref();
    this.onReady();
  }
  stop(): void {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    if (!this.attached) return;
    this.attached = false;
    this.client.off(Events.PresenceUpdate, this.onPresence);
    this.client.off(Events.GuildMemberUpdate, this.onMemberUpdate);
    this.client.off(Events.GuildMemberRemove, this.onMemberRemove);
    this.client.off(Events.GuildMemberAdd, this.onMemberAdd);
    this.client.off(Events.ClientReady, this.onReady);
    this.client.off(Events.GuildCreate, this.onReady);
  }
  async flush(): Promise<void> {
    while (this.pending.size || this.configQueues.size || this.sweep) await Promise.allSettled([...this.pending.values()].map(value => value.task).concat([...this.configQueues.values()].map(async task => { await task; }), this.sweep ? [this.sweep] : []));
    await this.store.flush();
  }
  async guildIds(): Promise<string[]> { return this.store.guildIds(); }
  async purgeGuild(guildId: string, guard: () => boolean = () => true): Promise<void> {
    await Promise.allSettled([...this.pending.entries()].filter(([key]) => key.startsWith(`${guildId}:`)).map(([, value]) => value.task));
    await this.store.purgeGuild(guildId, guard);
    for (const key of this.warnings.keys()) if (key.startsWith(`${guildId}:`)) this.warnings.delete(key);
  }
}
