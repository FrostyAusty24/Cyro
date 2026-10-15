import { BotMessageError } from '../i18n/index.js';

export const MAX_RECEIPTS = 2000;
export const MAX_PANELS = 2000;
export const INTERACTION_MAX_AGE_MS = 15 * 60_000;
export const snowflake = (value: unknown): value is string => typeof value === 'string' && /^\d{17,20}$/.test(value);
export const panelOperationId = (value: unknown): value is string => snowflake(value) || (typeof value === 'string' && /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(value));
export interface TimeClockConfig { enabled: boolean; channelId: string | null; roleIds: string[] }
export interface TimeClockMember { completedMs: number; startedAt: number | null; shifts: number; lastShiftMs: number }
export interface TimeClockRow extends TimeClockMember { userId: string; totalMs: number; activeMs: number }
export interface TimeClockReceipt { id: string; userId: string; action: 'in' | 'out'; at: number; row: TimeClockRow }
export interface TimeClockPanel { id: string; actorId: string; channelId: string; delivery: 'pending' | 'sent'; messageId?: string }
export interface TimeClockGuild { config: TimeClockConfig; members: Record<string, TimeClockMember>; receipts: TimeClockReceipt[]; panels: TimeClockPanel[] }
export const defaultTimeClockConfig = (): TimeClockConfig => ({ enabled: false, channelId: null, roleIds: [] });
export const defaultTimeClockGuild = (): TimeClockGuild => ({ config: defaultTimeClockConfig(), members: {}, receipts: [], panels: [] });
export function parseTimeClockConfig(input: unknown): TimeClockConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BotMessageError('Invalid time clock settings.');
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(key => !['enabled', 'channelId', 'roleIds'].includes(key)) || typeof value.enabled !== 'boolean' || (value.channelId !== null && !snowflake(value.channelId)) || !Array.isArray(value.roleIds) || value.roleIds.length > 50 || value.roleIds.some(id => !snowflake(id)) || new Set(value.roleIds).size !== value.roleIds.length) throw new BotMessageError('Choose a time clock channel and up to 50 member roles.');
  return { enabled: value.enabled, channelId: value.channelId as string | null, roleIds: [...value.roleIds] as string[] };
}
export const emptyTimeClockMember = (): TimeClockMember => ({ completedMs: 0, startedAt: null, shifts: 0, lastShiftMs: 0 });
export function timeClockRow(userId: string, member: TimeClockMember, now: number): TimeClockRow {
  const activeMs = member.startedAt === null ? 0 : Math.max(0, now - member.startedAt);
  return { userId, ...member, activeMs, totalMs: member.completedMs + activeMs };
}
