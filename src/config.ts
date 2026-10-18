import 'dotenv/config';
import path from 'node:path';
import { parseDashboardFallback, type DashboardFallbackConfig } from './dashboard/fallback-config.js';

export { parseDashboardFallback } from './dashboard/fallback-config.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AppConfig {
  discordToken: string;
  discordClientId: string;
  commandScope?: 'global' | 'development';
  developmentGuildId?: string;
  autoDeployCommands: boolean;
  twitchClientId?: string;
  twitchClientSecret?: string;
  kickClientId?: string;
  kickClientSecret?: string;
  tiktokEulerApiKey?: string;
  tiktokClientKey?: string;
  tiktokClientSecret?: string;
  youtubeApiKey?: string;
  pollIntervalSeconds: number;
  dataDir: string;
  logLevel: LogLevel;
  dashboardEnabled?: boolean;
  dashboardHost?: string;
  dashboardPort?: number;
  dashboardUrl?: string;
  discordClientSecret?: string;
  dashboardTrustProxy?: boolean;
  dashboardFallback?: DashboardFallbackConfig;
  dashboardFallbackWarning?: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function bool(name: string, fallback: boolean): boolean {
  const value = optional(name);
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function numberInRange(name: string, fallback: number, min: number, max: number): number {
  const raw = optional(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a number from ${min} to ${max}.`);
  }
  return Math.floor(value);
}

export function commandRegistrationConfig(env: NodeJS.ProcessEnv = process.env): Pick<AppConfig, 'commandScope' | 'developmentGuildId'> {
  const commandScope = env.DISCORD_COMMAND_SCOPE?.trim() || 'global';
  if (commandScope !== 'global' && commandScope !== 'development') throw new Error('DISCORD_COMMAND_SCOPE must be global or development.');
  const developmentGuildId = commandScope === 'development' ? env.DISCORD_DEV_GUILD_ID?.trim() : undefined;
  if (commandScope === 'development' && (!developmentGuildId || !/^\d{17,20}$/.test(developmentGuildId))) throw new Error('Development command registration requires a valid DISCORD_DEV_GUILD_ID.');
  return { commandScope, developmentGuildId };
}

export function loadConfig(): AppConfig {
  const logLevel = (optional('LOG_LEVEL') ?? 'info') as LogLevel;
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    throw new Error('LOG_LEVEL must be debug, info, warn, or error.');
  }
  const dashboardUrl = optional('DASHBOARD_URL') ?? 'http://localhost:3000';
  const parsedUrl = new URL(dashboardUrl);
  if ((parsedUrl.protocol !== 'https:' && !(parsedUrl.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsedUrl.hostname))) || parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash || parsedUrl.username || parsedUrl.password) {
    throw new Error('DASHBOARD_URL must be an HTTPS origin, or http://localhost:3000 for local development.');
  }
  const dashboardPort = numberInRange('PORT', numberInRange('DASHBOARD_PORT', 3000, 1, 65535), 1, 65535);
  let dashboardFallback: DashboardFallbackConfig | undefined;
  let dashboardFallbackWarning: string | undefined;
  try { dashboardFallback = parseDashboardFallback(process.env, parsedUrl.origin, dashboardPort); }
  catch {
    // A broken optional access route must not prevent Discord or the primary dashboard from starting.
    // Keep the warning fixed: URLs and file paths can contain private user-controlled values.
    dashboardFallbackWarning = 'Direct HTTPS fallback is disabled because its settings are invalid. Run check-hosting and review FALLBACK_HOSTING.md; the bot and primary dashboard can still start.';
  }

  return {
    discordToken: required('DISCORD_TOKEN'),
    discordClientId: required('DISCORD_CLIENT_ID'),
    ...commandRegistrationConfig(),
    autoDeployCommands: bool('AUTO_DEPLOY_COMMANDS', true),
    twitchClientId: optional('TWITCH_CLIENT_ID'),
    twitchClientSecret: optional('TWITCH_CLIENT_SECRET'),
    kickClientId: optional('KICK_CLIENT_ID'),
    kickClientSecret: optional('KICK_CLIENT_SECRET'),
    tiktokEulerApiKey: optional('TIKTOK_EULER_API_KEY'),
    tiktokClientKey: optional('TIKTOK_CLIENT_KEY'),
    tiktokClientSecret: optional('TIKTOK_CLIENT_SECRET'),
    youtubeApiKey: optional('YOUTUBE_API_KEY'),
    pollIntervalSeconds: numberInRange('POLL_INTERVAL_SECONDS', 60, 30, 3600),
    dataDir: path.resolve(optional('DATA_DIR') ?? './data'),
    logLevel,
    dashboardEnabled: bool('DASHBOARD_ENABLED', false),
    dashboardHost: optional('DASHBOARD_HOST') ?? '127.0.0.1',
    dashboardPort,
    dashboardUrl: parsedUrl.origin,
    discordClientSecret: optional('DISCORD_CLIENT_SECRET'),
    dashboardTrustProxy: bool('DASHBOARD_TRUST_PROXY', false),
    dashboardFallback,
    dashboardFallbackWarning,
  };
}
