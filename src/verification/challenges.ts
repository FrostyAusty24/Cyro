import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const CHALLENGE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CHALLENGE_TTL_MS = 5 * 60_000;
const ISSUE_COOLDOWN_MS = 20_000;
const FAILURE_COOLDOWN_MS = 60_000;
const MAX_ENTRIES = 10_000;
export interface ChallengeBinding { guildId: string; userId: string; channelId: string; panelId: string; roleId: string }
interface Challenge extends ChallengeBinding { token: string; digest: Buffer; expiresAt: number; attempts: number }
export type ChallengeResult = { kind: 'success'; binding: ChallengeBinding } | { kind: 'wrong'; remaining: number } | { kind: 'invalid' | 'locked' };

function digest(value: string): Buffer { return createHash('sha256').update(value.trim().toUpperCase()).digest(); }
function memberKey(binding: Pick<ChallengeBinding, 'guildId' | 'userId'>): string { return `${binding.guildId}:${binding.userId}`; }
function same(left: ChallengeBinding, right: Pick<ChallengeBinding, 'guildId' | 'userId'>): boolean { return left.guildId === right.guildId && left.userId === right.userId; }

/** Private, in-memory challenges deliberately expire across restarts. No answers are persisted. */
export class VerificationChallenges {
  private readonly challenges = new Map<string, Challenge>();
  private readonly cooldowns = new Map<string, number>();
  constructor(private readonly now: () => number = Date.now, private readonly makeCode: () => string = () => Array.from({ length: 6 }, () => CHALLENGE_ALPHABET[randomInt(CHALLENGE_ALPHABET.length)]).join('')) {}
  private prune(): void {
    const now = this.now();
    for (const [token, entry] of this.challenges) if (entry.expiresAt <= now) this.challenges.delete(token);
    for (const [key, expiry] of this.cooldowns) if (expiry <= now) this.cooldowns.delete(key);
  }
  issue(binding: ChallengeBinding): { token: string; code: string } {
    this.prune();
    const key = memberKey(binding);
    if (this.cooldowns.has(key)) throw new Error('Please wait before requesting another verification image. You can still answer your current image.');
    if (this.challenges.size >= MAX_ENTRIES || this.cooldowns.size >= MAX_ENTRIES) throw new Error('Verification is busy. Please try again shortly.');
    for (const [token, entry] of this.challenges) if (same(entry, binding)) this.challenges.delete(token);
    const code = this.makeCode();
    if (!/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/.test(code)) throw new Error('Invalid verification code generator.');
    const token = randomBytes(18).toString('hex');
    this.challenges.set(token, { ...binding, token, digest: digest(code), expiresAt: this.now() + CHALLENGE_TTL_MS, attempts: 0 });
    this.cooldowns.set(key, this.now() + ISSUE_COOLDOWN_MS);
    return { token, code };
  }
  lookup(token: string, binding: Pick<ChallengeBinding, 'guildId' | 'userId'>): ChallengeBinding | null {
    this.prune();
    const entry = this.challenges.get(token);
    if (!entry || !same(entry, binding)) return null;
    return { guildId: entry.guildId, userId: entry.userId, channelId: entry.channelId, panelId: entry.panelId, roleId: entry.roleId };
  }
  answer(token: string, binding: Pick<ChallengeBinding, 'guildId' | 'userId'>, code: string): ChallengeResult {
    this.prune();
    const entry = this.challenges.get(token);
    if (!entry || !same(entry, binding)) return { kind: 'invalid' };
    entry.attempts++;
    if (code.length <= 30 && timingSafeEqual(entry.digest, digest(code))) {
      this.challenges.delete(token); // Consume before the asynchronous role request; submissions cannot replay.
      return { kind: 'success', binding: { guildId: entry.guildId, userId: entry.userId, channelId: entry.channelId, panelId: entry.panelId, roleId: entry.roleId } };
    }
    if (entry.attempts >= 3) {
      this.challenges.delete(token);
      this.cooldowns.set(memberKey(binding), this.now() + FAILURE_COOLDOWN_MS);
      return { kind: 'locked' };
    }
    return { kind: 'wrong', remaining: 3 - entry.attempts };
  }
  invalidateGuild(guildId: string): void {
    for (const [token, entry] of this.challenges) if (entry.guildId === guildId) this.challenges.delete(token);
  }
  clear(): void { this.challenges.clear(); this.cooldowns.clear(); }
}
