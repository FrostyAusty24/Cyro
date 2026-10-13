import { assertNotAccessRole } from '../control/access.js';
import { PermissionFlagsBits, type Role } from 'discord.js';
import type { CommunityConfig } from './types.js';

const dangerousPermissions = [
  PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageWebhooks, PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers, PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.MentionEveryone, PermissionFlagsBits.ManageThreads, PermissionFlagsBits.ManageEvents,
  PermissionFlagsBits.ManageGuildExpressions, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers,
  PermissionFlagsBits.MoveMembers,
  PermissionFlagsBits.ManageNicknames, PermissionFlagsBits.ViewAuditLog,
];

export function assertSafeRole(role: Role): void {
  assertNotAccessRole(role.guild.id, role.id);
  if (role.id === role.guild.id || role.managed || !role.editable) throw new Error('Role is managed, @everyone, or above the bot role hierarchy.');
  if (role.permissions.any(dangerousPermissions)) throw new Error('Privileged roles cannot be automatic or self-assigned.');
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[], label: string): void {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error(`Unknown ${label} setting.`);
}
function bool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be true or false.`);
  return value;
}
function string(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== 'string' || value.length < min || value.length > max) throw new Error(`${label} must contain ${min} to ${max} characters.`);
  return value;
}
function id(value: unknown, label: string): string {
  const result = string(value, label, 17, 20);
  if (!/^\d+$/.test(result)) throw new Error(`${label} must be a Discord ID.`);
  return result;
}
function channel(value: unknown): string | null { return value === null || value === '' ? null : id(value, 'Channel'); }

export function mergeConfig(current: CommunityConfig, input: unknown): CommunityConfig {
  const patch = object(input, 'Community settings');
  keys(patch, ['counting', 'welcome', 'selfRoles', 'invites', 'levels', 'verification'], 'community');
  const next = structuredClone(current);
  if ('counting' in patch) {
    const value = object(patch.counting, 'Counting'); keys(value, ['enabled', 'channelId'], 'counting');
    if ('enabled' in value) next.counting.enabled = bool(value.enabled, 'Counting enabled');
    if ('channelId' in value) next.counting.channelId = channel(value.channelId);
  }
  if ('welcome' in patch) {
    const value = object(patch.welcome, 'Welcome'); keys(value, ['enabled', 'channelId', 'message', 'goodbyeMessage', 'autoRoleIds', 'joinFormat', 'goodbyeFormat', 'card'], 'welcome');
    if ('enabled' in value) next.welcome.enabled = bool(value.enabled, 'Welcome enabled');
    if ('channelId' in value) next.welcome.channelId = channel(value.channelId);
    if ('message' in value) next.welcome.message = string(value.message, 'Welcome message', 1, 1000);
    if ('goodbyeMessage' in value) next.welcome.goodbyeMessage = string(value.goodbyeMessage, 'Goodbye message', 0, 1000);
    // Existing guild files only have a goodbye message; keep their current behavior.
    if ('goodbyeMessage' in value && !('goodbyeFormat' in value)) next.welcome.goodbyeFormat = value.goodbyeMessage ? 'text' : 'off';
    if ('joinFormat' in value) {
      if (!['text', 'card', 'both'].includes(value.joinFormat as string)) throw new Error('Join format must be text, card, or both.');
      next.welcome.joinFormat = value.joinFormat as CommunityConfig['welcome']['joinFormat'];
    }
    if ('goodbyeFormat' in value) {
      if (!['off', 'text', 'card', 'both'].includes(value.goodbyeFormat as string)) throw new Error('Goodbye format must be off, text, card, or both.');
      next.welcome.goodbyeFormat = value.goodbyeFormat as CommunityConfig['welcome']['goodbyeFormat'];
    }
    if ('card' in value) {
      const card = object(value.card, 'Member card'); keys(card, ['joinHeading', 'leaveHeading', 'background', 'accentColor', 'bar', 'barColor', 'backgroundColor', 'textColor', 'secondaryColor', 'showAvatar', 'showDivider', 'decoration', 'nameText', 'subtitle', 'joinFooter', 'leaveFooter', 'brandText'], 'member card');
      for (const field of ['joinHeading', 'leaveHeading', 'nameText', 'subtitle', 'joinFooter', 'leaveFooter', 'brandText'] as const) {
        if (field in card) {
          const heading = string(card[field], 'Card text', 0, field === 'brandText' ? 24 : 120).trim();
          if (/[\x00-\x1f\x7f]/.test(heading)) throw new Error('Card text must be a single line.');
          next.welcome.card[field] = heading;
        }
      }
      if ('background' in card) {
        if (!['midnight', 'aurora', 'ice', 'custom'].includes(card.background as string)) throw new Error('Select a member card background.');
        next.welcome.card.background = card.background as CommunityConfig['welcome']['card']['background'];
      }
      for (const field of ['accentColor', 'barColor', 'backgroundColor', 'textColor', 'secondaryColor'] as const) {
        if (!(field in card)) continue;
        if (typeof card[field] !== 'string' || !/^#[0-9a-f]{6}$/i.test(card[field] as string)) throw new Error('Card colors must be six-digit hex colors.');
        next.welcome.card[field] = (card[field] as string).toUpperCase();
      }
      for (const field of ['showAvatar', 'showDivider', 'decoration'] as const) if (field in card) next.welcome.card[field] = bool(card[field], field);
      if ('accentColor' in card && !('barColor' in card)) next.welcome.card.barColor = next.welcome.card.accentColor;
      if ('bar' in card) {
        if (!['left', 'top', 'none'].includes(card.bar as string)) throw new Error('Select left, top, or no card bar.');
        next.welcome.card.bar = card.bar as 'left' | 'top' | 'none';
      }
    }
    if ('autoRoleIds' in value) {
      if (!Array.isArray(value.autoRoleIds) || value.autoRoleIds.length > 10) throw new Error('Select up to 10 automatic roles.');
      next.welcome.autoRoleIds = [...new Set(value.autoRoleIds.map(role => id(role, 'Role')))];
    }
  }
  if ('selfRoles' in patch) {
    const value = object(patch.selfRoles, 'Self roles'); keys(value, ['roles'], 'self roles');
    if ('roles' in value) {
      if (!Array.isArray(value.roles) || value.roles.length > 20) throw new Error('Select up to 20 self roles.');
      next.selfRoles.roles = value.roles.map(item => {
        const role = object(item, 'Self role'); keys(role, ['roleId', 'label'], 'self role');
        return { roleId: id(role.roleId, 'Role'), label: string(role.label, 'Role label', 1, 80) };
      });
      if (new Set(next.selfRoles.roles.map(role => role.roleId)).size !== next.selfRoles.roles.length) throw new Error('Self roles must be unique.');
    }
  }
  if ('invites' in patch) {
    const value = object(patch.invites, 'Invites'); keys(value, ['enabled', 'loggingEnabled', 'logChannelId', 'challengeName', 'challengeTarget'], 'invites');
    if ('enabled' in value) next.invites.enabled = bool(value.enabled, 'Invites enabled');
    if ('loggingEnabled' in value) next.invites.loggingEnabled = bool(value.loggingEnabled, 'Invite logging enabled');
    if ('logChannelId' in value) next.invites.logChannelId = channel(value.logChannelId);
    if ('challengeName' in value) next.invites.challengeName = string(value.challengeName, 'Challenge name', 1, 80);
    if ('challengeTarget' in value) {
      if (typeof value.challengeTarget !== 'number' || !Number.isInteger(value.challengeTarget) || value.challengeTarget < 1 || value.challengeTarget > 100_000) throw new Error('Invite target must be an integer from 1 to 100000.');
      next.invites.challengeTarget = value.challengeTarget;
    }
  }
  if ('levels' in patch) {
    const value = object(patch.levels, 'Levels'); keys(value, ['enabled'], 'levels');
    if ('enabled' in value) next.levels.enabled = bool(value.enabled, 'Levels enabled');
  }
  if ('verification' in patch) {
    const value = object(patch.verification, 'Verification');
    keys(value, ['enabled', 'channelId', 'roleId', 'mode', 'title', 'message'], 'verification');
    if ('enabled' in value) next.verification.enabled = bool(value.enabled, 'Verification enabled');
    if ('channelId' in value) next.verification.channelId = channel(value.channelId);
    if ('roleId' in value) next.verification.roleId = value.roleId === null || value.roleId === '' ? null : id(value.roleId, 'Verification role');
    if ('mode' in value) {
      if (value.mode !== 'reaction' && value.mode !== 'challenge') throw new Error('Verification mode must be reaction or challenge.');
      next.verification.mode = value.mode;
    }
    if ('title' in value) next.verification.title = string(value.title, 'Verification title', 1, 100);
    if ('message' in value) next.verification.message = string(value.message, 'Verification message', 1, 1500);
  }
  if (next.verification.enabled) {
    if (!next.verification.channelId || !next.verification.roleId) throw new Error('Select a verification channel and role.');
    if (next.welcome.autoRoleIds.includes(next.verification.roleId) || next.selfRoles.roles.some(role => role.roleId === next.verification.roleId)) throw new Error('The verification role cannot also be an automatic or self-assignable role.');
  }
  if (next.counting.enabled && !next.counting.channelId) throw new Error('Select a counting channel.');
  if (next.welcome.enabled && !next.welcome.channelId) throw new Error('Select a welcome channel.');
  return next;
}
