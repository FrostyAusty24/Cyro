import { isIP } from 'node:net';

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
    { id: 'proxy', status: 'manual', message: 'Terminate HTTPS at the trusted proxy and block direct public backend access. Enable DASHBOARD_TRUST_PROXY only for one configured trusted proxy.' },
    { id: 'live-acceptance', status: 'manual', message: 'Verify global commands, OAuth sign-in, revoked manager permissions, two-guild isolation, restart recovery, backups and /readyz on the actual host.' },
  ];
}
