import { randomUUID } from 'node:crypto';
import { chmod, mkdir, open, readFile, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { AppConfig } from '../config.js';
import type { Logger } from '../logger.js';
import type { StreamerRecord, UploadResult, UploadSnapshot } from '../types.js';

const SCOPES = ['user.info.basic', 'video.list'];
const API = 'https://open.tiktokapis.com/v2';
const INTERVAL = 5 * 60_000;
const CONFIGURATION_HINT = 'Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET on the host, register the HTTPS TikTok callback, and enable Login Kit plus video.list in the TikTok app. Sandbox access is limited to its target users until TikTok approves production access.';
const RECONNECT_HINT = 'The creator needs to connect TikTok again and allow basic profile and public-video access.';
interface Account {
  openId: string; discordUserId: string; displayName: string;
  accessToken: string; refreshToken: string; accessExpiresAt: number; refreshExpiresAt: number;
  needsReconnect?: boolean;
}
interface Binding { guildId: string; recordId: string; discordUserId: string; openId: string; connectedAt: string }
interface Vault { version: 1; accounts: Account[]; bindings: Binding[] }
export interface TikTokConnectionStatus {
  configured: boolean; connected: boolean; needsReconnect: boolean; reason: string;
  displayName?: string; connectedAt?: string; connectedBy?: string;
}
export interface TikTokDisconnectResult { revoked: boolean; remainingConnections: boolean }
interface Options { fetch?: typeof fetch; now?: () => number }
type Data = Record<string, unknown>;
const object = (value: unknown): Data => value && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};
const text = (value: unknown, max = 4096): value is string => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const discordId = (value: unknown): value is string => typeof value === 'string' && /^\d{17,20}$/.test(value);
const recordId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(value);
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const bindingKey = (guildId: string, recordId: string) => `${guildId}:${recordId}`;
class TikTokApiError extends Error { constructor(message: string, readonly reconnect = false) { super(message); } }

function validateVault(value: unknown): Vault {
  const data = object(value);
  const fail = (): never => { throw new Error('The private TikTok connection file is invalid. Restore a valid backup; existing data was not replaced.'); };
  if (data.version !== 1 || !Array.isArray(data.accounts) || !Array.isArray(data.bindings) || data.accounts.length > 5000 || data.bindings.length > 10000) fail();
  const vault = data as unknown as Vault, accounts = new Map<string, Account>(), bindings = new Set<string>();
  for (const account of vault.accounts) {
    if (!account || !text(account.openId, 256) || !discordId(account.discordUserId) || !text(account.displayName, 200) || !text(account.accessToken) || !text(account.refreshToken) || !positive(account.accessExpiresAt) || !positive(account.refreshExpiresAt) || (account.needsReconnect !== undefined && typeof account.needsReconnect !== 'boolean') || accounts.has(account.openId)) fail();
    accounts.set(account.openId, account);
  }
  for (const binding of vault.bindings) {
    if (!binding || !discordId(binding.guildId) || !recordId(binding.recordId) || !discordId(binding.discordUserId) || !text(binding.openId, 256) || !Number.isFinite(Date.parse(binding.connectedAt)) || accounts.get(binding.openId)?.discordUserId !== binding.discordUserId || bindings.has(bindingKey(binding.guildId, binding.recordId))) fail();
    bindings.add(bindingKey(binding.guildId, binding.recordId));
  }
  if (vault.accounts.some(account => !vault.bindings.some(binding => binding.openId === account.openId))) fail();
  return vault;
}

/** Single-process vault. Tokens are never copied into server settings or dashboard JSON. */
export class TikTokService {
  private data: Vault = { version: 1, accounts: [], bindings: [] };
  private queue: Promise<unknown> = Promise.resolve();
  private initialized = false;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private readonly filePath: string;
  private readonly cache = new Map<string, { checkedAt: number; result: UploadResult }>();
  private readonly deliveredChecks = new Map<string, number>();
  constructor(private readonly config: AppConfig, private readonly logger: Logger, options: Options = {}) {
    this.fetcher = options.fetch ?? fetch; this.now = options.now ?? Date.now;
    this.filePath = path.join(config.dataDir, 'tiktok-connections.json');
  }
  async init(): Promise<void> {
    if (this.initialized) return;
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      if ((await stat(this.filePath)).size > 8_000_000) throw new Error('The private TikTok connection file exceeds its size limit.');
      this.data = validateVault(JSON.parse(await readFile(this.filePath, 'utf8')));
      await chmod(this.filePath, 0o600);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Could not load the private TikTok connection file. Existing data was not replaced.'); }
    this.initialized = true;
  }
  configured(): boolean { return Boolean(this.config.tiktokClientKey && this.config.tiktokClientSecret && this.config.dashboardUrl?.startsWith('https://')); }
  authorizationUrl(state: string): string {
    if (!this.configured()) throw new Error(CONFIGURATION_HINT);
    if (!/^[A-Za-z0-9_-]{32,256}$/.test(state)) throw new Error('Invalid TikTok login state.');
    const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
    url.search = new URLSearchParams({ client_key: this.config.tiktokClientKey!, response_type: 'code', scope: SCOPES.join(','), redirect_uri: this.callback(), state, disable_auto_auth: '1' }).toString();
    return url.toString();
  }
  private callback(): string { return `${this.config.dashboardUrl}/auth/tiktok/callback`; }
  private binding(guildId: string, id: string): Binding | undefined { return this.data.bindings.find(item => item.guildId === guildId && item.recordId === id); }
  private account(openId: string): Account | undefined { return this.data.accounts.find(item => item.openId === openId); }
  status(guildId: string, id: string): TikTokConnectionStatus {
    const binding = this.binding(guildId, id), account = binding && this.account(binding.openId);
    const configured = this.configured(), needsReconnect = Boolean(account && (account.needsReconnect || account.refreshExpiresAt <= this.now()));
    return { configured, connected: Boolean(account), needsReconnect,
      reason: !configured ? CONFIGURATION_HINT : !account ? 'The linked Discord member must connect their TikTok account to allow public-video alerts.' : needsReconnect ? RECONNECT_HINT : 'Public TikTok videos are checked about every five minutes. This connection does not verify the manually entered LIVE handle.',
      ...(account && binding ? { displayName: account.displayName, connectedAt: binding.connectedAt, connectedBy: binding.discordUserId } : {}) };
  }
  ownConnections(discordUserId: string): (TikTokConnectionStatus & { guildId: string; recordId: string })[] {
    return this.data.bindings.filter(binding => binding.discordUserId === discordUserId).map(binding => ({ guildId: binding.guildId, recordId: binding.recordId, ...this.status(binding.guildId, binding.recordId) }));
  }
  async guildIds(): Promise<string[]> { await this.queue; return [...new Set(this.data.bindings.map(binding => binding.guildId))]; }
  async flush(): Promise<void> { await this.queue; }
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.then(() => { if (!this.initialized) throw new Error('TikTok connections are not ready.'); return work(); });
    this.queue = next.catch(() => undefined); return next;
  }
  private async persist(next: Vault): Promise<void> {
    validateVault(next);
    const temporary = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      const handle = await open(temporary, 'wx', 0o600);
      try { await handle.writeFile(JSON.stringify(next), 'utf8'); await handle.sync(); } finally { await handle.close(); }
      await rename(temporary, this.filePath);
      this.data = next;
    } catch { await unlink(temporary).catch(() => undefined); throw new Error('Could not save private TikTok connections. Please try again.'); }
  }
  private async request(endpoint: string, init: RequestInit): Promise<Data> {
    let response: Response;
    try { response = await this.fetcher(`${API}${endpoint}`, { ...init, redirect: 'error', signal: AbortSignal.timeout(8_000) }); }
    catch { throw new TikTokApiError('TikTok could not be reached. Please try again later.'); }
    let body: Data;
    try {
      const reader = response.body?.getReader(); if (!reader) throw new Error();
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 512_000) { await reader.cancel(); throw new Error(); } chunks.push(value); }
      const raw = Buffer.concat(chunks).toString('utf8'); body = raw ? object(JSON.parse(raw)) : {};
    } catch { throw new TikTokApiError('TikTok returned an unreadable response. Please try again later.'); }
    const code = typeof body.error === 'string' ? body.error : object(body.error).code;
    if (!response.ok || (code !== undefined && code !== 'ok')) {
      const reconnect = response.status === 401 || ['invalid_grant', 'access_token_invalid', 'scope_not_authorized', 'access_token_expired'].includes(String(code));
      throw new TikTokApiError(reconnect ? RECONNECT_HINT : response.status === 429 ? 'TikTok is rate limiting requests. Cyro will check again later.' : 'TikTok rejected this request. Check the app configuration, approved scopes, and sandbox target users.', reconnect);
    }
    return body;
  }
  private tokenFields(body: Data, expectedId?: string): Pick<Account, 'openId' | 'accessToken' | 'refreshToken' | 'accessExpiresAt' | 'refreshExpiresAt'> {
    const scopes = typeof body.scope === 'string' ? body.scope.split(',').map(scope => scope.trim()) : [];
    if (!SCOPES.every(scope => scopes.includes(scope))) throw new TikTokApiError('TikTok public-video access was not granted. Connect again and allow both requested permissions.', true);
    if (!text(body.open_id, 256) || (expectedId && body.open_id !== expectedId) || !text(body.access_token) || !text(body.refresh_token) || !positive(body.expires_in) || !positive(body.refresh_expires_in) || body.expires_in > 315_360_000 || body.refresh_expires_in > 315_360_000 || body.token_type !== 'Bearer') throw new TikTokApiError('TikTok returned an invalid token response. Connect again.', true);
    return { openId: body.open_id, accessToken: body.access_token, refreshToken: body.refresh_token, accessExpiresAt: this.now() + body.expires_in * 1000, refreshExpiresAt: this.now() + body.refresh_expires_in * 1000 };
  }
  private form(fields: Record<string, string>): RequestInit {
    return { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_key: this.config.tiktokClientKey!, client_secret: this.config.tiktokClientSecret!, ...fields }) };
  }
  connect(guildId: string, id: string, discordUserId: string, code: string, beforeCommit?: () => Promise<void>): Promise<TikTokConnectionStatus> {
    return this.enqueue(async () => {
      if (!this.configured()) throw new Error(CONFIGURATION_HINT);
      if (!discordId(guildId) || !recordId(id) || !discordId(discordUserId) || !text(code, 8192)) throw new Error('Invalid TikTok connection request.');
      const old = this.binding(guildId, id);
      if (old && old.discordUserId !== discordUserId) throw new Error('The previous creator must disconnect this TikTok connection before it can be replaced.');
      if (!old && this.data.bindings.length >= 10000) throw new Error('TikTok connection capacity has been reached.');
      const response = await this.request('/oauth/token/', this.form({ grant_type: 'authorization_code', code, redirect_uri: this.callback() }));
      let tokens: ReturnType<TikTokService['tokenFields']>;
      try { tokens = this.tokenFields(response); }
      catch (error) { if (text(response.access_token) && text(response.open_id, 256) && !this.account(response.open_id)) await this.revoke(response.access_token); throw error; }
      let saved = false;
      try {
        const user = object(object((await this.request('/user/info/?fields=open_id,display_name', { headers: { authorization: `Bearer ${tokens.accessToken}` } })).data).user);
        if (user.open_id !== tokens.openId || !text(user.display_name, 200)) throw new Error('TikTok did not confirm the connected account identity.');
        const existing = this.account(tokens.openId);
        if (existing && existing.discordUserId !== discordUserId) throw new Error('This TikTok account is already connected to another Discord user. Disconnect it from that account first.');
        if (!existing && this.data.accounts.length >= 5000) throw new Error('TikTok account capacity has been reached.');
        const next = structuredClone(this.data);
        next.accounts = next.accounts.filter(account => account.openId !== tokens.openId);
        next.accounts.push({ ...tokens, discordUserId, displayName: user.display_name });
        next.bindings = next.bindings.filter(binding => !(binding.guildId === guildId && binding.recordId === id));
        next.bindings.push({ guildId, recordId: id, discordUserId, openId: tokens.openId, connectedAt: new Date(this.now()).toISOString() });
        const orphan = old && old.openId !== tokens.openId && !next.bindings.some(binding => binding.openId === old.openId) ? this.account(old.openId) : undefined;
        next.accounts = next.accounts.filter(account => next.bindings.some(binding => binding.openId === account.openId));
        await beforeCommit?.();
        await this.persist(next); saved = true;
        this.cache.delete(tokens.openId); this.deliveredChecks.delete(bindingKey(guildId, id));
        if (orphan) { this.cache.delete(orphan.openId); await this.revoke(orphan.accessToken); }
        return this.status(guildId, id);
      } finally {
        // Never revoke a shared existing account on a rejected rebind: TikTok
        // revocation applies to app-wide consent, not just one Discord guild.
        if (!saved && !this.account(tokens.openId)) await this.revoke(tokens.accessToken);
      }
    });
  }
  private async revoke(token: string): Promise<boolean> {
    if (!this.configured()) return false;
    try { await this.request('/oauth/revoke/', this.form({ token })); return true; }
    catch { this.logger.warn('TikTok access was removed locally, but provider revocation could not be confirmed. The creator can remove Cyro in TikTok app permissions.'); return false; }
  }
  disconnect(guildId: string, id: string): Promise<TikTokDisconnectResult> { return this.enqueue(() => this.removeBinding(guildId, id)); }
  private async removeBinding(guildId: string, id: string): Promise<TikTokDisconnectResult> {
    const binding = this.binding(guildId, id); if (!binding) return { revoked: false, remainingConnections: false };
    const account = this.account(binding.openId)!;
    const next = structuredClone(this.data);
    next.bindings = next.bindings.filter(item => !(item.guildId === guildId && item.recordId === id));
    const remainingConnections = next.bindings.some(item => item.openId === binding.openId);
    if (!remainingConnections) next.accounts = next.accounts.filter(item => item.openId !== binding.openId);
    await this.persist(next); this.deliveredChecks.delete(bindingKey(guildId, id));
    if (remainingConnections) return { revoked: false, remainingConnections: true };
    this.cache.delete(binding.openId);
    return { revoked: await this.revoke(account.accessToken), remainingConnections: false };
  }
  purgeGuild(guildId: string, shouldPurge: () => boolean = () => true): Promise<void> {
    return this.enqueue(async () => { if (!shouldPurge()) return; for (const binding of [...this.data.bindings.filter(item => item.guildId === guildId)]) { if (!shouldPurge()) return; await this.removeBinding(guildId, binding.recordId); } });
  }
  private async access(account: Account): Promise<Account> {
    if (account.needsReconnect || account.refreshExpiresAt <= this.now()) throw new TikTokApiError(RECONNECT_HINT, true);
    if (account.accessExpiresAt > this.now() + 60_000) return account;
    try {
      const tokens = this.tokenFields(await this.request('/oauth/token/', this.form({ grant_type: 'refresh_token', refresh_token: account.refreshToken })), account.openId);
      const next = structuredClone(this.data), updated = { ...account, ...tokens };
      next.accounts = next.accounts.map(item => item.openId === account.openId ? updated : item);
      await this.persist(next); return updated;
    } catch (error) { await this.markReconnect(account.openId, error); throw error; }
  }
  private async markReconnect(openId: string, error: unknown): Promise<void> {
    if (!(error instanceof TikTokApiError) || !error.reconnect) return;
    const next = structuredClone(this.data), account = next.accounts.find(item => item.openId === openId);
    if (account) { account.needsReconnect = true; await this.persist(next); }
  }
  private async publicVideos(openId: string): Promise<UploadResult> {
    const cached = this.cache.get(openId);
    if (cached && this.now() - cached.checkedAt < INTERVAL) return structuredClone(cached.result);
    const account = this.account(openId); if (!account) return { kind: 'error', error: RECONNECT_HINT };
    let result: UploadResult;
    try {
      const current = await this.access(account);
      const body = await this.request('/video/list/?fields=id,title,video_description,create_time,share_url', { method: 'POST', headers: { authorization: `Bearer ${current.accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ max_count: 20 }) });
      const videos = object(body.data).videos;
      if (!Array.isArray(videos) || videos.length > 20) throw new Error('TikTok returned an invalid public-video list.');
      const items: UploadSnapshot[] = [];
      for (const entry of videos) {
        const video = object(entry);
        if (typeof video.id !== 'string' || !/^\d{1,30}$/.test(video.id) || !positive(video.create_time) || video.create_time * 1000 > this.now()) continue;
        let url: URL; try { url = new URL(String(video.share_url)); } catch { continue; }
        if (url.protocol !== 'https:' || (url.hostname !== 'tiktok.com' && !url.hostname.endsWith('.tiktok.com')) || url.username || url.password || url.port) continue;
        url.hash = ''; url.search = '';
        const title = text(video.title, 1000) ? video.title : text(video.video_description, 1000) ? video.video_description : 'TikTok video';
        items.push({ id: video.id, title: title.slice(0, 500), url: url.toString(), publishedAt: new Date(video.create_time * 1000).toISOString() });
      }
      items.sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt) || a.id.localeCompare(b.id));
      result = { kind: 'uploads', items, checkedAt: new Date(this.now()).toISOString() };
    } catch (error) {
      await this.markReconnect(openId, error);
      result = { kind: 'error', error: error instanceof TikTokApiError ? error.message : 'TikTok public videos could not be checked. Please try again later.' };
    }
    this.cache.set(openId, { checkedAt: this.now(), result }); return structuredClone(result);
  }
  videos(guildId: string, id: string, discordUserId: string): Promise<UploadResult> {
    return this.enqueue(async () => {
      if (!this.configured()) return { kind: 'error', error: CONFIGURATION_HINT };
      const binding = this.binding(guildId, id);
      if (!binding || binding.discordUserId !== discordUserId) throw new Error('TikTok connection not found for this Discord user.');
      return this.publicVideos(binding.openId);
    });
  }
  async checkUploads(records: StreamerRecord[]): Promise<Map<string, UploadResult>> {
    const output = new Map<string, UploadResult>();
    // Enqueue one account at a time so interactive disconnects can enter between
    // checks. A duplicate guild binding uses the same cached API observation.
    for (const record of records) output.set(record.id, await this.enqueue(async () => {
      if (!this.configured()) return { kind: 'error', error: CONFIGURATION_HINT } as UploadResult;
      const binding = this.binding(record.guildId, record.id);
      if (record.platform !== 'tiktok' || !binding || binding.discordUserId !== record.discordMemberId) return { kind: 'error', error: 'The linked Discord member must connect TikTok for this creator. An old connection cannot be used after reassignment.' } as UploadResult;
      const result = await this.publicVideos(binding.openId), checkedAt = this.cache.get(binding.openId)?.checkedAt;
      const key = bindingKey(record.guildId, record.id);
      if (result.kind === 'uploads' && checkedAt !== undefined) {
        if (this.deliveredChecks.get(key) === checkedAt) return { kind: 'deferred' } as UploadResult;
        this.deliveredChecks.set(key, checkedAt);
      }
      return result;
    }));
    return output;
  }
}
