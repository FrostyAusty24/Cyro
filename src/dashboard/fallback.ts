import { createPrivateKey, X509Certificate } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { createSecureContext, type SecureContextOptions } from 'node:tls';
import type { DashboardFallbackConfig } from './fallback-config.js';
export type { DashboardFallbackConfig } from './fallback-config.js';

/** Validate the leaf before opening a direct listener. Browser trust is never bypassed. */
export async function fallbackTlsOptions(config: DashboardFallbackConfig, now = Date.now()): Promise<SecureContextOptions> {
  const origin = new URL(config.url);
  if (origin.protocol !== 'https:' || origin.origin !== config.url) throw new Error('Dashboard fallback requires an HTTPS origin.');
  const [cert, key] = await Promise.all([readFile(config.certFile), readFile(config.keyFile)]);
  const leaf = new X509Certificate(cert);
  if (!(Date.parse(leaf.validFrom) <= now && now < Date.parse(leaf.validTo))) throw new Error('Dashboard fallback certificate is expired or not yet valid.');
  const hostname = origin.hostname.replace(/^\[|\]$/g, '');
  const covered = isIP(hostname) ? leaf.checkIP(hostname) : leaf.checkHost(hostname, { subject: 'never' });
  if (!covered) throw new Error('Dashboard fallback certificate does not cover its configured hostname or IP address.');
  if (leaf.ca || leaf.verify(leaf.publicKey)) throw new Error('Dashboard fallback needs a CA-issued server certificate, not a self-signed certificate.');
  if (!leaf.checkPrivateKey(createPrivateKey(key))) throw new Error('Dashboard fallback certificate and private key do not match.');
  const options: SecureContextOptions = { cert, key, minVersion: 'TLSv1.2' };
  createSecureContext(options);
  return options;
}
