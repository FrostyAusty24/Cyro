import { botText, botNumber, type TextParams } from '../i18n/index.js';
import {
  Client,
  EmbedBuilder,
  time,
  TimestampStyles,
  type Guild,
  type Message,
} from 'discord.js';
import type { Logger } from '../logger.js';
import type { JsonStore } from '../storage/store.js';
import type { LiveSnapshot, StreamerRecord, UploadResult } from '../types.js';
import { applyUploadResult } from './content-alerts.js';
import { streamUrl } from '../utils/normalize.js';
import { renderMessage, titleMatches } from '../utils/template.js';
import { assertSafeRole } from '../community/config.js';

const COLORS = { twitch: 0x9146ff, kick: 0x53fc18, tiktok: 0x25f4ee, youtube: 0xff0033 } as const;

interface Analytics {
  observe(record: StreamerRecord, snapshot: LiveSnapshot): Promise<void>;
  pause(recordId: string): Promise<void>;
}

export class AlertService {
  private uploadOperations: Promise<unknown> = Promise.resolve();
  constructor(
    private readonly client: Client,
    private readonly store: JsonStore,
    private readonly logger: Logger,
    private readonly analytics?: Analytics,
  ) {}

  applyUploads(record: StreamerRecord, result: UploadResult): Promise<number> {
    const operation = this.uploadOperations.then(() => applyUploadResult(this.client, this.store, record.id, result));
    this.uploadOperations = operation.catch(() => undefined);
    return operation;
  }

  async markLive(record: StreamerRecord, snapshot: LiveSnapshot): Promise<void> {
    if (!record.enabled) { await this.analytics?.pause(record.id); return; }
    const newSession = record.currentSessionId !== snapshot.sessionId;
    let working = record;

    if (newSession) {
      await this.analytics?.pause(record.id);
      if (record.alertMessageId) await this.cleanupMessage(record);
      working = await this.store.update(record.id, {
        state: 'live',
        currentSessionId: snapshot.sessionId,
        alertedSessionId: undefined,
        alertMessageId: undefined,
        alertMessageChannelId: undefined,
        lastSnapshot: snapshot,
      });
    } else if (record.state !== 'live' || JSON.stringify(record.lastSnapshot) !== JSON.stringify(snapshot)) {
      working = await this.store.update(record.id, { state: 'live', lastSnapshot: snapshot });
    }

    await this.ensureLiveRole(working);
    if (working.alertedSessionId === snapshot.sessionId) {
      if (this.analytics) {
        if (await this.announcementExists(working)) await this.analytics.observe(working, snapshot);
        else await this.analytics.pause(working.id);
      }
      return;
    }
    if (!titleMatches(working.titleFilter, snapshot.title)) return;

    const lastAlertAt = working.lastAlertAt ? Date.parse(working.lastAlertAt) : 0;
    if (Date.now() - lastAlertAt < working.cooldownSeconds * 1000) return;

    try {
      const message = await this.sendAlert(working, snapshot, false);
      const announced = await this.store.update(working.id, {
        state: 'live',
        currentSessionId: snapshot.sessionId,
        alertedSessionId: snapshot.sessionId,
        alertMessageId: message.id,
        alertMessageChannelId: message.channelId,
        lastAlertAt: new Date().toISOString(),
        lastSnapshot: snapshot,
      });
      // The initial follower total was fetched before posting. Start its baseline on a later
      // confirmed poll so pre-announcement growth cannot be credited to this server.
      await this.analytics?.observe(announced, { ...snapshot, followerCount: undefined });
      this.logger.info('Sent live alert.', { platform: working.platform, username: working.username, guildId: working.guildId });
    } catch (error) {
      this.logger.error('Could not send live alert; the next poll will retry.', {
        streamerId: working.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async markOffline(record: StreamerRecord): Promise<void> {
    await this.analytics?.pause(record.id);
    if (record.state === 'live' || record.alertMessageId) {
      await this.cleanupMessage(record);
      await this.removeLiveRole(record);
    }
    if (record.state !== 'offline' || record.currentSessionId || record.alertMessageId) {
      await this.store.update(record.id, {
        state: 'offline',
        currentSessionId: undefined,
        alertedSessionId: undefined,
        alertMessageId: undefined,
        alertMessageChannelId: undefined,
      });
    }
  }

  async testAlert(record: StreamerRecord): Promise<Message> {
    const snapshot: LiveSnapshot = {
      sessionId: `test:${Date.now()}`,
      title: 'This is a test live alert',
      category: 'Test category',
      viewerCount: 123,
      avatarUrl: record.avatarUrl,
      startedAt: new Date().toISOString(),
      url: streamUrl(record.platform, record.username),
    };
    return this.sendAlert({ ...record, pingRoleId: undefined }, snapshot, true);
  }

  async retire(record: StreamerRecord): Promise<void> {
    await this.analytics?.pause(record.id);
    if (record.alertMessageId) await this.cleanupMessage(record);
    if (record.state === 'live') await this.removeLiveRole(record);
  }

  async reconcileEdit(before: StreamerRecord, after: StreamerRecord): Promise<void> {
    if (before.state !== 'live') return;
    const assignmentChanged = before.liveRoleId !== after.liveRoleId || before.discordMemberId !== after.discordMemberId;
    if (assignmentChanged) {
      await this.removeLiveRole(before);
      await this.ensureLiveRole(after);
    }
  }

  private async announcementExists(record: StreamerRecord): Promise<boolean> {
    if (!record.alertMessageId || !record.alertMessageChannelId) return false;
    try {
      const guild = await this.client.guilds.fetch(record.guildId);
      const channel = await guild.channels.fetch(record.alertMessageChannelId);
      if (!channel?.isTextBased() || !('messages' in channel) || channel.guildId !== record.guildId) return false;
      // Bypass discord.js's message cache: a deleted announcement must stop earning statistics.
      const message = await channel.messages.fetch({ message: record.alertMessageId, cache: false, force: true });
      return message.id === record.alertMessageId && message.guildId === record.guildId
        && message.channelId === record.alertMessageChannelId && message.author.id === this.client.user?.id;
    } catch {
      // Missing message or uncertain Discord access both break sample continuity.
      return false;
    }
  }

  private async sendAlert(record: StreamerRecord, snapshot: LiveSnapshot, test: boolean): Promise<Message> {
    const guild = await this.client.guilds.fetch(record.guildId);
    const channel = await guild.channels.fetch(record.alertChannelId);
    if (!channel?.isSendable()) throw new Error('The configured alert channel is missing or is not sendable.');

    if(test) snapshot={...snapshot,title:botText(record.guildId,'This is a test live alert',{},guild.preferredLocale),category:botText(record.guildId,'Test category',{},guild.preferredLocale)};
    const embed = this.liveEmbed(record, snapshot, test, guild.preferredLocale);
    return channel.send({
      content: renderMessage(record, snapshot, guild.preferredLocale).slice(0, 2000),
      embeds: [embed],
      allowedMentions: record.pingRoleId ? { parse: [], roles: [record.pingRoleId] } : { parse: [] },
    });
  }

  private liveEmbed(record: StreamerRecord, snapshot: LiveSnapshot, test: boolean, locale?:string): EmbedBuilder {
    const t=(source:string,params:TextParams={})=>botText(record.guildId,source,params,locale);
    const platform = record.platform[0]!.toUpperCase() + record.platform.slice(1);
    const embed = new EmbedBuilder()
      .setColor(COLORS[record.platform])
      .setTitle((test ? t('TEST • ') : '')+t('{name} is live on {platform}',{name:record.creatorName||record.displayName,platform}))
      .setURL(snapshot.url)
      .setDescription(`**${snapshot.title || t('Untitled stream')}**`)
      .addFields(
        { name: t('Category'), value: snapshot.category || t('No category'), inline: true },
        { name: t('Viewers'), value: snapshot.viewerCount===undefined?t('Unknown'):botNumber(record.guildId,snapshot.viewerCount,locale), inline: true },
      )
      .setFooter({ text: `${t(test ? 'Test alert' : 'Live alert')} • ${record.username}` })
      .setTimestamp();
    if (snapshot.startedAt) {
      const date = new Date(snapshot.startedAt);
      if (!Number.isNaN(date.valueOf())) embed.addFields({ name: t('Started'), value: time(date, TimestampStyles.RelativeTime), inline: true });
    }
    if (snapshot.thumbnailUrl) embed.setImage(snapshot.thumbnailUrl);
    const avatar = snapshot.avatarUrl || record.avatarUrl;
    if (avatar) embed.setThumbnail(avatar);
    return embed;
  }

  private async cleanupMessage(record: StreamerRecord): Promise<void> {
    if (!record.alertMessageId || record.cleanupMode === 'keep') return;
    try {
      const guild = await this.client.guilds.fetch(record.guildId);
      const channelId = record.alertMessageChannelId || record.alertChannelId;
      const channel = await guild.channels.fetch(channelId);
      if (!channel?.isTextBased() || !('messages' in channel)) return;
      const message = await channel.messages.fetch(record.alertMessageId);
      if (record.cleanupMode === 'delete') {
        await message.delete();
        return;
      }
      const t=(source:string,params:TextParams={})=>botText(record.guildId,source,params,guild.preferredLocale);
      const platform = record.platform[0]!.toUpperCase() + record.platform.slice(1);
      const embed = new EmbedBuilder()
        .setColor(0x59636f)
        .setTitle(t('{name} is now offline',{name:record.creatorName||record.displayName}))
        .setURL(streamUrl(record.platform, record.username))
        .setDescription(record.lastSnapshot?.title ? t('Last stream: **{title}**',{title:record.lastSnapshot.title}) : t('The {platform} stream has ended.',{platform}))
        .setFooter({ text: `${platform} • ${t('Stream ended')}` })
        .setTimestamp();
      if (record.avatarUrl) embed.setThumbnail(record.avatarUrl);
      await message.edit({ content: t('⚫ **{name} is now offline.**',{name:record.creatorName||record.displayName}), embeds: [embed], allowedMentions: { parse: [] } });
    } catch (error) {
      this.logger.warn('Could not clean up an alert message.', {
        streamerId: record.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async ensureLiveRole(record: StreamerRecord): Promise<void> {
    if (!record.liveRoleId || !record.discordMemberId) return;
    try {
      const guild = await this.client.guilds.fetch(record.guildId);
      const member = await guild.members.fetch(record.discordMemberId);
      const role = await guild.roles.fetch(record.liveRoleId);
      if (!role) throw new Error('The live role no longer exists.');
      assertSafeRole(role);
      if (!member.roles.cache.has(record.liveRoleId)) await member.roles.add(record.liveRoleId, botText(record.guildId,'{name} went live on {platform}',{name:record.displayName,platform:record.platform},guild.preferredLocale).slice(0,512));
    } catch (error) {
      this.logRoleError('add', record, error);
    }
  }

  private async removeLiveRole(record: StreamerRecord): Promise<void> {
    if (!record.liveRoleId || !record.discordMemberId) return;
    const others = await this.store.forGuild(record.guildId);
    const stillLiveElsewhere = others.some((other) =>
      other.id !== record.id &&
      other.enabled &&
      other.state === 'live' &&
      other.liveRoleId === record.liveRoleId &&
      other.discordMemberId === record.discordMemberId,
    );
    if (stillLiveElsewhere) return;

    try {
      const guild = await this.client.guilds.fetch(record.guildId);
      const member = await guild.members.fetch(record.discordMemberId);
      if (member.roles.cache.has(record.liveRoleId)) await member.roles.remove(record.liveRoleId, botText(record.guildId,'{name} is no longer live on {platform}',{name:record.displayName,platform:record.platform},guild.preferredLocale).slice(0,512));
    } catch (error) {
      this.logRoleError('remove', record, error);
    }
  }

  private logRoleError(action: 'add' | 'remove', record: StreamerRecord, error: unknown): void {
    this.logger.warn(`Could not ${action} a live role.`, {
      streamerId: record.id,
      roleId: record.liveRoleId,
      memberId: record.discordMemberId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
