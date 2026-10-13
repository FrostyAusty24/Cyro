export interface ConfessionsConfig { enabled: boolean; channelId: string | null; cooldownSeconds: number }
/** A receipt deliberately contains neither the confession text nor its author's ID. */
export interface ConfessionReceipt {
  id: string; number: number; channelId: string; createdAt: string;
  delivery: 'pending' | 'sent'; messageId?: string;
}
export interface ConfessionsGuild { config: ConfessionsConfig; nextNumber: number; published: number; receipts: ConfessionReceipt[] }
export const MAX_RECEIPTS = 1000;
export const INTERACTION_MAX_AGE_MS = 15 * 60_000;
export const PRIVACY_NOTICE = 'Your name is omitted from the public post. Cyro does not retain confession text or author IDs in its saved history. Discord receives the original command and its author. Staff can delete posts. Cooldowns reset when Cyro restarts.';
export const defaultConfessionsConfig = (): ConfessionsConfig => ({ enabled: false, channelId: null, cooldownSeconds: 60 });
export const defaultConfessionsGuild = (): ConfessionsGuild => ({ config: defaultConfessionsConfig(), nextNumber: 1, published: 0, receipts: [] });
export const snowflake = (value: unknown): value is string => typeof value === 'string' && /^\d{17,20}$/.test(value);
export function parseConfessionsConfig(input: unknown): ConfessionsConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid confessions settings.');
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(k => !['enabled', 'channelId', 'cooldownSeconds'].includes(k)) || typeof value.enabled !== 'boolean' || (value.channelId !== null && !snowflake(value.channelId)) || !Number.isInteger(value.cooldownSeconds) || (value.cooldownSeconds as number) < 10 || (value.cooldownSeconds as number) > 3600 || (value.enabled && !value.channelId)) throw new Error('Choose a confessions channel and a cooldown from 10 to 3,600 seconds.');
  return { enabled: value.enabled, channelId: value.channelId as string | null, cooldownSeconds: value.cooldownSeconds as number };
}
