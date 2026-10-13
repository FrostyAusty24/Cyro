import { randomBytes } from 'node:crypto';
import type { Client } from 'discord.js';
import type { JsonStore } from '../storage/store.js';
import type { StreamMonitor } from '../services/monitor.js';
import type { TikTokService } from '../tiktok/service.js';

export class TikTokDashboardError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export class TikTokCancellation extends TikTokDashboardError {
  constructor() { super(400, 'TikTok connection was cancelled.'); }
}
interface PendingLink { sessionId: string; userId: string; guildId: string; recordId: string; expiresAt: number }
export function tiktokSelection(input: unknown): { guildId: string; recordId: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TikTokDashboardError(400, 'Choose a creator account.');
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(key => !['guildId', 'recordId'].includes(key)) || typeof value.guildId !== 'string' || !/^\d{17,20}$/.test(value.guildId) || typeof value.recordId !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(value.recordId)) throw new TikTokDashboardError(400, 'Choose a valid server and creator account.');
  return { guildId: value.guildId, recordId: value.recordId };
}

/** Creator authorization is independent of server management permission. */
export class DashboardTikTok {
  private states = new Map<string, PendingLink>();
  constructor(private client: Client, private store: JsonStore, private monitor: StreamMonitor, private service: TikTokService) {}
  configured(): boolean { return this.service.configured(); }
  private async owned(guildId: string, recordId: string, userId: string) {
    const record = await this.store.get(recordId);
    if (!record || record.guildId !== guildId || record.platform !== 'tiktok') throw new TikTokDashboardError(404, 'TikTok creator account not found in this server.');
    if (record.discordMemberId !== userId) throw new TikTokDashboardError(403, 'Only the Discord member linked to this creator can connect their TikTok account. Ask a server manager to check the creator profile.');
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild?.available) throw new TikTokDashboardError(404, 'Cyro is not available in this server.');
    const member = await guild.members.fetch({ user: userId, force: true }).catch(() => undefined);
    if (!member) throw new TikTokDashboardError(403, 'You must still be a member of this server.');
    return { record, guild };
  }
  async records(userId: string, guildId?: string) {
    if (guildId && !/^\d{17,20}$/.test(guildId)) throw new TikTokDashboardError(400, 'Invalid server.');
    const candidates = (await this.store.all()).filter(record => record.platform === 'tiktok' && record.discordMemberId === userId && (!guildId || record.guildId === guildId));
    const records = [];
    const allowed = new Map<string, boolean>();
    for (const record of candidates) {
      const guild = this.client.guilds.cache.get(record.guildId);
      if (!guild?.available) continue;
      if (!allowed.has(guild.id)) allowed.set(guild.id, Boolean(await guild.members.fetch({ user: userId, force: true }).catch(() => undefined)));
      if (!allowed.get(guild.id)) continue;
      const status = this.service.status(guild.id, record.id);
      const ownStatus = status.connectedBy && status.connectedBy !== userId ? { configured: status.configured, connected: false, needsReconnect: false, reason: 'The previous creator must disconnect this profile before you can connect TikTok. Contact Cyro support if they cannot access it.' } : status;
      records.push({ guildId: guild.id, recordId: record.id, guildName: guild.name, creatorName: record.creatorName || record.displayName, username: record.username, discordMemberId: userId, ...ownStatus });
    }
    return { configured: this.configured(), records };
  }
  async connections(userId: string) {
    const connections = [];
    for (const connection of this.service.ownConnections(userId)) {
      const record = await this.store.get(connection.recordId);
      connections.push({ ...connection, guildName: this.client.guilds.cache.get(connection.guildId)?.name || 'Former server', creatorName: record?.discordMemberId === userId ? record.creatorName || record.displayName : 'Former creator profile', username: record?.discordMemberId === userId ? record.username : undefined });
    }
    return { configured: this.configured(), connections };
  }
  async begin(input: unknown, userId: string, sessionId: string) {
    const selected = tiktokSelection(input);
    await this.owned(selected.guildId, selected.recordId, userId);
    const prior = this.service.status(selected.guildId, selected.recordId);
    if (prior.connectedBy && prior.connectedBy !== userId) throw new TikTokDashboardError(403, 'The previous creator must disconnect this TikTok connection first. Contact Cyro support if they cannot access it.');
    if (!this.configured()) throw new TikTokDashboardError(503, 'TikTok login is awaiting the app credentials and sandbox setup.');
    const now = Date.now();
    for (const [state, value] of this.states) if (value.expiresAt <= now) this.states.delete(state);
    if (this.states.size >= 5000) throw new TikTokDashboardError(429, 'Too many pending connections. Try again shortly.');
    const state = randomBytes(32).toString('base64url');
    this.states.set(state, { ...selected, userId, sessionId, expiresAt: now + 600_000 });
    return { url: this.service.authorizationUrl(state) };
  }
  async callback(state: string, code: string | null, userId: string, sessionId: string, assertActive: () => void) {
    const pending = this.states.get(state);
    if (!pending || pending.sessionId !== sessionId || pending.userId !== userId) throw new TikTokDashboardError(400, 'TikTok connection did not match this browser. Start again from Creator connections.');
    this.states.delete(state);
    if (pending.expiresAt <= Date.now()) throw new TikTokDashboardError(400, 'TikTok connection expired. Start again from Creator connections.');
    if (!code) throw new TikTokCancellation();
    if (code.length > 2048) throw new TikTokDashboardError(400, 'TikTok returned an invalid code.');
    await this.monitor.withLock(async () => {
      const validate = async () => { assertActive(); await this.owned(pending.guildId, pending.recordId, userId); assertActive(); };
      await validate();
      // Reset before granting access: existing videos establish a fresh baseline, never a backlog.
      const before = (await this.store.get(pending.recordId))!;
      await this.store.update(pending.recordId, { uploadState: undefined });
      try { await this.service.connect(pending.guildId, pending.recordId, userId, code, validate); }
      catch (error) {
        // A denied/failed reconnect must not discard delivery receipts from an existing grant.
        await this.store.update(pending.recordId, { uploadState: before.uploadState });
        throw error;
      }
    });
    return `/connections?${new URLSearchParams({ guild: pending.guildId, record: pending.recordId, tiktok: 'connected' })}`;
  }
  async disconnect(input: unknown, userId: string) {
    const selected = tiktokSelection(input);
    return this.monitor.withLock(async () => {
      const status = this.service.status(selected.guildId, selected.recordId);
      if (!status.connectedBy || status.connectedBy !== userId) throw new TikTokDashboardError(403, 'Only the creator who connected this TikTok account can disconnect it.');
      // Revocation remains possible after leaving a guild or deletion of its profile.
      return this.service.disconnect(selected.guildId, selected.recordId);
    });
  }
  async videos(input: unknown, userId: string) {
    const selected = tiktokSelection(input);
    await this.owned(selected.guildId, selected.recordId, userId);
    const result = await this.service.videos(selected.guildId, selected.recordId, userId);
    if (result.kind === 'error') throw new TikTokDashboardError(400, result.error);
    return { videos: result.kind === 'uploads' ? result.items : [] };
  }
}
