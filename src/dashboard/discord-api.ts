import { PermissionFlagsBits } from 'discord.js';
import { setTimeout as delay } from 'node:timers/promises';
import type { DashboardUser } from './auth.js';

export interface OAuthGuild { id: string; name: string; icon: string | null; permissions: string; owner: boolean }
export interface OAuthApi {
  exchange(code: string): Promise<{access_token:string;expires_in:number}>;
  user(token:string): Promise<DashboardUser>;
  guilds(token:string): Promise<OAuthGuild[]>;
  revoke(token:string): Promise<void>;
}
export interface OAuthTransport {
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
}
export function createOAuthApi(clientId: string, secret: string, redirectUri: string, dependencies: OAuthTransport = {}): OAuthApi {
  const transport = dependencies.fetch ?? fetch;
  const now = dependencies.now ?? Date.now;
  const sleep = dependencies.sleep ?? ((milliseconds, signal) => delay(milliseconds, undefined, { signal }));
  const budget = () => ({ deadline: now() + 15_000, signal: AbortSignal.timeout(15_000) });
  const checkDeadline = (limit: ReturnType<typeof budget>): void => { if (now() >= limit.deadline || limit.signal.aborted) throw new Error('Discord authentication request deadline exceeded. Please try again shortly.'); };
  const request = async <T>(route:string, init:RequestInit, limit = budget()):Promise<T> => {
    const { signal } = limit;
    for (let attempt = 0; ; attempt++) {
      checkDeadline(limit);
      const response = await transport(`https://discord.com/api/v10${route}`, {...init,signal});
      checkDeadline(limit);
      if (response.status === 429 && (init.method ?? 'GET') === 'GET' && attempt < 2) {
        const header = response.headers.get('Retry-After');
        const seconds = header !== null && header.trim() !== '' ? Number(header) : NaN;
        const body = await response.json().catch(() => ({})) as { retry_after?: unknown };
        checkDeadline(limit);
        const milliseconds = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : typeof body.retry_after === 'number' && body.retry_after >= 0 ? body.retry_after * 1000 : NaN;
        const wait = Math.max(100, Math.ceil(milliseconds));
        // Never retry early by clamping Discord's wait to our remaining budget.
        if (Number.isFinite(wait) && wait < limit.deadline - now()) { await sleep(wait, signal); continue; }
      }
      if (!response.ok) throw new Error(`Discord authentication service returned ${response.status}. Please sign in again or try shortly.`);
      const result = response.status === 204 ? undefined as T : await response.json() as T;
      checkDeadline(limit);
      return result;
    }
  };
  return {
    exchange: code => request('/oauth2/token', {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:secret,grant_type:'authorization_code',code,redirect_uri:redirectUri})}),
    user: token => request('/users/@me', {headers:{Authorization:`Bearer ${token}`}}),
    guilds: async token => {
      const result:OAuthGuild[] = []; let after = '0'; const limit = budget();
      for (let page = 0; page < 20; page++) {
        const guilds = await request<OAuthGuild[]>(`/users/@me/guilds?limit=200&after=${after}`,{headers:{Authorization:`Bearer ${token}`}},limit);
        result.push(...guilds); if(guilds.length < 200) break;
        after = guilds[guilds.length - 1]!.id;
      }
      return result;
    },
    revoke: async token => { await request('/oauth2/token/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:secret,token})}); },
  };
}
export function inviteUrl(clientId: string, guildId?:string): string {
  const p = PermissionFlagsBits;
  const permissions = [p.ViewChannel,p.SendMessages,p.SendPolls,p.EmbedLinks,p.AttachFiles,p.ReadMessageHistory,p.AddReactions,p.ChangeNickname,p.Connect,p.Speak,p.ManageMessages,p.ManageChannels,p.ManageRoles,p.ManageThreads,p.ManageWebhooks,p.ManageGuild,p.KickMembers,p.BanMembers,p.ModerateMembers].reduce((a,b)=>a|b,0n);
  const url = new URL('https://discord.com/oauth2/authorize');
  url.search = new URLSearchParams({client_id:clientId,scope:'bot applications.commands',integration_type:'0',permissions:permissions.toString(),...(guildId?{guild_id:guildId,disable_guild_select:'true'}:{})}).toString();
  return url.toString();
}
