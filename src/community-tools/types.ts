import { BotMessageError } from '../i18n/index.js';
export const MAX_REPORTS = 1000;
export const snowflake = (v: unknown): v is string => typeof v === 'string' && /^\d{17,20}$/.test(v);
export const key = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9_-]{1,40}$/.test(v);
export interface BugCategory { id: string; name: string; channelId: string }
export interface StickyConfig { id: string; enabled: boolean; channelId: string; title: string; body: string; everyMessages: number; delaySeconds: number }
export interface CommunityToolsConfig { bugs: { enabled: boolean; cooldownMinutes: number; categories: BugCategory[] }; stickies: StickyConfig[] }
export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';
export interface BugReport { id: string; number: number; authorId: string; authorName: string; categoryId: string; categoryName: string; channelId: string; title: string; details: string; steps: string; createdAt: string; status: BugStatus; delivery: 'pending' | 'sent'; messageId?: string; syncPending: boolean; decision?: { actorId: string; at: string; status: BugStatus } }
export interface StickyReceipt { channelId: string; messageId?: string; previousMessageId?: string; pendingNonce?: string; lastPostedAt: number; dueAt: number; activity: number; lastActivityId?: string }
export interface CommunityToolsGuild { config: CommunityToolsConfig; nextNumber: number; reports: BugReport[]; receipts: Record<string, StickyReceipt> }
export const defaultCommunityToolsConfig = (): CommunityToolsConfig => ({ bugs: { enabled: false, cooldownMinutes: 5, categories: [] }, stickies: [] });
export const defaultCommunityToolsGuild = (): CommunityToolsGuild => ({ config: defaultCommunityToolsConfig(), nextNumber: 1, reports: [], receipts: {} });
function object(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new BotMessageError('Invalid community tools settings.'); return v as Record<string, unknown>; }
function only(v: Record<string, unknown>, fields: string[]) { if (Object.keys(v).some(k => !fields.includes(k))) throw new BotMessageError('Unknown community tools setting.'); }
function text(v: unknown, min: number, max: number, label: string): string { if (typeof v !== 'string' || v.trim().length < min || v.length > max) throw new BotMessageError(`${label} must contain {min}–{max} characters.`, { min, max }); return v.trim(); }
function integer(v: unknown, min: number, max: number, label: string): number { if (!Number.isSafeInteger(v) || (v as number) < min || (v as number) > max) throw new BotMessageError(`${label} must be between {min} and {max}.`, { min, max }); return v as number; }
export function parseCommunityToolsConfig(input: unknown): CommunityToolsConfig {
  const v = object(input); only(v, ['bugs', 'stickies']); const bugs = object(v.bugs); only(bugs, ['enabled', 'cooldownMinutes', 'categories']);
  if (typeof bugs.enabled !== 'boolean' || !Array.isArray(bugs.categories) || bugs.categories.length > 10 || !Array.isArray(v.stickies) || v.stickies.length > 10) throw new BotMessageError('Use up to 10 bug categories and 10 sticky messages.');
  const ids = new Set<string>(), names = new Set<string>();
  const categories = bugs.categories.map(raw => { const c = object(raw); only(c, ['id', 'name', 'channelId']); if (!key(c.id) || ids.has(c.id) || !snowflake(c.channelId)) throw new BotMessageError('Each bug category needs its own ID and a channel.'); const name = text(c.name, 1, 60, 'Category name'); if (names.has(name.toLocaleLowerCase())) throw new BotMessageError('Bug category names must be different.'); ids.add(c.id); names.add(name.toLocaleLowerCase()); return { id: c.id, name, channelId: c.channelId }; });
  if (bugs.enabled && !categories.length) throw new BotMessageError('Add a bug category before enabling reports.');
  ids.clear(); const channels = new Set<string>();
  const stickies = v.stickies.map(raw => { const c = object(raw); only(c, ['id', 'enabled', 'channelId', 'title', 'body', 'everyMessages', 'delaySeconds']); if (!key(c.id) || ids.has(c.id) || !snowflake(c.channelId) || channels.has(c.channelId) || typeof c.enabled !== 'boolean') throw new BotMessageError('Each sticky needs its own ID and channel. Use one sticky per channel.'); ids.add(c.id); channels.add(c.channelId); return { id: c.id, enabled: c.enabled, channelId: c.channelId, title: text(c.title, 1, 200, 'Sticky title'), body: text(c.body, 1, 3000, 'Sticky message'), everyMessages: integer(c.everyMessages, 1, 100, 'Message threshold'), delaySeconds: integer(c.delaySeconds, 30, 3600, 'Sticky delay') }; });
  return { bugs: { enabled: bugs.enabled, cooldownMinutes: integer(bugs.cooldownMinutes, 0, 1440, 'Report cooldown'), categories }, stickies };
}
export function parseBugContent(input: unknown) { const v = object(input); only(v, ['title', 'details', 'steps']); return { title: text(v.title, 1, 150, 'Title'), details: text(v.details, 1, 2000, 'Details'), steps: text(v.steps ?? '', 0, 1000, 'Steps to reproduce') }; }
export const bugStatuses: BugStatus[] = ['open', 'in_progress', 'resolved', 'dismissed'];
