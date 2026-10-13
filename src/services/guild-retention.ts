import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { Events, type Client, type Guild } from 'discord.js';
import type { Logger } from '../logger.js';

interface GuildStore {
  guildIds(): Promise<string[]>;
  // The predicate must run inside the store's serialized mutation, before deletion.
  purgeGuild(guildId: string, shouldPurge?: () => boolean): Promise<void>;
}
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export class GuildRetention {
  private removed: Record<string, number> = {};
  private queue: Promise<unknown> = Promise.resolve();
  private timer?: NodeJS.Timeout;
  private attached = false;
  private stopped = false;
  private readonly epochs = new Map<string, number>();
  private readonly resetSince = new Map<string, number>();

  constructor(private client: Client, private file: string, private stores: GuildStore[], private logger: Logger) {}

  async init(): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    try {
      const value = JSON.parse(await readFile(this.file, 'utf8')) as Record<string, number>;
      if (!value || typeof value !== 'object' || Array.isArray(value) || Object.entries(value).some(([id, time]) => !/^\d{17,20}$/.test(id) || !Number.isFinite(time))) throw new Error('Invalid removed-guilds journal.');
      this.removed = value;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }

  attach(): void {
    if (this.attached || this.stopped) return;
    this.attached = true;
    this.client.on(Events.GuildDelete, this.onGuildDelete);
    this.client.on(Events.GuildCreate, this.onGuildCreate);
  }

  private changed(guildId: string): number {
    const epoch = (this.epochs.get(guildId) ?? 0) + 1;
    this.epochs.set(guildId, epoch);
    return epoch;
  }
  private schedule(): void {
    void this.reconcile().catch(error => this.logger.error('Guild retention update failed.', String(error)));
  }
  private readonly onGuildDelete = (guild: Guild): void => {
    if (this.stopped) return;
    // discord.js emits GuildUnavailable separately. A real deletion can follow an outage.
    this.changed(guild.id);
    this.schedule();
  };
  private readonly onGuildCreate = (guild: Guild): void => {
    if (this.stopped) return;
    this.resetSince.set(guild.id, this.changed(guild.id));
    this.schedule();
  };

  start(): void {
    if (this.stopped || this.timer) return;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 3_600_000);
    this.timer.unref();
  }
  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    if (this.attached) {
      this.client.off(Events.GuildDelete, this.onGuildDelete);
      this.client.off(Events.GuildCreate, this.onGuildCreate);
      this.attached = false;
    }
    await this.flush();
  }
  async flush(): Promise<void> {
    let pending: Promise<unknown>;
    do { pending = this.queue; await pending; } while (pending !== this.queue);
  }

  reconcile(now = Date.now()): Promise<void> {
    if (this.stopped) return Promise.resolve();
    const operation = this.queue.then(async () => {
      if (!this.client.isReady()) return;
      const epochs = new Map(this.epochs);
      const resets = new Map(this.resetSince);
      const draft = { ...this.removed };
      for (const id of resets.keys()) delete draft[id];
      const ids = new Set((await Promise.all(this.stores.map(store => store.guildIds()))).flat());
      if (!this.client.isReady()) return;
      for (const id of this.client.guilds.cache.keys()) delete draft[id];
      for (const id of ids) if (!this.client.guilds.cache.has(id) && draft[id] === undefined) draft[id] = now;
      for (const [id, since] of Object.entries(draft)) {
        if (now - since < RETENTION_MS) continue;
        const shouldPurge = () => !this.stopped && this.client.isReady() && !this.client.guilds.cache.has(id) && this.epochs.get(id) === epochs.get(id);
        for (const store of this.stores) {
          if (!shouldPurge()) break;
          await store.purgeGuild(id, shouldPurge);
        }
        if (shouldPurge()) {
          delete draft[id];
          this.logger.info('Removed guild data deleted after 30 days.', { guildId: id });
        } else if (this.client.guilds.cache.has(id) || this.epochs.get(id) !== epochs.get(id)) {
          // A rejoin invalidates the old clock, including a rejoin followed by another removal.
          delete draft[id];
        }
      }
      const temp = `${this.file}.${process.pid}.tmp`;
      await writeFile(temp, JSON.stringify(draft, null, 2), { encoding: 'utf8', mode: 0o600, flush: true });
      await rename(temp, this.file);
      this.removed = draft;
      for (const [id, epoch] of resets) if (this.resetSince.get(id) === epoch) this.resetSince.delete(id);
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}
