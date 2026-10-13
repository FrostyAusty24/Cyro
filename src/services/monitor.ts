import type { Logger } from '../logger.js';
import type { ProviderMap } from '../providers/index.js';
import type { JsonStore } from '../storage/store.js';
import type { Platform, StreamerRecord } from '../types.js';
import type { AlertService } from './alert-service.js';

export interface CheckFilter {
  guildId?: string;
  platform?: Platform;
  recordId?: string;
  includeDisabled?: boolean;
}

export interface CheckSummary {
  checked: number;
  live: number;
  offline: number;
  errors: number;
}

export class StreamMonitor {
  private timer?: NodeJS.Timeout;
  private initialTimer?: NodeJS.Timeout;
  private running = false;
  private operations: Promise<unknown> = Promise.resolve();

  withLock<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.operations.then(operation);
    this.operations = next.catch(() => undefined);
    return next;
  }

  constructor(
    private readonly store: JsonStore,
    private readonly providers: ProviderMap,
    private readonly alerts: AlertService,
    private readonly logger: Logger,
    private readonly intervalSeconds: number,
    private readonly guildActive: (guildId: string) => boolean = () => true,
    private readonly analytics?: { pause(recordId: string): Promise<void>; pauseAll(): Promise<void>; pauseGuild(guildId: string): Promise<void> },
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.check(), this.intervalSeconds * 1000);
    this.timer.unref();
    this.initialTimer = setTimeout(() => void this.check(), 3_000);
    this.initialTimer.unref();
    this.logger.info('Stream monitor started.', { intervalSeconds: this.intervalSeconds });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.initialTimer) clearTimeout(this.initialTimer);
    this.timer = undefined;
    this.initialTimer = undefined;
  }

  pauseTracking(guildId?: string): Promise<void> {
    // Enqueue immediately in analytics' own write queue, ahead of observations from an in-flight poll.
    // Also join the monitor queue so shutdown drains this event's work.
    const paused = (guildId ? this.analytics?.pauseGuild(guildId) : this.analytics?.pauseAll()) ?? Promise.resolve();
    void paused.catch(() => undefined);
    return this.withLock(() => paused);
  }

  async check(filter: CheckFilter = {}): Promise<CheckSummary> {
    if (this.running) return { checked: 0, live: 0, offline: 0, errors: 0 };
    this.running = true;
    return this.withLock(async () => {
    const summary: CheckSummary = { checked: 0, live: 0, offline: 0, errors: 0 };
    try {
      const all = await this.store.all();
      for (const record of all) {
        if (!record.enabled || !this.guildActive(record.guildId)) await this.analytics?.pause(record.id);
      }
      const records = all.filter((record) =>
        this.guildActive(record.guildId) &&
        (filter.includeDisabled || record.enabled || record.uploads?.enabled) &&
        (!filter.guildId || record.guildId === filter.guildId) &&
        (!filter.platform || record.platform === filter.platform) &&
        (!filter.recordId || record.id === filter.recordId),
      );
      summary.checked = records.length;
      for (const platform of Object.keys(this.providers) as Platform[]) {
        const group = records.filter((record) => record.platform === platform);
        if (!group.length) continue;
        const provider = this.providers[platform];
        const liveGroup = group.filter(record => filter.includeDisabled || record.enabled);
        if (liveGroup.length) {
          const results = await provider.checkMany(liveGroup);
          for (const record of liveGroup) await this.apply(record, results.get(record.id), summary);
        }
        const uploadGroup = group.filter(record => record.uploads?.enabled);
        if (uploadGroup.length) {
          const uploads = provider.checkUploads ? await provider.checkUploads(uploadGroup) : undefined;
          for (const record of uploadGroup) {
            if (!this.guildActive(record.guildId)) continue;
            try { await this.alerts.applyUploads(record, uploads?.get(record.id) ?? { kind: 'error', error: 'Automatic upload checks are unavailable for this platform.' }); }
            catch (error) {
              summary.errors++;
              this.logger.error('Could not apply an upload notification.', { streamerId: record.id, error: error instanceof Error ? error.message : String(error) });
            }
          }
        }
      }
    } catch (error) {
      await this.analytics?.pauseAll();
      this.logger.error('Monitor pass failed.', error instanceof Error ? error.message : error);
      summary.errors += 1;
    } finally {
      this.running = false;
    }
    return summary;
    });
  }

  private async apply(record: StreamerRecord, result: Awaited<ReturnType<ProviderMap[Platform]['checkMany']>> extends Map<string, infer R> ? R | undefined : never, summary: CheckSummary): Promise<void> {
    if (!this.guildActive(record.guildId)) { await this.analytics?.pause(record.id); return; }
    if (!result || result.kind === 'error') {
      await this.analytics?.pause(record.id);
      summary.errors += 1;
      this.logger.warn('Streamer check returned an error; state was preserved.', {
        platform: record.platform,
        username: record.username,
        error: result?.error ?? 'Provider returned no result.',
      });
      return;
    }
    try {
      if (result.kind === 'live') {
        summary.live += 1;
        await this.alerts.markLive(record, result.snapshot);
      } else {
        summary.offline += 1;
        await this.alerts.markOffline(record);
      }
    } catch (error) {
      summary.errors += 1;
      await this.analytics?.pause(record.id);
      this.logger.error('Could not apply a streamer state change.', {
        streamerId: record.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
