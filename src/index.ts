import path from 'node:path';
import { ControlStore } from './control/store.js';
import { setBotLocaleResolver } from './i18n/index.js';
import { AccessService, setProtectedRoleResolver } from './control/access.js';
import { PublishingService } from './control/publishing.js';
import { ActivityType, Client, Events, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import { CommandHandler } from './commands/handler.js';
import { registerCommands } from './commands/register.js';
import { loadConfig } from './config.js';
import { Logger } from './logger.js';
import { createProviders } from './providers/index.js';
import { AlertService } from './services/alert-service.js';
import { StreamMonitor } from './services/monitor.js';
import { JsonStore } from './storage/store.js';
import { CommunityService } from './community/service.js';
import { ModerationService } from './moderation/index.js';
import { DashboardServer } from './dashboard/server.js';
import { DashboardStreams } from './dashboard/streams.js';
import { GuildRetention } from './services/guild-retention.js';
import { acquireDataLock } from './storage/data-lock.js';
import { drainRuntime, startWhileActive } from './services/lifecycle.js';
import { StreamAnalytics } from './streaming/analytics.js';
import { CreatorStatistics } from './streaming/creators.js';
import { DashboardCreators } from './dashboard/creators.js';
import { TikTokService } from './tiktok/service.js';
import { DashboardTikTok } from './dashboard/tiktok.js';
import { SuggestionsService } from './suggestions/service.js';
import { StatusRoleService } from './status-roles/service.js';
import { probePresenceIntent } from './services/presence-intent.js';
import { VoiceService } from './voice/service.js';
import { ConfessionsService } from './confessions/service.js';
import { TempVoiceService } from './temp-voice/service.js';
import { CommunityToolsService } from './community-tools/service.js';
import { checkVoiceRuntime } from './voice/check.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger(config.logLevel);
  if (config.dashboardEnabled && !config.discordClientSecret) throw new Error('DASHBOARD_ENABLED requires DISCORD_CLIENT_SECRET for Discord sign-in.');
  // Check before acquiring storage ownership. Missing privileged permission must not stop the existing bot.
  const appRest = new REST({version:'10', timeout:8_000, retries:0}).setToken(config.discordToken);
  const presenceAvailable = await probePresenceIntent(() => appRest.get(Routes.currentApplication(), {signal:AbortSignal.timeout(10_000)}), config.discordClientId);
  if (!presenceAvailable) logger.warn('Status roles unavailable: enable Presence Intent for this Discord application and restart Cyro. Other features can continue.');
  // Acquire before reading any store; a second process must never load a stale independent snapshot.
  // A forced host restart may leave a fresh lock. Let proper-lockfile apply its existing stale timeout.
  const ownershipAbort = new AbortController();
  const cancelOwnershipWait = () => ownershipAbort.abort();
  process.once('SIGINT', cancelOwnershipWait);
  process.once('SIGTERM', cancelOwnershipWait);
  let releaseOwnership: () => Promise<void>;
  try {
    releaseOwnership = await acquireDataLock(config.dataDir, error => {
      logger.error('Data-folder ownership was lost. Stopping immediately to protect stored data.', error.message);
      process.exit(1);
    }, {
      waitMs: 75_000,
      signal: ownershipAbort.signal,
      onWaiting: () => logger.info('Waiting for data-folder ownership before startup (up to 75 seconds).'),
    });
  } catch (error) {
    if (ownershipAbort.signal.aborted && error instanceof Error && error.name === 'AbortError') {
      logger.info('Startup cancelled before data-folder ownership was acquired.');
      return;
    }
    throw error;
  } finally {
    process.removeListener('SIGINT', cancelOwnershipWait);
    process.removeListener('SIGTERM', cancelOwnershipWait);
  }
  const store = new JsonStore(path.join(config.dataDir, 'streamers.json'));
  const analytics = new StreamAnalytics(path.join(config.dataDir, 'stream-analytics.json'), config.pollIntervalSeconds * 3_000);
  const creatorStats = new CreatorStatistics(analytics,store);
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildInvites, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildVoiceStates, ...(presenceAvailable ? [GatewayIntentBits.GuildPresences] : [])],
    allowedMentions: { parse: [], repliedUser: false },
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
    rest: { timeout: 15_000, retries: 2 },
  });
  const tiktok = new TikTokService(config, logger);
  const providers = createProviders(config, logger, tiktok);
  const alerts = new AlertService(client, store, logger, analytics);
  const monitor = new StreamMonitor(store, providers, alerts, logger, config.pollIntervalSeconds, guildId => client.isReady() && Boolean(client.guilds.cache.get(guildId)?.available), analytics);
  const control = new ControlStore(config.dataDir);
  setBotLocaleResolver(guildId => control.get(guildId).locale);
  const access = new AccessService(control);
  setProtectedRoleResolver((guildId, roleId) => access.protectedRole(guildId, roleId));
  const publishing = new PublishingService(client, control, access);
  const commands = new CommandHandler(client, store, providers, alerts, monitor, logger, creatorStats,
    { dashboardEnabled: config.dashboardEnabled, dashboardUrl: config.dashboardUrl }, access);
  const community = new CommunityService(client, config.dataDir, logger, access);
  const moderation = new ModerationService(client, config.dataDir, logger, access);
  const suggestions = new SuggestionsService(client, config.dataDir, logger, access);
  const statusRoles = new StatusRoleService(client, config.dataDir, logger, access, presenceAvailable);
  const voice = new VoiceService(client, config.dataDir, logger, access);
  const confessions = new ConfessionsService(client, config.dataDir, logger, access);
  const tempVoice = new TempVoiceService(client, config.dataDir, logger, access);
  const communityTools = new CommunityToolsService(client, config.dataDir, logger, access);
  const retention = new GuildRetention(client, path.join(config.dataDir, 'removed-guilds.json'), [community, moderation, suggestions, statusRoles, voice, confessions, tempVoice, communityTools, control, {
    guildIds: () => store.guildIds(),
    purgeGuild: (guildId, shouldPurge) => monitor.withLock(() => store.purgeGuild(guildId, shouldPurge)),
  }, tiktok, {
    guildIds: () => analytics.guildIds(),
    purgeGuild: (guildId, shouldPurge) => monitor.withLock(() => analytics.purgeGuild(guildId, shouldPurge)),
  }], logger);
  let operational = false;
  let shuttingDown = false;
  let readyTask: Promise<void> = Promise.resolve();
  let startupTask: Promise<void> = Promise.resolve();
  const dashboardStreams = new DashboardStreams(store, providers, alerts, monitor);
  const dashboard = config.dashboardEnabled ? new DashboardServer({client, config, logger, community, moderation, suggestions, statusRoles, voice, confessions, tempVoice, communityTools, access, publishing,
    streams: dashboardStreams, creators: new DashboardCreators(store,alerts,monitor,dashboardStreams), publicDir: path.resolve('public'),
    streamStats: creatorStats,
    tiktok: new DashboardTikTok(client, store, monitor, tiktok),
    isOperational: () => operational && !shuttingDown && client.isReady()}) : undefined;

  client.once(Events.ClientReady, (readyClient) => {
    if (shuttingDown) return;
    readyTask = (async () => {
      await moderation.reconcile();
      if (shuttingDown) return;
      await Promise.all([tempVoice.reconcile(), communityTools.reconcile()]);
      if (shuttingDown) return;
      // Suggestion votes and decisions are already durable; attach repairs stale message counts in the background.
      commands.attach(); community.attach(); moderation.attach(); suggestions.attach(); statusRoles.attach(); voice.attach(); confessions.attach(); tempVoice.attach(); communityTools.attach(); retention.attach();
      readyClient.user.setActivity('your community', { type: ActivityType.Watching });
      operational = true;
      monitor.start(); retention.start();
      logger.info('Discord bot is ready.', { user: readyClient.user.tag, guilds: readyClient.guilds.cache.size });
    })();
    void readyTask.catch(error => {
      logger.error('Startup recovery failed; the dashboard remains unready.', error instanceof Error ? error.message : String(error));
      void shutdown('startup recovery failed', 1);
    });
  });

  // A Gateway interruption breaks measurement continuity even if the next poll arrives quickly.
  const interruptTracking = (guildId?: string) => {
    if (!operational || shuttingDown) return;
    void monitor.pauseTracking(guildId).catch(error => logger.error('Could not pause stream measurements.', error instanceof Error ? error.message : String(error)));
  };
  client.on(Events.ShardDisconnect, () => interruptTracking());
  client.on(Events.ShardReconnecting, () => interruptTracking());
  client.on(Events.GuildUnavailable, guild => interruptTracking(guild.id));
  client.on(Events.GuildDelete, guild => interruptTracking(guild.id));

  const shutdown = async (signal: string, exitCode = 0) => {
    if (shuttingDown) return; shuttingDown = true;
    const deadline = setTimeout(() => {
      logger.error('Shutdown exceeded 60 seconds. Incomplete durable operations will be inspected on restart.');
      process.exit(1);
    }, 60_000); deadline.unref();
    logger.info('Shutting down.', { signal });
    try {
      await drainRuntime({
        stopIntake: () => { operational = false; commands.stop(); community.stop(); moderation.stop(); suggestions.stop(); statusRoles.stop(); voice.stop(); confessions.stop(); tempVoice.stop(); communityTools.stop(); monitor.stop(); },
        stopProducers: async () => {
          await startupTask.catch(() => undefined);
          await Promise.all([dashboard?.stop(), retention.stop(), readyTask.catch(() => undefined)]);
        },
        drainHandlers: async () => { await Promise.all([commands.flush(), community.flush(), moderation.flush(), suggestions.flush(), statusRoles.flush(), voice.flush(), confessions.flush(), tempVoice.flush(), communityTools.flush()]); },
        flushStorage: () => monitor.withLock(async () => { await store.flush(); await control.flush(); await tiktok.flush(); await analytics.pauseAll(); await analytics.flush(); }),
        destroyClient: () => { client.destroy(); },
        releaseOwnership,
      });
      clearTimeout(deadline);
      process.exit(exitCode);
    } catch (error) {
      logger.error('Shutdown could not complete safely.', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (error) => logger.error('Unhandled promise rejection.', error instanceof Error ? error.message : String(error)));
  process.on('uncaughtException', (error) => {logger.error('Uncaught exception.', error.message);void shutdown('uncaughtException', 1);});

  try {
    startupTask = startWhileActive([
      () => store.init(),
      () => control.init(),
      () => tiktok.init(),
      () => Promise.all([community.init(), moderation.init(), suggestions.init(), statusRoles.init(), voice.init(), confessions.init(), tempVoice.init(), communityTools.init(), retention.init(), analytics.init()]),
      async () => { const capabilities = await checkVoiceRuntime(); voice.setRuntimeStatus(capabilities); logger.info('Voice runtime check.', capabilities); },
      async () => { if (config.autoDeployCommands) await registerCommands(config, logger); },
      async () => { if (dashboard) { await dashboard.start(); logger.info('Dashboard listening; readiness waits for Discord and recovery.', { url: config.dashboardUrl }); } },
    ], () => shuttingDown);
    await startupTask;
    if (!shuttingDown) await client.login(config.discordToken);
  } catch (error) {
    logger.error('Startup failed.', error instanceof Error ? error.message : String(error));
    await shutdown('startup failed', 1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
