import { BotMessageError } from '../i18n/index.js';
export interface SuggestionsConfig { enabled: boolean; channelId: string | null; cooldownMinutes: number }
export type SuggestionStatus = 'open' | 'accepted' | 'declined' | 'closed';
export type VoteChoice = 'up' | 'down' | null;
export interface SuggestionDecision { actorId: string; status: Exclude<SuggestionStatus, 'open'>; reason: string; at: string }
export interface SuggestionRecord {
  id: string; number: number; authorId: string; authorName: string; text: string; channelId: string;
  createdAt: string; status: SuggestionStatus; delivery: 'pending' | 'sent'; messageId?: string;
  syncPending: boolean; decision?: SuggestionDecision;
  votes: Record<string, { choice: VoteChoice; interactionId: string }>;
}
export interface SuggestionsGuild { config: SuggestionsConfig; nextNumber: number; items: SuggestionRecord[] }
export const MAX_HISTORY = 1000;
export const MAX_VOTERS = 10000;
export const defaultSuggestionsConfig = (): SuggestionsConfig => ({ enabled: false, channelId: null, cooldownMinutes: 5 });
export const defaultSuggestionsGuild = (): SuggestionsGuild => ({ config: defaultSuggestionsConfig(), nextNumber: 1, items: [] });
export const snowflake = (value: unknown): value is string => typeof value === 'string' && /^\d{17,20}$/.test(value);
export function parseSuggestionsConfig(input: unknown): SuggestionsConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new BotMessageError('Invalid suggestions settings.');
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(k => !['enabled', 'channelId', 'cooldownMinutes'].includes(k)) || typeof value.enabled !== 'boolean' || (value.channelId !== null && !snowflake(value.channelId)) || !Number.isInteger(value.cooldownMinutes) || (value.cooldownMinutes as number) < 0 || (value.cooldownMinutes as number) > 1440 || (value.enabled && !value.channelId)) throw new BotMessageError('Choose a suggestions channel and a cooldown from 0 to 1,440 minutes.');
  return { enabled: value.enabled, channelId: value.channelId as string | null, cooldownMinutes: value.cooldownMinutes as number };
}
export function suggestionSummary(guildId: string, record: SuggestionRecord) {
  const { votes, ...safe } = structuredClone(record);
  const upVotes = Object.values(votes).filter(v => v.choice === 'up').length;
  const downVotes = Object.values(votes).filter(v => v.choice === 'down').length;
  return { ...safe, upVotes, downVotes, score: upVotes - downVotes, ...(record.messageId ? { messageUrl: `https://discord.com/channels/${guildId}/${record.channelId}/${record.messageId}` } : {}) };
}
