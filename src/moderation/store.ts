import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_CONFIG, isSnowflake, ticketTypes, applicationForms, type ModerationConfig, type TicketType, type ApplicationForm } from './core.js';
export interface SupportOperation {
  id: string;
  kind: 'ticket-create' | 'ticket-close' | 'application-submit' | 'application-accept';
  stage: 'prepared' | 'sending' | 'transcript-saved' | 'archiving' | 'deleting' | 'role-changing' | 'needs-review';
  startedAt: string;
  actorId: string;
  detail?: string;
  transcriptChannelId?: string;
  transcriptMessageId?: string;
  archiveCategoryId?: string | null;
  roleId?: string | null;
  roleAlreadyPresent?: boolean;
  staffClose?: boolean;
  externalAttempted?: boolean;
  closeAction?: 'archive' | 'delete';
  transcript?: TicketTranscript;
  deleteAttempted?: boolean;
}
export interface TicketTranscript { filename: string; sha256: string; sourceSha256: string; messageCount: number; newestMessageId: string | null; savedAt: string; channelId?: string; messageId?: string; unsupportedContent?: string[] }
export interface ModCase { id: string; action: string; userId: string; actorId: string; reason: string; createdAt: string }
export interface Ticket { id: string; channelId: string; ownerId: string; status: 'open' | 'closed'; createdAt: string; claimedBy: string | null; claimedAt: string | null; closedBy: string | null; closedAt: string | null; operation?: SupportOperation; ticketType?: TicketType; transcript?: TicketTranscript }
export interface Application { id: string; userId: string; status: 'pending' | 'accepted' | 'denied'; createdAt: string; reviewedBy: string | null; reviewedAt: string | null; answers: string[]; questions: string[]; messageId: string | null; channelId: string; operation?: SupportOperation; applicationForm?: ApplicationForm }
export interface GuildState { config: ModerationConfig; cases: ModCase[]; tickets: Ticket[]; applications: Application[] }
const empty = (): GuildState => ({ config: structuredClone(DEFAULT_CONFIG), cases: [], tickets: [], applications: [] });

export class ModerationPersistenceError extends Error {
  constructor(cause: unknown) { super(`Moderation storage failed: ${cause instanceof Error ? cause.message : 'unknown error'}`, { cause }); this.name = 'ModerationPersistenceError'; }
}

export class ModerationStore {
  private state: Record<string, GuildState> = {};
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly filename: string, private readonly writer?: (data: string) => Promise<void>) {}
  async init(): Promise<void> {
    await mkdir(path.dirname(this.filename), { recursive: true });
    try {
      const parsed: unknown = JSON.parse(await readFile(this.filename, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid moderation database.');
      for (const [id, value] of Object.entries(parsed)) {
        if (!isSnowflake(id) || !value || typeof value !== 'object' || !Array.isArray(value.cases) || !Array.isArray(value.tickets) || !Array.isArray(value.applications) || !value.config) throw new Error('Invalid moderation guild record.');
        value.config.tickets = { ...DEFAULT_CONFIG.tickets, ...value.config.tickets, visibility: value.config.tickets.visibility ?? 'private' };
        for (const type of value.config.tickets.types ?? []) type.visibility ??= 'private';
        value.config.applications = { ...DEFAULT_CONFIG.applications, ...value.config.applications };
        value.config.panels ??= [];
        // Freeze the historical audience and destinations before an administrator can edit definitions.
        for (const ticket of value.tickets) {
          ticket.ticketType ??= structuredClone(ticketTypes(value.config)[0]);
          if (ticket.ticketType) ticket.ticketType.visibility ??= 'private';
        }
        for (const application of value.applications) application.applicationForm ??= { ...structuredClone(applicationForms(value.config)[0]), questions: [...application.questions], reviewChannelId: application.channelId };
      }
      this.state = parsed as Record<string, GuildState>;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  read(guildId: string): GuildState {
    if (!isSnowflake(guildId)) throw new Error('Invalid guild ID.');
    return structuredClone(this.state[guildId] ?? empty());
  }
  update<T>(guildId: string, mutate: (state: GuildState) => T | Promise<T>): Promise<T> {
    if (!isSnowflake(guildId)) return Promise.reject(new Error('Invalid guild ID.'));
    const operation = this.queue.then(async () => {
      const next = structuredClone(this.state);
      const state = next[guildId] ??= empty();
      const result = await mutate(state);
      // Retain bounded history. Open tickets and pending applications also have creation caps.
      state.cases = state.cases.slice(-2000);
      const closed = state.tickets.filter(t => t.status === 'closed').slice(-2000);
      state.tickets = [...closed, ...state.tickets.filter(t => t.status === 'open')];
      const completed = state.applications.filter(a => a.status !== 'pending').slice(-500).map(a => ({ ...a, answers: [] }));
      state.applications = [...completed, ...state.applications.filter(a => a.status === 'pending')];
      await this.persist(JSON.stringify(next, null, 2));
      this.state = structuredClone(next);
      return result;
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  guildIds(): string[] { return Object.keys(this.state); }
  purgeGuild(guildId: string, shouldPurge: () => boolean = () => true): Promise<void> {
    if (!isSnowflake(guildId)) return Promise.reject(new Error('Invalid guild ID.'));
    const operation = this.queue.then(async () => { if (!shouldPurge()) return; const next = structuredClone(this.state); delete next[guildId]; await this.persist(JSON.stringify(next, null, 2)); this.state = next; });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  async flush(): Promise<void> { await this.queue; }
  private async persist(data: string): Promise<void> {
    const temporary = `${this.filename}.${randomUUID()}.tmp`;
    try { if (this.writer) await this.writer(data); else { await writeFile(temporary, data, { encoding: 'utf8', mode: 0o600, flush: true }); await rename(temporary, this.filename); } }
    catch (error) { throw new ModerationPersistenceError(error); }
    finally { await rm(temporary, { force: true }).catch(() => undefined); }
  }
}


