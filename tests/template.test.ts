import { describe, expect, it } from 'vitest';
import type { LiveSnapshot, StreamerRecord } from '../src/types.js';
import { normalizeUsername, streamUrl } from '../src/utils/normalize.js';
import { renderMessage, titleMatches } from '../src/utils/template.js';

const record: StreamerRecord = {
  id: 'one', guildId: 'guild', platform: 'twitch', username: 'example', displayName: 'Example',
  alertChannelId: 'channel', pingRoleId: 'role', cooldownSeconds: 300,
  messageTemplate: '{mention} {streamer} — {title} — {viewers} — {url}', cleanupMode: 'offline',
  enabled: true, state: 'unknown', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const snapshot: LiveSnapshot = {
  sessionId: 'session', title: 'Playing GTA V', viewerCount: 1234, url: 'https://twitch.tv/example',
};

describe('stream helpers', () => {
  it('uses the shared creator name without changing the linked platform username', () => {
    expect(renderMessage({...record,creatorName:'One Creator',messageTemplate:'{streamer} / {username}'},snapshot)).toBe('One Creator / example');
  });
  it('normalizes usernames and platform URLs', () => {
    expect(normalizeUsername('twitch', 'https://www.twitch.tv/Example/')).toBe('example');
    expect(normalizeUsername('kick', 'kick.com/Example?x=1')).toBe('example');
    expect(normalizeUsername('tiktok', '@Example')).toBe('example');
    expect(streamUrl('tiktok', 'example')).toBe('https://www.tiktok.com/@example/live');
  });

  it('renders safe, documented placeholders', () => {
    expect(renderMessage(record, snapshot)).toBe('<@&role> Example — Playing GTA V — 1,234 — https://twitch.tv/example');
  });

  it('matches title filters case-insensitively', () => {
    expect(titleMatches('gta v', 'Playing GTA V')).toBe(true);
    expect(titleMatches('minecraft', 'Playing GTA V')).toBe(false);
    expect(titleMatches(undefined, 'Anything')).toBe(true);
  });
});
