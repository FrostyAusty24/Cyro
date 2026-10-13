import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PLATFORMS, type BotData, type CreatorProfile, type Platform, type StreamerRecord } from '../types.js';

const EMPTY_DATA: BotData = { version: 2, streamers: [], creators: [] };
function creatorName(value: string): string {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f-\u009f]/.test(value) || !value.trim() || value.trim().length > 80) throw new Error('Creator name must contain 1 to 80 characters without control characters.');
  return value.trim();
}
function automaticName(record: StreamerRecord): string {
  const clean = (value: string) => value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, 80);
  return clean(record.displayName) || clean(record.username) || 'Creator';
}
const validId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 512 && value.trim() === value && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const accountNameKey = (record: StreamerRecord): string => record.platform === 'youtube' && /^UC[A-Za-z0-9_-]{22}$/.test(record.username) ? record.username : record.username.toLowerCase();
function validateData(data: BotData): void {
  const fail = (): never => { throw new Error('Invalid creator or streamer data; check stored identities and associations.'); };
  if (!data || data.version !== 2 || !Array.isArray(data.streamers) || !Array.isArray(data.creators)) fail();
  const creators = new Map<string, CreatorProfile>(), accounts = new Map<string, CreatorProfile>();
  for (const creator of data.creators!) {
    if (!creator || !validId(creator.id) || !validId(creator.guildId) || creators.has(creator.id) || !Array.isArray(creator.accountIds) || !validDate(creator.createdAt) || !validDate(creator.updatedAt)) fail();
    creatorName(creator.name);
    if (creator.discordMemberId !== undefined && !validId(creator.discordMemberId)) fail();
    creators.set(creator.id, creator);
    for (const id of creator.accountIds) { if (!validId(id) || accounts.has(id)) fail(); accounts.set(id, creator); }
  }
  const recordIds = new Set<string>(), usernames = new Set<string>(), platformIds = new Set<string>();
  for (const record of data.streamers) {
    if (!record || !validId(record.id) || !validId(record.guildId) || recordIds.has(record.id) || !PLATFORMS.includes(record.platform) || !validId(record.username) || typeof record.displayName !== 'string' || !validDate(record.createdAt) || !validDate(record.updatedAt)) fail();
    const creator = creators.get(record.creatorId ?? '');
    if (!creator || creator.guildId !== record.guildId || accounts.get(record.id) !== creator || Object.hasOwn(record, 'creatorName') || record.discordMemberId !== creator.discordMemberId) fail();
    const nameKey = JSON.stringify([record.guildId, record.platform, accountNameKey(record)]);
    const platformKey = JSON.stringify([record.guildId, record.platform, record.platformUserId]);
    if (usernames.has(nameKey) || (record.platformUserId && platformIds.has(platformKey))) fail();
    if (record.uploads) {
      const settings = record.uploads;
      if (typeof settings.enabled !== 'boolean' || typeof settings.channelId !== 'string' ||
          (settings.enabled && (!validId(settings.channelId) || !['youtube', 'tiktok'].includes(record.platform))) ||
          (settings.pingRoleId !== undefined && !validId(settings.pingRoleId)) ||
          (settings.titleFilter !== undefined && (typeof settings.titleFilter !== 'string' || settings.titleFilter.length > 100)) ||
          typeof settings.messageTemplate !== 'string' || settings.messageTemplate.length > 1800) fail();
    }
    if (record.uploadState) {
      const state = record.uploadState;
      if (!Array.isArray(state.seen) || state.seen.length > 1000 || !Array.isArray(state.deliveries) || state.deliveries.length > 100 ||
          [state.baselineAt, state.ignorePublishedBefore, state.lastCheckedAt].some(value => value !== undefined && !validDate(value)) ||
          (state.lastError !== undefined && (typeof state.lastError !== 'string' || state.lastError.length > 500))) fail();
      const seen = new Set<string>();
      for (const item of state.seen) { if (!validId(item.id) || !validDate(item.publishedAt) || seen.has(item.id)) fail(); seen.add(item.id); }
      for (const delivery of state.deliveries) if (!validId(delivery.videoId) || !validId(delivery.channelId) || !validDate(delivery.attemptedAt) ||
          !['pending', 'sent', 'uncertain'].includes(delivery.status) || (delivery.messageId !== undefined && !validId(delivery.messageId))) fail();
    }
    recordIds.add(record.id); usernames.add(nameKey); if (record.platformUserId) platformIds.add(platformKey);
  }
}

export class JsonStore {
  private data: BotData = structuredClone(EMPTY_DATA);
  private mutationQueue: Promise<unknown> = Promise.resolve();

  public constructor(private readonly filePath: string) {}

  async init(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    let raw: string;
    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await this.persist();
      return;
    }
    const parsed = JSON.parse(raw) as BotData;
    if (!parsed || ![1, 2].includes(parsed.version) || !Array.isArray(parsed.streamers)) {
      throw new Error('Unsupported or invalid data file.');
    }
    if (parsed.version === 1) {
      parsed.creators = parsed.streamers.map(record => {
        record.creatorId = `creator-${record.id}`;
        return { id: record.creatorId, guildId: record.guildId, name: automaticName(record),
          discordMemberId: record.discordMemberId, accountIds: [record.id], createdAt: record.createdAt, updatedAt: record.updatedAt };
      });
      parsed.version = 2;
      validateData(parsed);
      await this.persist(parsed);
    }
    validateData(parsed);
    this.data = parsed;
  }

  async all(): Promise<StreamerRecord[]> {
    await this.mutationQueue;
    return this.data.streamers.map(record => this.effective(this.data, record));
  }

  async creatorsForGuild(guildId: string): Promise<CreatorProfile[]> {
    await this.mutationQueue;
    return structuredClone(this.data.creators?.filter(creator => creator.guildId === guildId) ?? []);
  }

  async getCreator(id: string): Promise<CreatorProfile | undefined> {
    await this.mutationQueue;
    const creator = this.data.creators?.find(item => item.id === id);
    return creator ? structuredClone(creator) : undefined;
  }

  addCreator(guildId: string, name: string, discordMemberId?: string): Promise<CreatorProfile> {
    return this.mutate(data => {
      this.assertProfileCapacity(data, guildId);
      const at = new Date().toISOString();
      const creator: CreatorProfile = { id: `creator-${randomUUID()}`, guildId, name: creatorName(name), discordMemberId, accountIds: [], createdAt: at, updatedAt: at };
      (data.creators ??= []).push(creator);
      return structuredClone(creator);
    });
  }

  private assertProfileCapacity(data: BotData, guildId: string): void {
    if ((data.creators ?? []).filter(creator => creator.guildId === guildId).length >= 100) throw new Error('This server already has 100 creator profiles. Choose an existing profile or remove an empty one.');
  }

  updateCreator(guildId: string, id: string, patch: { name?: string; discordMemberId?: string | null }): Promise<CreatorProfile> {
    const input = structuredClone(patch);
    return this.mutate(data => {
      if (Object.keys(input).some(key => !['name', 'discordMemberId'].includes(key))) throw new Error('Creator identity is immutable; unsupported profile field.');
      const creator = data.creators?.find(item => item.id === id && item.guildId === guildId);
      if (!creator) throw new Error('Creator not found in this server.');
      if (Object.hasOwn(input, 'name')) creator.name = creatorName(input.name!);
      if (Object.hasOwn(input, 'discordMemberId')) this.setCreatorMember(data, creator, input.discordMemberId ?? undefined);
      creator.updatedAt = new Date().toISOString();
      return structuredClone(creator);
    });
  }

  private setCreatorMember(data: BotData, creator: CreatorProfile, member: string | undefined): void {
    creator.discordMemberId = member; creator.updatedAt = new Date().toISOString();
    for (const record of data.streamers) if (record.creatorId === creator.id) { record.discordMemberId = member; record.updatedAt = creator.updatedAt; }
  }

  moveAccount(guildId: string, recordId: string, creatorId: string): Promise<StreamerRecord> {
    return this.mutate(data => {
      const record = data.streamers.find(item => item.id === recordId && item.guildId === guildId);
      if (!record) throw new Error('Streamer not found in this server.');
      this.attachAccount(data, record, creatorId);
      record.updatedAt = new Date().toISOString();
      return this.effective(data, record);
    });
  }

  removeCreator(guildId: string, id: string): Promise<CreatorProfile | undefined> {
    return this.mutate(data => {
      const creator = data.creators?.find(item => item.id === id);
      if (!creator) return undefined;
      if (creator.guildId !== guildId) throw new Error('Creator not found in this server.');
      if (data.streamers.some(record => record.creatorId === id)) throw new Error('Remove or move this creator’s configured accounts before deleting the profile.');
      data.creators = data.creators!.filter(item => item.id !== id);
      return structuredClone(creator);
    });
  }

  private attachAccount(data: BotData, record: StreamerRecord, creatorId: string): void {
    const creator = data.creators?.find(item => item.id === creatorId && item.guildId === record.guildId);
    if (!creator) throw new Error('Creator not found in this server.');
    const at = new Date().toISOString();
    for (const previous of data.creators ?? []) if (previous.id !== creator.id && previous.accountIds.includes(record.id)) {
      previous.accountIds = previous.accountIds.filter(id => id !== record.id); previous.updatedAt = at;
    }
    if (!creator.accountIds.includes(record.id)) creator.accountIds.push(record.id);
    creator.updatedAt = at; record.creatorId = creator.id; record.discordMemberId = creator.discordMemberId;
  }

  private effective(data: BotData, record: StreamerRecord): StreamerRecord {
    const result = structuredClone(record), creator = data.creators?.find(item => item.id === record.creatorId);
    if (creator) { result.creatorName = creator.name; result.discordMemberId = creator.discordMemberId; }
    return result;
  }

  async flush(): Promise<void> { await this.mutationQueue; }

  async guildIds(): Promise<string[]> {
    await this.mutationQueue;
    return [...new Set([...this.data.streamers.map(record => record.guildId), ...(this.data.creators ?? []).map(creator => creator.guildId)])];
  }

  async purgeGuild(guildId: string, shouldPurge: () => boolean = () => true): Promise<void> {
    await this.mutate(data => {
      if (!shouldPurge()) return;
      data.streamers = data.streamers.filter(record => record.guildId !== guildId);
      data.creators = data.creators?.filter(creator => creator.guildId !== guildId) ?? [];
    });
  }

  async forGuild(guildId: string, platform?: Platform): Promise<StreamerRecord[]> {
    const records = await this.all();
    return records.filter((record) => record.guildId === guildId && (!platform || record.platform === platform));
  }

  async get(id: string): Promise<StreamerRecord | undefined> {
    await this.mutationQueue;
    const record = this.data.streamers.find((item) => item.id === id);
    return record ? this.effective(this.data, record) : undefined;
  }

  async add(record: StreamerRecord): Promise<StreamerRecord> {
    const input = structuredClone(record);
    return this.mutate((data) => {
      if (data.streamers.some(item => item.id === input.id) || data.creators?.some(item => item.accountIds.includes(input.id))) throw new Error('Streamer ID already exists or has retained history.');
      const duplicate = data.streamers.some((item) =>
        item.guildId === input.guildId &&
        item.platform === input.platform &&
        (accountNameKey(item) === accountNameKey(input) ||
          Boolean(input.platformUserId && item.platformUserId === input.platformUserId)),
      );
      if (duplicate) throw new Error(`${input.username} is already tracked for ${input.platform}.`);
      const creators = data.creators ??= [];
      let creator = creators.find(item => item.id === input.creatorId);
      if (input.creatorId && (!creator || creator.guildId !== input.guildId)) throw new Error('Creator not found in this server.');
      if (!creator) {
        this.assertProfileCapacity(data, input.guildId);
        creator = { id: `creator-${input.id}`, guildId: input.guildId, name: automaticName(input), discordMemberId: input.discordMemberId,
          accountIds: [], createdAt: input.createdAt, updatedAt: input.updatedAt };
        creators.push(creator);
      }
      creator.accountIds.push(input.id); input.creatorId = creator.id; input.discordMemberId = creator.discordMemberId;
      delete input.creatorName;
      data.streamers.push(input);
      return this.effective(data, input);
    });
  }

  async update(id: string, patch: Partial<StreamerRecord>): Promise<StreamerRecord> {
    const input = structuredClone(patch);
    return this.mutate((data) => {
      const index = data.streamers.findIndex((item) => item.id === id);
      if (index < 0) throw new Error('Streamer not found.');
      const current = data.streamers[index]!;
      if ((Object.hasOwn(input, 'id') && input.id !== current.id) || (Object.hasOwn(input, 'guildId') && input.guildId !== current.guildId)) throw new Error('Streamer identity and guild are immutable.');
      if (Object.hasOwn(input, 'creatorName')) throw new Error('Creator name is derived and read-only; edit the creator profile.');
      if (Object.hasOwn(input, 'creatorId') && !input.creatorId) throw new Error('Creator not found in this server.');
      const updated: StreamerRecord = { ...current, ...input, id: current.id, updatedAt: new Date().toISOString() };
      if (input.uploads?.enabled && (!current.uploads?.enabled || input.uploads.channelId !== current.uploads.channelId)) {
        // Enabling or moving the destination establishes a fresh baseline on the
        // next successful check. Delivery history stays available for diagnosis.
        updated.uploadState = { seen: [], deliveries: current.uploadState?.deliveries ?? [] };
      }
      if (data.streamers.some(item => item.id !== id && item.guildId === updated.guildId && item.platform === updated.platform &&
        (accountNameKey(item) === accountNameKey(updated) || Boolean(updated.platformUserId && item.platformUserId === updated.platformUserId)))) throw new Error('This platform account is already tracked.');
      const moving = input.creatorId !== undefined && input.creatorId !== current.creatorId;
      if (moving) this.attachAccount(data, updated, input.creatorId!);
      data.streamers[index] = updated;
      if (!moving && Object.hasOwn(input, 'discordMemberId')) {
        const creator = data.creators!.find(item => item.id === updated.creatorId)!;
        this.setCreatorMember(data, creator, input.discordMemberId);
      }
      return this.effective(data, updated);
    });
  }

  async remove(id: string): Promise<StreamerRecord | undefined> {
    return this.mutate((data) => {
      const index = data.streamers.findIndex((item) => item.id === id);
      if (index < 0) return undefined;
      const [removed] = data.streamers.splice(index, 1);
      return removed ? this.effective(data, removed) : undefined;
    });
  }

  private mutate<T>(mutator: (data: BotData) => T): Promise<T> {
    const operation = this.mutationQueue.then(async () => {
      const draft = structuredClone(this.data);
      const result = mutator(draft);
      validateData(draft);
      await this.persist(draft);
      this.data = draft;
      return result;
    });
    this.mutationQueue = operation.catch(() => undefined);
    return operation;
  }

  private async persist(data = this.data): Promise<void> {
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flush: true });
    await rename(temporaryPath, this.filePath);
  }
}
