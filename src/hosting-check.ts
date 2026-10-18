import { isIP } from 'node:net';
import { parseDashboardFallback } from './dashboard/fallback-config.js';

export interface HostingCheck { id: string; status: 'pass' | 'fail' | 'manual'; message: string }

/** Read-only preflight. Report key names and instructions, never environment values. */
export function inspectHosting(env: NodeJS.ProcessEnv, nodeVersion = process.versions.node): HostingCheck[] {
  const populated = (key: string) => Boolean(env[key]?.trim()) && !/^your[_-]/i.test(env[key]!.trim());
  const enabled = (key: string) => ['true', '1', 'yes', 'on'].includes(env[key]?.trim().toLowerCase() ?? '');
  const check = (id: string, pass: boolean, message: string): HostingCheck => ({ id, status: pass ? 'pass' : 'fail', message });
  let publicOrigin = false;
  try {
    const url = new URL(env.DASHBOARD_URL ?? '');
    publicOrigin = url.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      && !/(^|\.)(example|test|invalid|localhost|local)$/.test(url.hostname)
      && !/(^|\.)example\.(com|net|org)$/.test(url.hostname)
      && !isIP(url.hostname.replace(/^\[|\]$/g, '')) && url.hostname.includes('.')
      && url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password;
  } catch { /* Missing or invalid origin is a reported blocker. */ }
  const fallbackChecks: HostingCheck[] = [];
  try {
    const fallback = parseDashboardFallback(env, env.DASHBOARD_URL ?? '', Number(env.CYRO_INTERNAL_DASHBOARD_PORT || env.PORT || env.DASHBOARD_PORT || 3000));
    if (fallback) {
      fallbackChecks.push(
        check('fallback-config', true, 'Direct HTTPS fallback configuration is syntactically valid; it is a separate TLS listener.'),
        { id: 'fallback-tls', status: 'manual', message: 'Provide a browser-trusted certificate matching the fallback hostname or IP SAN, a matching private key, and a complete certificate chain. Keep keys private; arrange renewal and restart after certificate rotation. Runtime rejects missing, mismatched or expired certificates.' },
        { id: 'fallback-network', status: 'manual', message: 'Allow inbound traffic only to the allocated TLS fallback port. Keep the primary HTTP backend private. Confirm host port mappings and test fallback from an external network.' },
        { id: 'fallback-oauth', status: 'manual', message: 'Register the exact DASHBOARD_FALLBACK_URL/auth/callback in Discord before use. Fallback requires its own Discord sign-in and does not offer TikTok account connections.' },
        { id: 'fallback-outage', status: 'manual', message: 'Fallback bypasses the tunnel only while this same host and Cyro process are running. It cannot recover a provider, container, network or power outage.' },
      );
    }
  } catch {
    // Do not echo user-controlled values, paths, or parser errors in public preflight output.
    fallbackChecks.push(check('fallback-config', false, 'Fix the fallback settings: enable the main dashboard, use a distinct HTTPS hostname, match the URL and listener ports, avoid the primary listener port, and set both certificate file paths. See FALLBACK_HOSTING.md.'));
  }
  return [
    check('runtime', Number(nodeVersion.split('.')[0]) >= 22, 'Use a supported Node.js 22+ release; Node 24 LTS is recommended.'),
    check('bot-token', populated('DISCORD_TOKEN'), 'Set DISCORD_TOKEN privately on the host.'),
    check('application-id', /^\d{17,20}$/.test(env.DISCORD_CLIENT_ID?.trim() ?? ''), 'Set DISCORD_CLIENT_ID to the application ID.'),
    check('global-commands', (env.DISCORD_COMMAND_SCOPE?.trim() || 'global') === 'global', 'Public hosting requires DISCORD_COMMAND_SCOPE=global.'),
    check('dashboard-enabled', enabled('DASHBOARD_ENABLED'), 'Enable DASHBOARD_ENABLED for the public dashboard.'),
    check('oauth-secret', populated('DISCORD_CLIENT_SECRET'), 'Set DISCORD_CLIENT_SECRET privately for dashboard sign-in.'),
    check('public-origin', publicOrigin, 'Set DASHBOARD_URL to the public HTTPS origin, without a path or credentials.'),
    { id: 'persistent-storage', status: 'manual', message: 'Mount persistent local disk at DATA_DIR. Run one active instance; keep private off-host backups. Do not use a cloud-synced or network folder for production.' },
    { id: 'discord-portal', status: 'manual', message: 'Confirm Public Bot, Guild Install, Server Members and Message Content intents; register the exact DASHBOARD_URL/auth/callback redirect.' },
    { id: 'proxy', status: 'manual', message: 'Terminate primary HTTPS at the trusted proxy and block direct public HTTP backend access. Enable DASHBOARD_TRUST_PROXY only for one configured trusted proxy. An optional TLS fallback listener ignores forwarded headers.' },
    ...fallbackChecks,
    { id: 'live-acceptance', status: 'manual', message: 'Verify global commands, OAuth sign-in, revoked manager permissions, two-guild isolation, restart recovery, backups and /readyz on the actual host.' },
  ];
}
