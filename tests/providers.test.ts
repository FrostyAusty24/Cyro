import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../src/config.js';
import { Logger } from '../src/logger.js';
import { KickProvider } from '../src/providers/kick.js';
import { TwitchProvider } from '../src/providers/twitch.js';
import type { StreamerRecord } from '../src/types.js';

const baseConfig: AppConfig = {
  discordToken: 'discord-token',
  discordClientId: 'discord-client',
  autoDeployCommands: false,
  pollIntervalSeconds: 60,
  dataDir: './data',
  logLevel: 'error',
};
const logger = new Logger('error');

function record(platform: 'twitch' | 'kick', username: string, platformUserId: string): StreamerRecord {
  return {
    id: `${platform}-record`, guildId: 'guild', platform, username, displayName: username,
    platformUserId, alertChannelId: 'channel', cooldownSeconds: 300, messageTemplate: '{url}',
    cleanupMode: 'offline', enabled: true, state: 'unknown',
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('official platform providers', () => {
  it('resolves and maps Twitch live stream responses', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('id.twitch.tv')) return Response.json({ access_token: 'token', expires_in: 3600 });
      if (url.includes('/users?')) return Response.json({ data: [{ id: '42', login: 'example', display_name: 'Example', profile_image_url: 'https://img/avatar.png' }] });
      if (url.includes('/streams?')) return Response.json({ data: [{
        id: 'stream-1', user_id: '42', user_login: 'example', user_name: 'Example', game_name: 'GTA V',
        title: 'Live now', viewer_count: 321, started_at: '2026-01-01T00:00:00Z',
        thumbnail_url: 'https://img/{width}x{height}.jpg',
      }] });
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const provider = new TwitchProvider({ ...baseConfig, twitchClientId: 'client', twitchClientSecret: 'secret' }, logger);

    await expect(provider.resolve('example')).resolves.toMatchObject({ platformUserId: '42', displayName: 'Example' });
    const result = (await provider.checkMany([record('twitch', 'example', '42')])).get('twitch-record');
    expect(result).toMatchObject({ kind: 'live', snapshot: { sessionId: 'stream-1', viewerCount: 321, category: 'GTA V' } });
  });

  it('resolves and maps Kick channel responses', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('id.kick.com')) return Response.json({ access_token: 'token', expires_in: 3600 });
      if (url.includes('/public/v1/channels')) {
        return Response.json({ data: [{
          broadcaster_user_id: 77,
          slug: 'example',
          stream_title: 'Kick stream',
          category: { name: 'Just Chatting' },
          stream: null,
        }] });
      }
      if (url.includes('/public/v1/users/livestreams')) return Response.json({ data: [{
        id: 'kick-stream-1',
        broadcaster_user: { id: 77, username: 'Example', profile_picture: 'https://img/avatar.jpg' },
        channel: { slug: 'example' },
        category: { name: 'Just Chatting' },
        title: 'Kick stream',
        thumbnail: 'https://img/kick.jpg',
        viewer_count: 88,
        started_at: '2026-01-01T00:00:00Z',
      }] });
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const provider = new KickProvider({ ...baseConfig, kickClientId: 'client', kickClientSecret: 'secret' }, logger);

    await expect(provider.resolve('example')).resolves.toMatchObject({ platformUserId: '77', username: 'example' });
    const result = (await provider.checkMany([record('kick', 'example', '77')])).get('kick-record');
    expect(result).toMatchObject({ kind: 'live', snapshot: { viewerCount: 88, category: 'Just Chatting' } });
  });
});
