import path from 'node:path';

export interface DashboardFallbackConfig {
  url: string;
  host: string;
  port: number;
  certFile: string;
  keyFile: string;
}

const truthy = (value: string | undefined) => ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase() ?? '');

/** Pure configuration validation. Never reads certificates, imports dotenv, or includes environment values in errors. */
export function parseDashboardFallback(env: NodeJS.ProcessEnv, primaryUrl: string, primaryPort: number): DashboardFallbackConfig | undefined {
  const flag = env.DASHBOARD_FALLBACK_ENABLED?.trim().toLowerCase();
  if (!flag || ['0', 'false', 'no', 'off'].includes(flag)) return undefined;
  if (!truthy(flag)) throw new Error('DASHBOARD_FALLBACK_ENABLED must be true or false.');
  if (!truthy(env.DASHBOARD_ENABLED)) throw new Error('DASHBOARD_FALLBACK_ENABLED requires DASHBOARD_ENABLED=true.');

  const configuredUrl = env.DASHBOARD_FALLBACK_URL?.trim();
  let url: URL;
  try { url = new URL(configuredUrl ?? ''); } catch { throw new Error('DASHBOARD_FALLBACK_URL must be an HTTPS origin.'); }
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('DASHBOARD_FALLBACK_URL must be an HTTPS origin without a path, query, fragment, or credentials.');
  }
  let primary: URL;
  try { primary = new URL(primaryUrl); } catch { throw new Error('DASHBOARD_URL must be a valid origin before fallback can be enabled.'); }
  // Browser cookies are not separated by port. Separate hosts prevent one dashboard's cookies replacing the other's.
  if (url.hostname.replace(/\.$/, '') === primary.hostname.replace(/\.$/, '')) {
    throw new Error('DASHBOARD_FALLBACK_URL must use a different hostname from DASHBOARD_URL.');
  }

  const rawPort = env.DASHBOARD_FALLBACK_PORT?.trim();
  if (!rawPort || !/^\d+$/.test(rawPort)) throw new Error('DASHBOARD_FALLBACK_PORT must be an integer from 1 to 65535.');
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('DASHBOARD_FALLBACK_PORT must be an integer from 1 to 65535.');
  if (!Number.isInteger(primaryPort) || primaryPort < 1 || primaryPort > 65535) throw new Error('The primary dashboard listener port must be an integer from 1 to 65535.');
  if (port !== Number(url.port || 443)) throw new Error('DASHBOARD_FALLBACK_PORT must match the port in DASHBOARD_FALLBACK_URL (443 when omitted).');
  if (port === primaryPort) throw new Error('DASHBOARD_FALLBACK_PORT must differ from the primary dashboard listener port.');

  const certFile = env.DASHBOARD_FALLBACK_CERT_FILE?.trim();
  const keyFile = env.DASHBOARD_FALLBACK_KEY_FILE?.trim();
  if (!certFile || !keyFile) throw new Error('Set DASHBOARD_FALLBACK_CERT_FILE and DASHBOARD_FALLBACK_KEY_FILE before enabling fallback.');
  return {
    url: url.origin,
    host: env.DASHBOARD_FALLBACK_HOST?.trim() || '0.0.0.0',
    port,
    certFile: path.resolve(certFile),
    keyFile: path.resolve(keyFile),
  };
}
