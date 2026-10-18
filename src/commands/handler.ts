import type { AccessService } from '../control/access.js';
import { randomUUID } from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  escapeMarkdown,
  Events,
  MessageFlags,
  PermissionFlagsBits,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type Guild,
  type Interaction,
  type Role,
} from 'discord.js';
import type { Logger } from '../logger.js';
import type { AppConfig } from '../config.js';
import type { ProviderMap } from '../providers/index.js';
import type { JsonStore } from '../storage/store.js';
import { PLATFORMS, type CleanupMode, type Platform, type StreamerRecord } from '../types.js';
import { normalizeUsername } from '../utils/normalize.js';
import { DEFAULT_MESSAGE_TEMPLATE, supportedPlaceholders } from '../utils/template.js';
import type { AlertService } from '../services/alert-service.js';
import type { StreamMonitor } from '../services/monitor.js';
import { assertSafeRole } from '../community/config.js';
import type { StreamAnalytics } from '../streaming/analytics.js';
import type { CreatorAnalyticsSnapshot } from '../streaming/creators.js';
import { botText, botError, botNumber, BotMessageError, type TextParams } from '../i18n/index.js';

export class CommandHandler {
  private attached = false;
  private stopped = false;
  private readonly active = new Set<Promise<void>>();
  constructor(
    private readonly client: Client,
    private readonly store: JsonStore,
    private readonly providers: ProviderMap,
    private readonly alerts: AlertService,
    private readonly monitor: StreamMonitor,
    private readonly logger: Logger,
    private readonly analytics?: {snapshot(guildId:string):Promise<Awaited<ReturnType<StreamAnalytics['snapshot']>> & Partial<Pick<CreatorAnalyticsSnapshot,'creatorLeaderboards'>>>},
    private readonly dashboardConfig?: Pick<AppConfig, 'dashboardEnabled' | 'dashboardUrl'> & { getFallbackUrl?: () => string | undefined },
    private readonly access?: AccessService,
  ) {}

  attach(): void {
    if (this.attached || this.stopped) return;
    this.attached = true;
    this.client.on(Events.InteractionCreate, this.onInteraction);
  }

  stop(): void {
    this.stopped = true;
    this.attached = false;
    this.client.off(Events.InteractionCreate, this.onInteraction);
  }

  async flush(): Promise<void> {
    while (this.active.size) await Promise.allSettled([...this.active]);
  }

  private readonly onInteraction = (interaction: Interaction): void => {
    if (this.stopped) return;
    const task = this.handleInteraction(interaction).catch(error => {
      this.logger.error('Command response failed.', error instanceof Error ? error.message : error);
    });
    this.active.add(task);
    void task.then(() => this.active.delete(task));
  };

  private async handleInteraction(interaction: Interaction): Promise<void> {
    if (!interaction.isAutocomplete() && !interaction.isChatInputCommand()) return;
    if (!['help', 'ping', 'streamalerts', 'streamer-leaderboard', 'dashboard', 'poll', 'embed'].includes(interaction.commandName) && !PLATFORMS.includes(interaction.commandName as Platform)) return;
    try {
      if (interaction.isAutocomplete()) await this.autocomplete(interaction);
      else if (interaction.isChatInputCommand()) await this.execute(interaction);
    } catch (error) {
      this.logger.error('Command handler failed.', error instanceof Error ? error.message : error);
      if (interaction.isRepliable() && !interaction.replied) {
        const content = `❌ ${botError(interaction.guildId, error, interaction.locale)}`;
        if (interaction.deferred) await interaction.editReply({ content });
        else await interaction.reply({ content, flags: MessageFlags.Ephemeral });
      }
    }
  }

  private async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) throw new Error('This command can only be used in a Discord server.');
    if (interaction.commandName === 'help' || interaction.commandName === 'ping') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      if (interaction.commandName === 'help') await this.help(interaction);
      else await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x6dc9ed).setTitle(botText(interaction.guildId, 'Cyro is connected', {}, interaction.locale)).setDescription(botText(interaction.guildId, 'Discord connection: {latency}.\nUse /help for commands or /dashboard to open server settings.', { latency: this.client.ws.ping >= 0 ? `${Math.round(this.client.ws.ping)} ms` : botText(interaction.guildId, 'warming up', {}, interaction.locale) }, interaction.locale))], allowedMentions: { parse: [] } });
      return;
    }
    if (interaction.commandName === 'streamer-leaderboard') {
      await interaction.deferReply();
      await this.access?.command(interaction.guild, interaction.user.id, interaction.commandName, true);
      await this.streamerLeaderboard(interaction);
      return;
    }
    if (!this.access && !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) throw new Error('You need Manage Server permission.');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (this.access) await this.access.command(interaction.guild, interaction.user.id, interaction.commandName, interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild));
    else if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) throw new Error('You need Manage Server permission.');

    if (['dashboard', 'poll', 'embed'].includes(interaction.commandName)) {
      await this.openDashboard(interaction);
      return;
    }
    if (interaction.commandName === 'streamalerts') {
      await this.streamAlerts(interaction);
      return;
    }
    if (!PLATFORMS.includes(interaction.commandName as Platform)) return;
    const subcommand = interaction.options.getSubcommand();
    if (['add', 'edit', 'clear', 'toggle', 'remove'].includes(subcommand)) {
      await this.monitor.withLock(() => this.platform(interaction, interaction.commandName as Platform));
    } else {
      await this.platform(interaction, interaction.commandName as Platform);
    }
  }

  private async help(interaction: ChatInputCommandInteraction<'cached'>): Promise<void> {
    const embed = new EmbedBuilder().setColor(0x6dc9ed).setTitle(botText(interaction.guildId, 'Welcome to Cyro', {}, interaction.locale))
      .setDescription(botText(interaction.guildId, '**Start with /dashboard** to choose this server’s channels, roles and features. Only people granted dashboard access can edit settings. Features must be enabled by your server first.', {}, interaction.locale))
      .addFields(
        { name: botText(interaction.guildId, 'Make yourself heard', {}, interaction.locale), value: botText(interaction.guildId, '`/suggestion` — suggest an idea for members to vote on.\n`/bugreport` — report a bot or server problem to the configured team.\n`/confess` — post anonymously in the confession channel.', {}, interaction.locale) },
        { name: botText(interaction.guildId, 'Voice rooms, music & TTS', {}, interaction.locale), value: botText(interaction.guildId, 'Join the server’s temporary-room lobby to get a room. Use `/room` to lock it, rename it or permit a member.\n`/playmusic` queues a supported link. `/addtts` speaks new messages in your call’s chat. `/ttsvoice` chooses your voice. `/stoptts` stops it.', {}, interaction.locale) },
        { name: botText(interaction.guildId, 'Community & support', {}, interaction.locale), value: botText(interaction.guildId, 'Use the server’s ticket or application panel to get help or apply. `/rank`, `/leaderboard` and `/invites` show community activity. Staff can use `/staff-leaderboard`.', {}, interaction.locale) },
        { name: botText(interaction.guildId, 'For server staff', {}, interaction.locale), value: botText(interaction.guildId, '`/dashboard` manages creator alerts, moderation, welcome cards, verification, tickets, applications, sticky messages, polls and more. `/poll` opens the poll builder; `/embed` opens the message composer.', {}, interaction.locale) },
        { name: botText(interaction.guildId, 'Time clock', {}, interaction.locale), value: botText(interaction.guildId, 'Use the clock-in panel or `/time in` and `/time out` to track a shift. `/time me` shows your own total. Staff can use `/time clock` to see everyone’s time.', {}, interaction.locale) },
      ).setFooter({ text: botText(interaction.guildId, 'Cyro by Headache Development · Say it “k-eye-row”.', {}, interaction.locale) });
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setLabel(botText(interaction.guildId, 'Support community', {}, interaction.locale)).setStyle(ButtonStyle.Link).setURL('https://discord.gg/dAZheerkkD'));
    if (this.dashboardConfig?.dashboardEnabled && this.dashboardConfig.dashboardUrl) {
      const url = new URL('/', this.dashboardConfig.dashboardUrl); url.searchParams.set('guild', interaction.guildId); url.hash = 'help';
      buttons.addComponents(new ButtonBuilder().setLabel(botText(interaction.guildId, 'Open dashboard', {}, interaction.locale)).setStyle(ButtonStyle.Link).setURL(url.toString()));
    }
    await interaction.editReply({ embeds: [embed], components: [buttons], allowedMentions: { parse: [] } });
  }

  private async openDashboard(interaction: ChatInputCommandInteraction<'cached'>): Promise<void> {
    if (!this.dashboardConfig?.dashboardEnabled || !this.dashboardConfig.dashboardUrl) {
      throw new Error(botText(interaction.guildId, 'The dashboard is not enabled. Ask the bot owner to configure it.', {}, interaction.locale));
    }
    const url = new URL('/', this.dashboardConfig.dashboardUrl);
    url.searchParams.set('guild', interaction.guildId);
    if (interaction.commandName === 'poll') url.hash = 'polls';
    if (interaction.commandName === 'embed') url.hash = 'messages';
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const embed = new EmbedBuilder().setColor(0x32c9ff).setTitle(botText(interaction.guildId, 'Cyro dashboard', {}, interaction.locale))
      .setDescription(botText(interaction.guildId, 'Open this server’s settings to manage creators, stream alerts, moderation, counting, tickets, and more. Sign in with a Discord account granted dashboard access by the server owner.', {}, interaction.locale)
        + (local ? botText(interaction.guildId, '\n\n**Local hosting:** open this link on the computer running Cyro. A public dashboard address is needed for access from other devices.', {}, interaction.locale) : ''));
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setLabel(botText(interaction.guildId, 'Open dashboard', {}, interaction.locale)).setStyle(ButtonStyle.Link).setURL(url.toString()),
    );
    const fallbackOrigin = this.dashboardConfig.getFallbackUrl?.();
    if (fallbackOrigin) {
      const fallback = new URL('/', fallbackOrigin);
      fallback.search = url.search;
      fallback.hash = url.hash;
      row.addComponents(new ButtonBuilder().setLabel(botText(interaction.guildId, 'Backup dashboard', {}, interaction.locale)).setStyle(ButtonStyle.Link).setURL(fallback.toString()));
    }
    await interaction.editReply({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
  }

  private async platform(interaction: ChatInputCommandInteraction<'cached'>, platform: Platform): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'add') await this.add(interaction, platform);
    else if (subcommand === 'edit') await this.edit(interaction, platform);
    else if (subcommand === 'clear') await this.clear(interaction, platform);
    else if (subcommand === 'toggle') await this.toggle(interaction, platform);
    else if (subcommand === 'remove') await this.remove(interaction, platform);
    else if (subcommand === 'list') await this.list(interaction, platform);
    else if (subcommand === 'test') await this.test(interaction, platform);
    else if (subcommand === 'check') await this.check(interaction, platform);
  }

  private translator(interaction: ChatInputCommandInteraction<'cached'>, shared = false) {
    return (source: string, params: TextParams = {}) => botText(interaction.guildId, source, params, shared ? interaction.guild.preferredLocale : interaction.locale);
  }

  private async streamerLeaderboard(interaction: ChatInputCommandInteraction<'cached'>): Promise<void> {
    const t = this.translator(interaction, true);
    if (!this.analytics) throw new Error('Streamer statistics are not available yet.');
    const period = interaction.options.getString('period') ?? '7d';
    const sort = interaction.options.getString('sort') ?? 'time';
    if (!['7d','30d','all'].includes(period) || !['time','viewers','followers'].includes(sort)) throw new Error('Choose a valid leaderboard period and sort.');
    const data = await this.analytics.snapshot(interaction.guildId);
    const rows = [...(data.creatorLeaderboards??data.leaderboards)[period as '7d' | '30d' | 'all']];
    const metric = (entry: typeof rows[number]) => sort === 'viewers' ? entry.averageViewers : sort === 'followers' ? entry.followersGained : entry.trackedMilliseconds;
    rows.sort((a,b) => (metric(b) ?? -Infinity) - (metric(a) ?? -Infinity) || b.trackedMilliseconds-a.trackedMilliseconds || a.streamerId.localeCompare(b.streamerId));
    const number = (value: number | null) => value === null ? t('Unavailable') : botNumber(interaction.guildId,value,interaction.guild.preferredLocale,{maximumFractionDigits:1});
    const lines = rows.slice(0,10).map((entry,index) => {
      const minutes = Math.floor(entry.trackedMilliseconds/60_000);
      const platforms='platforms' in entry?(entry as {platforms:string[]}).platforms.join(', '):entry.platform;
      return t('**{rank}. {name}** · {platforms}\n{hours}h {minutes}m platform time · Avg viewers: {average} · Peak: {peak} · Net followers: {followers}', {rank:index+1,name:escapeMarkdown(entry.displayName).slice(0,80),platforms,hours:Math.floor(minutes/60),minutes:minutes%60,average:number(entry.averageViewers),peak:number(entry.peakViewers),followers:(entry.followersGained !== null && entry.followersGained > 0 ? '+' : '')+number(entry.followersGained)});
    });
    const label = period === 'all' ? t('Retained 90-day history') : t('Last {days} UTC days',{days:period === '7d' ? 7 : 30});
    const embed = new EmbedBuilder().setColor(0x36c98f).setTitle(t('Streamer leaderboard · {period}',{period:label}))
      .setDescription(lines.length ? lines.join('\n\n').slice(0,4096) : t('No measured announced streams yet. Statistics begin after a real announcement and two confirmed live checks.'))
      .setFooter({text:t('Time adds linked accounts, including simulcasts. Weighted average; peak is the highest single-platform sample. Coverage and breakdown in dashboard.')});
    await interaction.editReply({embeds:[embed],allowedMentions:{parse:[]}});
  }

  private async add(interaction: ChatInputCommandInteraction<'cached'>, platform: Platform): Promise<void> {
    const provider = this.providers[platform];
    if (!provider.isConfigured()) throw new Error(provider.configurationHint());
    const username = normalizeUsername(platform, interaction.options.getString('username', true));
    const existing = await this.store.forGuild(interaction.guildId, platform);
    if (existing.some((record) => record.username.toLowerCase() === username)) {
      throw new BotMessageError('{name} is already configured. Use /{platform} edit instead.',{name:username,platform});
    }
    const resolved = await provider.resolve(username);
    if (resolved.platformUserId && existing.some((record) => record.platformUserId === resolved.platformUserId)) {
      throw new BotMessageError('{name} is already configured. Use /{platform} edit instead.',{name:resolved.displayName,platform});
    }
    const now = new Date().toISOString();
    const record: StreamerRecord = {
      id: randomUUID(),
      guildId: interaction.guildId,
      platform,
      ...resolved,
      alertChannelId: interaction.options.getChannel('channel', true).id,
      pingRoleId: interaction.options.getRole('ping-role')?.id,
      liveRoleId: interaction.options.getRole('live-role')?.id,
      discordMemberId: interaction.options.getUser('discord-member')?.id,
      titleFilter: interaction.options.getString('title-filter')?.trim() || undefined,
      cooldownSeconds: (interaction.options.getInteger('cooldown-minutes') ?? 5) * 60,
      messageTemplate: interaction.options.getString('message')?.trim() || DEFAULT_MESSAGE_TEMPLATE,
      cleanupMode: (interaction.options.getString('cleanup') ?? 'offline') as CleanupMode,
      enabled: true,
      state: 'unknown',
      createdAt: now,
      updatedAt: now,
    };
    const creatorId=interaction.options.getString('creator');
    if(creatorId){const creator=await this.selectedCreator(interaction.guildId,creatorId);record.creatorId=creator.id;record.discordMemberId=creator.discordMemberId;}
    await this.validateConfiguration(interaction.guild, record);
    const saved = await this.store.add(record);
    await interaction.editReply({ embeds: [this.savedEmbed(saved, 'Added {name}', interaction.locale)] });
  }

  private async edit(interaction: ChatInputCommandInteraction<'cached'>, platform: Platform): Promise<void> {
    const before = await this.selected(interaction, platform);
    const patch: Partial<StreamerRecord> = {};
    const channel = interaction.options.getChannel('channel');
    const pingRole = interaction.options.getRole('ping-role');
    const liveRole = interaction.options.getRole('live-role');
    const member = interaction.options.getUser('discord-member');
    const filter = interaction.options.getString('title-filter');
    const cooldown = interaction.options.getInteger('cooldown-minutes');
    const message = interaction.options.getString('message');
    const cleanup = interaction.options.getString('cleanup');
    if (channel) patch.alertChannelId = channel.id;
    if (pingRole) patch.pingRoleId = pingRole.id;
    if (liveRole) patch.liveRoleId = liveRole.id;
    if (member) patch.discordMemberId = member.id;
    if (filter !== null) patch.titleFilter = filter.trim() || undefined;
    if (cooldown !== null) patch.cooldownSeconds = cooldown * 60;
    if (message !== null) patch.messageTemplate = message.trim() || DEFAULT_MESSAGE_TEMPLATE;
    if (cleanup) patch.cleanupMode = cleanup as CleanupMode;
    const creatorId=interaction.options.getString('creator');
    if(creatorId){const creator=await this.selectedCreator(interaction.guildId,creatorId);patch.creatorId=creator.id;patch.discordMemberId=creator.discordMemberId;}
    else if(member)await this.assertSingleAccountMemberEdit(before);
    if (!Object.keys(patch).length) throw new Error('Choose at least one setting to edit.');

    const candidate = { ...before, ...patch };
    await this.validateConfiguration(interaction.guild, candidate);
    const after = await this.store.update(before.id, patch);
    await this.alerts.reconcileEdit(before, after);
    await interaction.editReply({ embeds: [this.savedEmbed(after, 'Updated {name}', interaction.locale)] });
  }

  private async clear(interaction: ChatInputCommandInteraction<'cached'>, platform: Platform): Promise<void> {
    const before = await this.selected(interaction, platform);
    const setting = interaction.options.getString('setting', true);
    const patch: Partial<StreamerRecord> = {};
    if (setting === 'ping-role') patch.pingRoleId = undefined;
    else if (setting === 'live-role') patch.liveRoleId = undefined;
    else if (setting === 'discord-member') {await this.assertSingleAccountMemberEdit(before);patch.discordMemberId = undefined;}
    else if (setting === 'title-filter') patch.titleFilter = undefined;
    else if (setting === 'message') patch.messageTemplate = DEFAULT_MESSAGE_TEMPLATE;
    const after = await this.store.update(before.id, patch);
    await this.alerts.reconcileEdit(before, after);
    await interaction.editReply({ embeds: [this.savedEmbed(after, 'Cleared setting for {name}', interaction.locale)] });
  }

  private async toggle(interaction: ChatInputCommandInteraction<'cached'>, platform: Platform): Promise<void> {
    const before = await this.selected(interaction, platform);
    const enabled = interaction.options.getBoolean('enabled', true);
    if (enabled) await this.validateConfiguration(interaction.guild, before);
    if (!enabled && before.state === 'live') await this.alerts.markOffline(before);
    const after = await this.store.update(before.id, { enabled, ...(enabled ? {} : { state: 'offline' as const }) });
    await interaction.editReply({ content: this.translator(interaction)(enabled ? '✅ Enabled **{name}**.' : '⏸️ Paused **{name}**.',{name:after.displayName}) });
  }

  private async remove(interaction: ChatInputCommandInteraction<'cached'>, platform: Platform): Promise<void> {
    const record = await this.selected(interaction, platform);
    await this.alerts.retire(record);
    await this.store.remove(record.id);
    await interaction.editReply({ content: this.translator(interaction)('🗑️ Removed **{name}** from {platform} alerts.',{name:record.displayName,platform}) });
  }

  private async list(interaction: ChatInputCommandInteraction<'cached'>, platform: Platform): Promise<void> {
    const t = this.translator(interaction);
    const records = await this.store.forGuild(interaction.guildId, platform);
    if (!records.length) {
      await interaction.editReply({ content: t('No {platform} streamers are configured. Use **/{platform} add** to add one.',{platform}) });
      return;
    }
    const shown = records.slice(0, 50);
    const lines = shown.map((record) => {
      const status = !record.enabled ? '⏸️' : record.state === 'live' ? '🔴' : record.state === 'offline' ? '⚫' : '❔';
      const roles = [record.pingRoleId ? t('ping <@&{role}>',{role:record.pingRoleId}) : '', record.liveRoleId ? t('live <@&{role}>',{role:record.liveRoleId}) : ''].filter(Boolean).join(' • ');
      return t('{status} **{name}** → <#{channel}>\n{roles} • cleanup: `{cleanup}` • cooldown: {minutes}m',{status,name:record.displayName,channel:record.alertChannelId,roles:roles||t('No roles'),cleanup:t(record.cleanupMode),minutes:record.cooldownSeconds/60});
    });
    const embed = new EmbedBuilder()
      .setColor(0x2b8cff)
      .setTitle(t('{platform} streamers ({count})',{platform:platform[0]!.toUpperCase()+platform.slice(1),count:records.length}))
      .setDescription(lines.join('\n\n').slice(0, 4096))
      .setFooter({ text: records.length > shown.length ? t('Showing first {count}',{count:shown.length}) : t('🔴 live • ⚫ offline • ❔ not checked • ⏸️ paused') });
    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  }

  private async test(interaction: ChatInputCommandInteraction<'cached'>, platform: Platform): Promise<void> {
    const record = await this.selected(interaction, platform);
    const message = await this.alerts.testAlert(record);
    await interaction.editReply({ content: this.translator(interaction)('✅ Test alert posted in <#{channel}>: {url}',{channel:record.alertChannelId,url:message.url}) });
  }

  private async check(interaction: ChatInputCommandInteraction<'cached'>, platform: Platform): Promise<void> {
    const id = interaction.options.getString('streamer') || undefined;
    if (id) await this.assertRecord(id, interaction.guildId, platform);
    const summary = await this.monitor.check({ guildId: interaction.guildId, platform, recordId: id, includeDisabled: Boolean(id) });
    await interaction.editReply({ content: this.summaryText(summary,interaction) });
  }

  private async streamAlerts(interaction: ChatInputCommandInteraction<'cached'>): Promise<void> {
    const t = this.translator(interaction);
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'check') {
      const summary = await this.monitor.check({ guildId: interaction.guildId });
      await interaction.editReply({ content: this.summaryText(summary,interaction) });
      return;
    }
    const records = await this.store.forGuild(interaction.guildId);
    const counts = PLATFORMS.map((platform) => {
      const provider = this.providers[platform];
      const count = records.filter((record) => record.platform === platform).length;
      const state = provider.isConfigured() ? t('✅ ready') : `❌ ${t(provider.configurationHint())}`;
      const caveat = platform === 'tiktok' ? t(' (best effort)') : '';
      return t('**{platform}:** {state}{caveat} • {count} configured',{platform:platform[0]!.toUpperCase()+platform.slice(1),state,caveat,count});
    });
    const live = records.filter((record) => record.enabled && record.state === 'live').length;
    const embed = new EmbedBuilder()
      .setColor(0x2b8cff)
      .setTitle(t('Stream Alerts status'))
      .setDescription(counts.join('\n'))
      .addFields(
        { name: t('Tracked'), value: String(records.length), inline: true },
        { name: t('Live now'), value: String(live), inline: true },
        { name: t('Paused'), value: String(records.filter((record) => !record.enabled).length), inline: true },
      )
      .setFooter({ text: t('Message placeholders: {placeholders}',{placeholders:supportedPlaceholders()}) });
    await interaction.editReply({ embeds: [embed] });
  }

  private async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    if (!interaction.inGuild() || !PLATFORMS.includes(interaction.commandName as Platform)) {
      await interaction.respond([]);
      return;
    }
    const focus=interaction.options.getFocused(true);
    const focused = String(typeof focus==='string'?focus:focus.value).toLowerCase();
    if(typeof focus==='object' && focus.name==='creator'){
      if (this.access && interaction.guild) { try { await this.access.command(interaction.guild, interaction.user.id, interaction.commandName, Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild))); } catch { await interaction.respond([]); return; } } else if(!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)){await interaction.respond([]);return;}
      const creators=await this.store.creatorsForGuild(interaction.guildId);
      await interaction.respond(creators.filter(profile=>profile.name.toLowerCase().includes(focused)).slice(0,25).map(profile=>({name:profile.name,value:profile.id})));return;
    }
    const records = await this.store.forGuild(interaction.guildId, interaction.commandName as Platform);
    const choices = records
      .filter((record) => `${record.creatorName??''} ${record.displayName} ${record.username}`.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((record) => ({
        name: `${record.state === 'live' ? '🔴 ' : ''}${record.creatorName||record.displayName} (${record.username})`.slice(0, 100),
        value: record.id,
      }));
    await interaction.respond(choices);
  }

  private async selected(interaction: ChatInputCommandInteraction<'cached'>, platform: Platform): Promise<StreamerRecord> {
    return this.assertRecord(interaction.options.getString('streamer', true), interaction.guildId, platform);
  }

  private async selectedCreator(guildId:string,id:string){
    const creator=await this.store.getCreator(id);
    if(!creator||creator.guildId!==guildId)throw new Error('Creator not found in this server.');
    return creator;
  }
  private async assertSingleAccountMemberEdit(record:StreamerRecord):Promise<void>{
    if(record.creatorId&&(await this.store.forGuild(record.guildId)).filter(item=>item.creatorId===record.creatorId).length>1)throw new Error('Edit the Discord member on the creator profile in the dashboard to update all linked accounts.');
  }

  private async assertRecord(id: string, guildId: string, platform: Platform): Promise<StreamerRecord> {
    const record = await this.store.get(id);
    if (!record || record.guildId !== guildId || record.platform !== platform) throw new Error('That configured streamer was not found.');
    return record;
  }

  private async validateConfiguration(guild: Guild, record: StreamerRecord): Promise<void> {
    const channel = await guild.channels.fetch(record.alertChannelId);
    if (!channel?.isSendable()) throw new Error('Choose a text or announcement channel where the bot can send messages.');
    const me = guild.members.me ?? await guild.members.fetchMe();
    const required = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ReadMessageHistory];
    if (!channel.permissionsFor(me)?.has(required)) throw new Error('The bot needs View Channel, Send Messages, Embed Links, and Read Message History in that channel.');

    if (record.pingRoleId === guild.id) throw new Error('Choose a normal ping role; @everyone is not allowed.');
    if (record.pingRoleId) {
      const pingRole = await guild.roles.fetch(record.pingRoleId);
      if (!pingRole) throw new Error('The selected ping role no longer exists.');
      if (!pingRole.mentionable && !me.permissions.has(PermissionFlagsBits.MentionEveryone)) {
        throw new BotMessageError('Make {role} mentionable, or give the bot permission to mention all roles.',{role:pingRole.name});
      }
    }
    if (record.discordMemberId) await guild.members.fetch(record.discordMemberId);
    if (record.liveRoleId && !record.discordMemberId) throw new Error('Choose a Discord member when setting a live role.');
    if (record.liveRoleId) {
      const role = await guild.roles.fetch(record.liveRoleId) as Role | null;
      if (!role) throw new Error('The selected live role no longer exists.');
      assertSafeRole(role);
      if (role.managed) throw new Error('The selected live role is managed by an integration and cannot be assigned.');
      if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) throw new Error('The bot needs Manage Roles to use a live role.');
      if (me.roles.highest.comparePositionTo(role) <= 0) throw new BotMessageError('Move the bot’s role above {role} in Server Settings → Roles.',{role:role.name});
    }
  }

  private savedEmbed(record: StreamerRecord, title: string, locale?: string): EmbedBuilder {
    const t = (source:string,params:TextParams={})=>botText(record.guildId,source,params,locale);
    return new EmbedBuilder()
      .setColor(0x36c98f)
      .setTitle(t(title,{name:record.displayName}))
      .setDescription(t('Alerts will post in <#{channel}>.',{channel:record.alertChannelId}))
      .addFields(
        { name: t('Platform'), value: record.platform, inline: true },
        { name: t('Cleanup'), value: t(record.cleanupMode), inline: true },
        { name: t('Cooldown'), value: t('{minutes} minutes',{minutes:record.cooldownSeconds/60}), inline: true },
        { name: t('Ping role'), value: record.pingRoleId ? `<@&${record.pingRoleId}>` : t('None'), inline: true },
        { name: t('Live role'), value: record.liveRoleId ? `<@&${record.liveRoleId}>` : t('None'), inline: true },
        { name: t('Linked member'), value: record.discordMemberId ? `<@${record.discordMemberId}>` : t('None'), inline: true },
        { name: t('Title filter'), value: record.titleFilter || t('None'), inline: false },
      )
      .setFooter({ text: t('Use /{platform} edit, clear, test, toggle, or remove any time.',{platform:record.platform}) });
  }

  private summaryText(summary: { checked: number; live: number; offline: number; errors: number }, interaction:ChatInputCommandInteraction<'cached'>): string {
    const t=this.translator(interaction);
    if (summary.checked === 0) return t('ℹ️ No matching enabled streamers were found, or another check is already running.');
    return t('✅ Checked **{checked}** • 🔴 Live: **{live}** • ⚫ Offline: **{offline}**',{checked:summary.checked,live:summary.live,offline:summary.offline})+(summary.errors?t(' • ⚠️ Errors: **{count}**',{count:summary.errors}):'');
  }
}
