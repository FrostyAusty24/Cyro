import { ActivityType } from 'discord.js';

export interface StatusRoleConfig { enabled: boolean; text: string; roleId: string | null; match: 'contains' | 'exact'; caseSensitive: boolean; offlineBehavior: 'keep' | 'remove' }
export interface Assignment { memberId: string; roleId: string; state: 'pending-add' | 'assigned' | 'pending-remove' }
export interface StatusRoleGuild { config: StatusRoleConfig; assignments: Record<string, Assignment> }
export const snowflake = (value: unknown): value is string => typeof value === 'string' && /^\d{17,20}$/.test(value);
export const assignmentKey = (memberId: string, roleId: string): string => `${memberId}:${roleId}`;
export const defaultStatusRoleConfig = (): StatusRoleConfig => ({ enabled: false, text: '', roleId: null, match: 'contains', caseSensitive: false, offlineBehavior: 'keep' });
export const defaultStatusRoleGuild = (): StatusRoleGuild => ({ config: defaultStatusRoleConfig(), assignments: {} });
export function parseStatusRoleConfig(input: unknown): StatusRoleConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid status role settings.');
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(key => !['enabled', 'text', 'roleId', 'match', 'caseSensitive', 'offlineBehavior'].includes(key)) || typeof value.enabled !== 'boolean' || typeof value.text !== 'string' || value.text.length > 128 || /[\x00-\x1f\x7f-\x9f]/.test(value.text) || (value.roleId !== null && !snowflake(value.roleId)) || !['contains', 'exact'].includes(String(value.match)) || typeof value.caseSensitive !== 'boolean' || !['keep', 'remove'].includes(String(value.offlineBehavior))) throw new Error('Choose valid status role settings and text of up to 128 characters.');
  const config = { enabled: value.enabled, text: value.text.trim(), roleId: value.roleId, match: value.match, caseSensitive: value.caseSensitive, offlineBehavior: value.offlineBehavior } as StatusRoleConfig;
  if (config.enabled && (!config.text || !config.roleId)) throw new Error('Choose a role and the custom status text before enabling status roles.');
  return config;
}
export interface VisiblePresence { status: string; activities: ReadonlyArray<{ type: number; state?: string | null; name?: string }> }
/** Unknown or hidden/offline presence is not evidence that an existing status was removed. */
export function statusMatches(config: StatusRoleConfig, presence: VisiblePresence | null | undefined): boolean | null {
  if (!presence) return null;
  if (presence.status === 'offline' || presence.status === 'invisible') return config.offlineBehavior === 'remove' ? false : null;
  if (!['online', 'idle', 'dnd'].includes(presence.status)) return null;
  const expected = config.caseSensitive ? config.text : config.text.toLocaleLowerCase('en-US');
  if (!expected) return false;
  return presence.activities.some(activity => {
    if (activity.type !== ActivityType.Custom || typeof activity.state !== 'string') return false;
    const text = config.caseSensitive ? activity.state : activity.state.toLocaleLowerCase('en-US');
    return config.match === 'exact' ? text === expected : text.includes(expected);
  });
}
