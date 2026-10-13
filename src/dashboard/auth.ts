import { randomBytes, timingSafeEqual } from 'node:crypto';

export interface DashboardUser { id: string; username: string; avatar: string | null }
export interface Session { user: DashboardUser; accessToken: string; csrfToken: string; expiresAt: number; idleExpiresAt: number }
const IDLE_LIFETIME_MS = 30 * 60_000;
const randomToken = () => randomBytes(32).toString('base64url');
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export class SessionStore {
  private states = new Map<string, { expiresAt: number; returnTo: string }>();
  private sessions = new Map<string, Session>();
  beginLogin(now = Date.now(), returnTo = '/'): string {
    this.prune(now);
    if (this.states.size >= 5000) throw new Error('Too many pending sign-ins. Please try again shortly.');
    const token = randomToken(); this.states.set(token, { expiresAt: now + 600_000, returnTo }); return token;
  }
  consumeLogin(state: string, cookie: string, now = Date.now()): boolean {
    return this.consumeLoginDestination(state, cookie, now) !== undefined;
  }
  consumeLoginDestination(state: string, cookie: string, now = Date.now()): string | undefined {
    const pending = this.states.get(state);
    if (!state || !safeEqual(state, cookie)) return undefined;
    this.states.delete(state);
    return pending && pending.expiresAt > now ? pending.returnTo : undefined;
  }
  create(user: DashboardUser, accessToken: string, expiresIn: number, now = Date.now()): string {
    this.prune(now);
    if (this.sessions.size >= 10000) throw new Error('Dashboard is busy. Please try again shortly.');
    const id = randomToken();
    this.sessions.set(id, {user, accessToken, csrfToken: randomToken(), expiresAt: now + Math.min(expiresIn * 1000, 28_800_000), idleExpiresAt: now + IDLE_LIFETIME_MS});
    return id;
  }
  get(id: string, now = Date.now()): Session | undefined {
    const session = this.peek(id, now);
    if (session) session.idleExpiresAt = now + IDLE_LIFETIME_MS;
    return session;
  }
  /** Rate limiting and rejected requests must not count as authenticated activity. */
  peek(id: string, now = Date.now()): Session | undefined {
    const session = this.sessions.get(id);
    if (session && session.expiresAt > now && session.idleExpiresAt > now) return session;
    this.sessions.delete(id); return undefined;
  }
  delete(id: string): void { this.sessions.delete(id); }
  private prune(now: number): void {
    for (const [id, pending] of this.states) if (pending.expiresAt <= now) this.states.delete(id);
    for (const [id, session] of this.sessions) if (session.expiresAt <= now || session.idleExpiresAt <= now) this.sessions.delete(id);
  }
}

export function canManageGuild(permissions: string, owner = false): boolean {
  try { const bits = BigInt(permissions); return owner || (bits & 8n) !== 0n || (bits & 32n) !== 0n; }
  catch { return false; }
}
