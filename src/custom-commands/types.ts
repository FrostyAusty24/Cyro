import { BotMessageError } from '../i18n/index.js';

export const MAX_CUSTOM_COMMANDS = 25;
export const snowflake = (value: unknown): value is string => typeof value === 'string' && /^\d{17,20}$/.test(value);
export const commandId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export interface CustomCommand {
  id: string; revision: number; name: string; description: string;
  mode: 'text' | 'embed'; content: string; title: string; color: string;
  channelIds: string[]; ephemeral: boolean;
}
export interface CommandRecord extends CustomCommand {
  discordId: string | null; status: 'pending' | 'synced' | 'error' | 'deleting';
}
export function fields(value: unknown, keys: string[]): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key));
}
export function parseCommand(input: unknown): CustomCommand {
  const invalid = (): never => { throw new BotMessageError('Check the command name, description, reply and selected channels.'); };
  if (!fields(input, ['id','revision','name','description','mode','content','title','color','channelIds','ephemeral'])) return invalid();
  const c = input as unknown as CustomCommand;
  if (!commandId(c.id) || !Number.isSafeInteger(c.revision) || c.revision < 0 || typeof c.name !== 'string' || !/^[\p{Ll}\p{Lo}\p{N}_-]{1,32}$/u.test(c.name)
    || typeof c.description !== 'string' || !c.description.trim() || c.description.length > 100
    || !['text','embed'].includes(c.mode) || typeof c.content !== 'string' || !c.content.trim() || c.content.length > (c.mode === 'text' ? 2000 : 4000)
    || typeof c.title !== 'string' || c.title.length > 256 || typeof c.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(c.color)
    || typeof c.ephemeral !== 'boolean' || !Array.isArray(c.channelIds) || c.channelIds.length > 25 || c.channelIds.some(id => !snowflake(id)) || new Set(c.channelIds).size !== c.channelIds.length) return invalid();
  return structuredClone({ ...c, description: c.description.trim() });
}
export function commandConfig(record: CommandRecord): CustomCommand {
  const { discordId: _id, status: _status, ...config } = record; return config;
}
/** Literal single-pass substitution; inserted names cannot introduce additional placeholders. */
export function renderTemplate(template: string, values: Record<string, string>, max: number): string {
  const rendered = template.replace(/\{(mention|server|user|channel)\}/g, token => values[token.slice(1,-1)] ?? token);
  if (rendered.length <= max) return rendered;
  let text = rendered.slice(0, max - 1);
  if (/[\uD800-\uDBFF]$/.test(text)) text = text.slice(0,-1);
  return text + '…';
}
