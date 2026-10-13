import { PermissionFlagsBits, type Guild, type GuildMember } from 'discord.js';
import { ControlStore, parseAccess, type AccessConfig } from './store.js';

export class AccessService {
  constructor(readonly store: ControlStore) {}
  config(guildId: string): AccessConfig { return this.store.get(guildId).access; }
  protectedRole(guildId: string, roleId: string): boolean {
    const c = this.config(guildId); return c.dashboardRoleIds.includes(roleId) || Object.values(c.commandRoles).some(ids => ids.includes(roleId));
  }
  async member(guild: Guild, userId: string): Promise<GuildMember> {
    const member = await guild.members.fetch({ user: userId, force: true }); await guild.roles.fetch();
    if (member.pending) throw new Error('Complete server membership screening first.');
    return member;
  }
  canDashboard(member: GuildMember): boolean {
    const c = this.config(member.guild.id);
    return member.id === member.guild.ownerId || (c.managerAccess && member.permissions.has(PermissionFlagsBits.ManageGuild)) || c.dashboardRoleIds.some(id => member.roles.cache.has(id));
  }
  async dashboard(guild: Guild, userId: string): Promise<GuildMember> {
    const member = await this.member(guild, userId);
    if (!this.canDashboard(member)) throw new Error('The server owner has not granted your roles dashboard access.');
    return member;
  }
  async command(guild: Guild, userId: string, name: string, defaultAllowed: boolean): Promise<void> {
    const member = await this.member(guild, userId);
    this.commandMember(member, name, defaultAllowed);
  }
  /** Modal-opening commands use the member roles supplied with the interaction, without delaying the initial response. */
  commandMember(member: GuildMember, name: string, defaultAllowed: boolean): void {
    if (member.pending) throw new Error('Complete server membership screening first.');
    if (member.id === member.guild.ownerId) return;
    const roles = this.config(member.guild.id).commandRoles[name] ?? [];
    const managerCommands = ['twitch','kick','youtube','tiktok','streamalerts','roles-panel','poll','embed'];
    const baseline = managerCommands.includes(name) ? member.permissions.has(PermissionFlagsBits.ManageGuild) : defaultAllowed;
    const allowed = roles.length ? roles.some(id => member.roles.cache.has(id)) : name === 'dashboard' ? this.canDashboard(member) : baseline;
    if (!allowed) throw new Error('Your roles cannot use this command. Ask the server owner to review Access & commands.');
  }
  async update(guild: Guild, userId: string, input: unknown): Promise<AccessConfig> {
    await this.member(guild, userId);
    // Fetch the guild itself so an ownership transfer invalidates an old owner's authority.
    await guild.fetch();
    if (guild.ownerId !== userId) throw new Error('Only the current server owner can change access settings.');
    const config = parseAccess(input);
    for (const id of new Set([...config.dashboardRoleIds, ...Object.values(config.commandRoles).flat()])) {
      const role = guild.roles.cache.get(id);
      if (!role || role.id === guild.id || role.managed) throw new Error('Access roles must be regular roles belonging to this server.');
    }
    return this.store.mutate(guild.id, value => { value.access = config; return config; });
  }
}

// One process owns one bot. All automatic role-grant paths use the same access-role guard.
let protectedRole: (guildId: string, roleId: string) => boolean = () => false;
export function setProtectedRoleResolver(resolver: typeof protectedRole): void { protectedRole = resolver; }
export function assertNotAccessRole(guildId: string, roleId: string): void {
  if (protectedRole(guildId, roleId)) throw new Error('Dashboard and command access roles cannot be granted automatically, by verification, applications, streams, or self-role buttons.');
}
