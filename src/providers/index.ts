import type { AppConfig } from '../config.js';
import type { Logger } from '../logger.js';
import type { Platform } from '../types.js';
import { KickProvider } from './kick.js';
import type { StreamProvider } from './provider.js';
import { TikTokProvider } from './tiktok.js';
import { TwitchProvider } from './twitch.js';
import { YouTubeProvider } from './youtube.js';
import type { TikTokService } from '../tiktok/service.js';

export type ProviderMap = Record<Platform, StreamProvider>;

export function createProviders(config: AppConfig, logger: Logger, tiktok?: TikTokService): ProviderMap {
  return {
    twitch: new TwitchProvider(config, logger),
    kick: new KickProvider(config, logger),
    tiktok: new TikTokProvider(config, logger, tiktok),
    youtube: new YouTubeProvider(config, logger),
  };
}
