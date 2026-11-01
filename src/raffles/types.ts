import { randomInt, randomUUID } from 'node:crypto';
import { BotMessageError } from '../i18n/index.js';

export const MAX_ENTRIES = 100;
export const MAX_OPEN = 5;
export const MAX_HISTORY = 100;
export const SPIN_VISIBLE_MS = 8_000;
export const snowflake = (value: unknown): value is string => typeof value === 'string' && /^\d{17,20}$/.test(value);
export const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
export const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
export const fail = (message: string): never => { throw new BotMessageError(message); };
export interface Entry { id: string; name: string; userId: string | null }
export interface Draw { index: number | null; claimedAt: number; finishAt: number | null; animationFailed: boolean }
export interface Raffle {
  id: string; revision: number; title: string; description: string; color: string; channelId: string; messageId: string | null;
  hostId: string; createdAt: number; endsAt: number | null; allowEntries: boolean;
  status: 'posting' | 'open' | 'drawing' | 'ended' | 'cancelled'; entries: Entry[]; draw: Draw | null;
  needsSync: boolean; problem: 'posting' | 'discord' | null;
}
export function cleanName(value: unknown): string {
  if (typeof value !== 'string') return fail('Enter one name per line, up to 48 characters each.');
  const name = value.normalize('NFC').replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, '').trim();
  if (!name || name.length > 48) return fail('Enter one name per line, up to 48 characters each.');
  return name;
}
export const nameKey = (name: string) => name.normalize('NFC').toLocaleLowerCase('en-US');
export function names(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_ENTRIES) return fail('A wheel can have up to 100 entries.');
  const result = value.map(cleanName);
  if (new Set(result.map(nameKey)).size !== result.length) return fail('Each name must appear only once on the wheel.');
  return result;
}
export function newRaffle(input: unknown, hostId: string, now: number): Raffle {
  if (!object(input) || Object.keys(input).some(key => !['id','title','description','color','channelId','endsAt','allowEntries','names'].includes(key))
    || !uuid(input.id) || !snowflake(hostId) || !snowflake(input.channelId) || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 180
    || typeof input.description !== 'string' || input.description.length > 2000 || typeof input.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(input.color)
    || typeof input.allowEntries !== 'boolean') return fail('Check the wheel title, description, color and channel.');
  if (input.endsAt !== null && (!Number.isSafeInteger(input.endsAt) || (input.endsAt as number) < now + 60_000 || (input.endsAt as number) > now + 30 * 86400_000)) return fail('Choose a spin time between one minute and 30 days from now, or use manual spin.');
  return { id: input.id, revision: 1, title: input.title.trim(), description: input.description.trim(), color: input.color, channelId: input.channelId,
    messageId: null, hostId, createdAt: now, endsAt: input.endsAt as number | null, allowEntries: input.allowEntries,
    status: 'posting', entries: names(input.names).map(name => ({ id: randomUUID(), name, userId: null })), draw: null, needsSync: true, problem: null };
}
export function claimDraw(raffle: Raffle, now: number, choose: (max: number) => number = randomInt): boolean {
  if (raffle.status !== 'open') return false;
  const index = raffle.entries.length ? choose(raffle.entries.length) : null;
  if (index !== null && (!Number.isSafeInteger(index) || index < 0 || index >= raffle.entries.length)) throw new Error('Invalid random selection.');
  raffle.draw = { index, claimedAt: now, finishAt: index === null ? now : null, animationFailed: false };
  raffle.status = 'drawing'; raffle.revision++; raffle.needsSync = true; raffle.problem = null;
  return true;
}
export function addEntries(raffle: Raffle, additions: Entry[], now: number): void {
  if (raffle.status !== 'open' || (raffle.endsAt !== null && raffle.endsAt <= now)) return fail('Entries are closed for this wheel.');
  if (raffle.entries.length + additions.length > MAX_ENTRIES) return fail('A wheel can have up to 100 entries.');
  const keys = new Set(raffle.entries.map(entry => nameKey(entry.name))), users = new Set(raffle.entries.flatMap(entry => entry.userId ? [entry.userId] : []));
  for (const entry of additions) {
    if (keys.has(nameKey(entry.name)) || (entry.userId && users.has(entry.userId))) return fail('That member or name is already on the wheel.');
    keys.add(nameKey(entry.name)); if (entry.userId) users.add(entry.userId);
  }
  raffle.entries.push(...additions); raffle.revision++; raffle.needsSync = true;
}
export function validateRaffle(value: unknown): asserts value is Raffle {
  if (!object(value)) throw new Error('Invalid raffle data.');
  const r = value as unknown as Raffle;
  if (!uuid(r.id) || !Number.isSafeInteger(r.revision) || r.revision < 1 || !snowflake(r.channelId) || !snowflake(r.hostId)
    || (r.messageId !== null && !snowflake(r.messageId)) || !Number.isSafeInteger(r.createdAt) || r.createdAt < 0
    || (r.endsAt !== null && (!Number.isSafeInteger(r.endsAt) || r.endsAt < 0)) || typeof r.allowEntries !== 'boolean'
    || typeof r.title !== 'string' || !r.title.trim() || r.title.length > 180 || typeof r.description !== 'string' || r.description.length > 2000
    || typeof r.color !== 'string' || !/^#[a-f0-9]{6}$/i.test(r.color) || !['posting','open','drawing','ended','cancelled'].includes(r.status)
    || typeof r.needsSync !== 'boolean' || ![null,'posting','discord'].includes(r.problem) || !Array.isArray(r.entries) || r.entries.length > MAX_ENTRIES) throw new Error('Invalid raffle data.');
  const ids = new Set<string>(), labels = new Set<string>(), users = new Set<string>();
  for (const entry of r.entries) {
    if (!object(entry) || !uuid(entry.id) || ids.has(entry.id) || typeof entry.name !== 'string' || cleanName(entry.name) !== entry.name || labels.has(nameKey(entry.name))
      || (entry.userId !== null && (!snowflake(entry.userId) || users.has(entry.userId)))) throw new Error('Invalid raffle entry.');
    ids.add(entry.id); labels.add(nameKey(entry.name)); if (entry.userId) users.add(entry.userId);
  }
  if (r.status !== 'posting' && !r.messageId) throw new Error('Missing raffle post.');
  if (r.draw !== null) {
    const d = r.draw;
    if (!object(d) || !['drawing','ended'].includes(r.status) || !Number.isSafeInteger(d.claimedAt) || d.claimedAt < 0
      || (d.finishAt !== null && (!Number.isSafeInteger(d.finishAt) || d.finishAt < d.claimedAt)) || typeof d.animationFailed !== 'boolean'
      || (d.index === null ? r.entries.length !== 0 : !Number.isInteger(d.index) || d.index < 0 || d.index >= r.entries.length)) throw new Error('Invalid saved raffle draw.');
  } else if (['drawing','ended'].includes(r.status)) throw new Error('Missing saved raffle draw.');
}
