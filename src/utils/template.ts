import type { LiveSnapshot, StreamerRecord } from '../types.js';

export const DEFAULT_MESSAGE_TEMPLATE = '{mention} 🔴 **{streamer} is LIVE on {platform}!**\n{url}';

const PLACEHOLDERS = ['streamer', 'username', 'platform', 'url', 'title', 'category', 'viewers', 'mention'] as const;

export function renderMessage(record: StreamerRecord, snapshot: LiveSnapshot): string {
  const values: Record<(typeof PLACEHOLDERS)[number], string> = {
    streamer: record.creatorName || record.displayName,
    username: record.username,
    platform: record.platform[0]!.toUpperCase() + record.platform.slice(1),
    url: snapshot.url,
    title: snapshot.title || 'Untitled stream',
    category: snapshot.category || 'No category',
    viewers: snapshot.viewerCount?.toLocaleString() ?? 'Unknown',
    mention: record.pingRoleId ? `<@&${record.pingRoleId}>` : '',
  };
  return record.messageTemplate.replace(/\{(streamer|username|platform|url|title|category|viewers|mention)\}/g, (_, key: keyof typeof values) => values[key]);
}

export function titleMatches(filter: string | undefined, title: string): boolean {
  if (!filter?.trim()) return true;
  return title.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase());
}

export function supportedPlaceholders(): string {
  return PLACEHOLDERS.map((name) => `{${name}}`).join(', ');
}
