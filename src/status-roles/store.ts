import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { assignmentKey, defaultStatusRoleGuild, parseStatusRoleConfig, snowflake, type StatusRoleGuild } from './types.js';

function validateGuild(input: unknown): void {
  const invalid = () => { throw new Error('Invalid status role data; restore status-roles.json before starting.'); };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid();
  const guild = input as StatusRoleGuild;
  guild.config = parseStatusRoleConfig(guild.config);
  if (!guild.assignments || typeof guild.assignments !== 'object' || Array.isArray(guild.assignments)) return invalid();
  for (const [key, assignment] of Object.entries(guild.assignments)) {
    if (!assignment || !snowflake(assignment.memberId) || !snowflake(assignment.roleId) || key !== assignmentKey(assignment.memberId, assignment.roleId) || !['pending-add', 'assigned', 'pending-remove'].includes(assignment.state)) return invalid();
  }
}

/** A single bot process owns this atomic file. Pending receipts precede Discord role mutations. */
export class StatusRoleStore {
  private guilds: Record<string, StatusRoleGuild> = {};
  private tail: Promise<unknown> = Promise.resolve();
  private readonly file: string;
  constructor(directory: string) { this.file = path.join(directory, 'status-roles.json'); }
  async init(): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8'));
      if (data.version !== 1 || !data.guilds || typeof data.guilds !== 'object' || Array.isArray(data.guilds)) throw new Error('Invalid status role file; restore status-roles.json before starting.');
      for (const [id, guild] of Object.entries(data.guilds)) { if (!snowflake(id)) throw new Error('Invalid status role server.'); validateGuild(guild); }
      this.guilds = data.guilds;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  get(id: string): StatusRoleGuild { return structuredClone(this.guilds[id] ?? defaultStatusRoleGuild()); }
  mutate<T>(id: string, update: (guild: StatusRoleGuild) => T): Promise<T> {
    if (!snowflake(id)) return Promise.reject(new Error('Invalid server.'));
    const task = this.tail.then(async () => {
      const next = structuredClone(this.guilds); const guild = next[id] ??= defaultStatusRoleGuild();
      const result = update(guild); await this.write(next); this.guilds = next; return structuredClone(result);
    }); this.tail = task.catch(() => undefined); return task;
  }
  private async write(guilds: Record<string, StatusRoleGuild>): Promise<void> {
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try {
      const file = await open(temporary, 'wx', 0o600);
      try { await file.writeFile(JSON.stringify({ version: 1, guilds })); await file.sync(); } finally { await file.close(); }
      await rename(temporary, this.file);
    } finally { await rm(temporary, { force: true }); }
  }
  async guildIds(): Promise<string[]> { return Object.keys(this.guilds); }
  async flush(): Promise<void> { await this.tail; }
  async purgeGuild(id: string, guard: () => boolean = () => true): Promise<void> {
    const task = this.tail.then(async () => {
      if (!guard() || !Object.hasOwn(this.guilds, id)) return;
      const next = structuredClone(this.guilds); delete next[id]; await this.write(next); this.guilds = next;
    }); this.tail = task.catch(() => undefined); await task;
  }
}
