export interface TicketType {
  id: string; name: string; enabled: boolean; categoryId: string | null; archiveCategoryId: string | null;
  logChannelId: string | null; staffRoleIds: string[]; maxOpenPerUser: number; closeAction?: 'archive' | 'delete';
}
export interface ApplicationForm {
  id: string; name: string; enabled: boolean; reviewChannelId: string | null; reviewerRoleIds: string[];
  acceptedRoleId: string | null; questions: string[];
}
export interface SupportPanel {
  id: string; name: string; kind: 'tickets' | 'applications'; presentation: 'buttons' | 'select';
  title: string; description: string; options: { id: string; label: string }[];
}
export interface ModerationConfig {
  enabled: boolean;
  modLogChannelId: string | null;
  blockedWords: string[];
  antiSpam: { enabled: boolean; maxMessages: number; windowSeconds: number; timeoutMinutes: number };
  tickets: { enabled: boolean; categoryId: string | null; archiveCategoryId: string | null; logChannelId: string | null; staffRoleIds: string[]; maxOpenPerUser: number; closeAction?: 'archive' | 'delete'; types?: TicketType[] };
  applications: { enabled: boolean; reviewChannelId: string | null; reviewerRoleIds: string[]; acceptedRoleId: string | null; questions: string[]; forms?: ApplicationForm[] };
  panels?: SupportPanel[];
}
export const DEFAULT_CONFIG: ModerationConfig = {
  enabled: false, modLogChannelId: null, blockedWords: [],
  antiSpam: { enabled: false, maxMessages: 6, windowSeconds: 8, timeoutMinutes: 5 },
  tickets: { enabled: false, categoryId: null, archiveCategoryId: null, logChannelId: null, staffRoleIds: [], maxOpenPerUser: 2, closeAction: 'archive', types: [] },
  applications: { enabled: false, reviewChannelId: null, reviewerRoleIds: [], acceptedRoleId: null, questions: ['Why would you like to join the team?', 'What experience can you bring?'], forms: [] },
  panels: [],
};
export function ticketTypes(config: ModerationConfig): TicketType[] {
  const { types, ...legacy } = config.tickets;
  return types?.length ? types : [{ id: 'default', name: 'Support', ...legacy }];
}
export function applicationForms(config: ModerationConfig): ApplicationForm[] {
  const { forms, ...legacy } = config.applications;
  return forms?.length ? forms : [{ id: 'default', name: 'Team application', ...legacy }];
}
export const isSnowflake = (value: unknown): value is string => typeof value === 'string' && /^\d{17,20}$/.test(value);
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Settings must be an object.');
  return value as Record<string, unknown>;
}
function mergeKnown(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const result = structuredClone(base);
  for (const key of Object.keys(patch)) {
    if (!Object.hasOwn(base, key)) throw new Error(`Unknown setting: ${key}`);
    const original = base[key];
    result[key] = original && typeof original === 'object' && !Array.isArray(original)
      ? mergeKnown(original as Record<string, unknown>, object(patch[key])) : patch[key];
  }
  return result;
}
export function mergeConfig(current: ModerationConfig | undefined, patch: unknown): ModerationConfig {
  const base = { ...DEFAULT_CONFIG, ...current, tickets: { ...DEFAULT_CONFIG.tickets, ...current?.tickets }, applications: { ...DEFAULT_CONFIG.applications, ...current?.applications } };
  const next = mergeKnown(base as unknown as Record<string, unknown>, object(patch)) as unknown as ModerationConfig;
  if (next.tickets.closeAction !== 'archive' && next.tickets.closeAction !== 'delete') throw new Error('Ticket close action must be archive or delete.');
  for (const value of [next.enabled, next.antiSpam.enabled, next.tickets.enabled, next.applications.enabled]) if (typeof value !== 'boolean') throw new Error('Enabled settings must be true or false.');
  for (const id of [next.modLogChannelId, next.tickets.categoryId, next.tickets.archiveCategoryId, next.tickets.logChannelId, next.applications.reviewChannelId, next.applications.acceptedRoleId]) if (id !== null && !isSnowflake(id)) throw new Error('Channel and role IDs must be Discord IDs or null.');
  for (const ids of [next.tickets.staffRoleIds, next.applications.reviewerRoleIds]) if (!Array.isArray(ids) || ids.length > 20 || ids.some(id => !isSnowflake(id))) throw new Error('Staff roles must be a list of up to 20 Discord role IDs.');
  for (const [value, min, max] of [[next.antiSpam.maxMessages, 3, 30], [next.antiSpam.windowSeconds, 3, 60], [next.antiSpam.timeoutMinutes, 1, 1440], [next.tickets.maxOpenPerUser, 1, 5]]) if (!Number.isInteger(value) || value! < min! || value! > max!) throw new Error(`Numeric setting must be between ${min} and ${max}.`);
  if (!Array.isArray(next.blockedWords) || next.blockedWords.length > 100 || next.blockedWords.some(word => typeof word !== 'string' || !word.trim() || word.length > 80)) throw new Error('Blocked words must contain up to 100 nonempty phrases of at most 80 characters.');
  next.blockedWords = [...new Set(next.blockedWords.map(word => word.trim().toLocaleLowerCase()))];
  if (!Array.isArray(next.applications.questions) || next.applications.questions.length < 1 || next.applications.questions.length > 5 || next.applications.questions.some(q => typeof q !== 'string' || !q.trim() || q.length > 100)) throw new Error('Applications require 1–5 questions, each up to 100 characters.');
  if (next.tickets.archiveCategoryId && next.tickets.archiveCategoryId === next.tickets.categoryId) throw new Error('Choose an archive category separate from the active ticket category.');
  validateDefinitions(next);
  return next;
}

function fields(value: unknown, keys: string[]): Record<string, unknown> {
  const item = object(value);
  if (Object.keys(item).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(item, key))) throw new Error('Support definitions must contain only their required settings.');
  return item;
}
function text(value: unknown, limit: number, name: string, empty = false): void {
  if (typeof value !== 'string' || (!empty && !value.trim()) || value.length > limit) throw new Error(`${name} must be ${empty ? 'at most' : '1–'}${limit} characters.`);
}
function id(value: unknown, allowDefault = false): void {
  if (typeof value !== 'string' || !/^[a-z0-9_-]{1,40}$/.test(value) || (!allowDefault && value === 'default')) throw new Error('Support IDs must use 1–40 lowercase letters, digits, dashes or underscores; default is reserved.');
}
function ids(value: unknown): void {
  if (!Array.isArray(value) || value.length > 20 || value.some(entry => !isSnowflake(entry)) || new Set(value).size !== value.length) throw new Error('Staff roles must contain up to 20 unique Discord role IDs.');
}
function list(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length > 25) throw new Error(`${label} supports up to 25 entries.`);
  const seen = new Set();
  for (const raw of value) { const entry = object(raw); id(entry.id); if (seen.has(entry.id)) throw new Error(`${label} IDs must be unique.`); seen.add(entry.id); }
}
function validateDefinitions(config: ModerationConfig): void {
  list(config.tickets.types, 'Ticket types'); list(config.applications.forms, 'Application forms'); list(config.panels, 'Support panels');
  for (const raw of config.tickets.types) {
    const item = fields({ closeAction: 'archive', ...raw }, ['id', 'name', 'enabled', 'categoryId', 'archiveCategoryId', 'logChannelId', 'staffRoleIds', 'maxOpenPerUser', 'closeAction']);
    if (item.closeAction !== 'archive' && item.closeAction !== 'delete') throw new Error('Ticket close action must be archive or delete.');
    raw.closeAction = item.closeAction;
    text(item.name, 80, 'Ticket type name');
    if (typeof item.enabled !== 'boolean') throw new Error('Ticket type enabled must be true or false.');
    for (const key of ['categoryId', 'archiveCategoryId', 'logChannelId']) if (item[key] !== null && !isSnowflake(item[key])) throw new Error('Ticket destinations must be Discord IDs or null.');
    ids(item.staffRoleIds);
    if (!Number.isInteger(item.maxOpenPerUser) || (item.maxOpenPerUser as number) < 1 || (item.maxOpenPerUser as number) > 5) throw new Error('Ticket limits must be between 1 and 5.');
    if (item.categoryId && item.categoryId === item.archiveCategoryId) throw new Error('Choose an archive category separate from the active ticket category.');
    if (item.enabled && (!item.categoryId || !item.logChannelId || !(item.staffRoleIds as string[]).length)) throw new Error('Enabled ticket types need a category, private log channel and staff roles.');
  }
  for (const raw of config.applications.forms) {
    const item = fields(raw, ['id', 'name', 'enabled', 'reviewChannelId', 'reviewerRoleIds', 'acceptedRoleId', 'questions']);
    text(item.name, 80, 'Application form name');
    if (typeof item.enabled !== 'boolean') throw new Error('Application form enabled must be true or false.');
    for (const key of ['reviewChannelId', 'acceptedRoleId']) if (item[key] !== null && !isSnowflake(item[key])) throw new Error('Application channel and role must be Discord IDs or null.');
    ids(item.reviewerRoleIds);
    if (!Array.isArray(item.questions) || item.questions.length < 1 || item.questions.length > 5) throw new Error('Applications require 1–5 questions.');
    for (const question of item.questions) text(question, 100, 'Application question');
    if (item.enabled && (!item.reviewChannelId || !(item.reviewerRoleIds as string[]).length)) throw new Error('Enabled application forms need a private review channel and reviewer roles.');
  }
  for (const raw of config.panels) {
    const item = fields(raw, ['id', 'name', 'kind', 'presentation', 'title', 'description', 'options']);
    text(item.name, 80, 'Panel name'); text(item.title, 256, 'Panel title'); text(item.description, 2000, 'Panel description', true);
    if (item.kind !== 'tickets' && item.kind !== 'applications') throw new Error('Panel kind must be tickets or applications.');
    if (item.presentation !== 'buttons' && item.presentation !== 'select') throw new Error('Panel presentation must be buttons or select.');
    if (!Array.isArray(item.options) || item.options.length < 1 || item.options.length > 25) throw new Error('Panels require 1–25 options.');
    const available = item.kind === 'tickets' ? ticketTypes(config) : applicationForms(config);
    const seen = new Set();
    for (const option of item.options) {
      const choice = fields(option, ['id', 'label']); id(choice.id, true); text(choice.label, 80, 'Option label');
      if (seen.has(choice.id)) throw new Error('Panel options must be unique.'); seen.add(choice.id);
      if (!available.some(entry => entry.id === choice.id)) throw new Error('Every panel option must reference a ticket type or application form in this server.');
    }
  }
}


