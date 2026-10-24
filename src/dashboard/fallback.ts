import { createHash, createPrivateKey, X509Certificate } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { createSecureContext, type SecureContextOptions } from 'node:tls';
import type { DashboardFallbackConfig } from './fallback-config.js';
import type { Logger } from '../logger.js';
export type { DashboardFallbackConfig } from './fallback-config.js';

interface TlsMaterial { cert: Buffer; key: Buffer }
export interface FallbackTlsOptions extends SecureContextOptions { cert: Buffer; key: Buffer; minVersion: 'TLSv1.2' }
async function readTlsMaterial(config: DashboardFallbackConfig): Promise<TlsMaterial> {
  const [cert, key] = await Promise.all([readFile(config.certFile), readFile(config.keyFile)]);
  return { cert, key };
}

/** Validate the leaf before opening a direct listener. Browser trust is never bypassed. */
export async function fallbackTlsOptions(config: DashboardFallbackConfig, now = Date.now()): Promise<FallbackTlsOptions> {
  return validateTlsMaterial(config, await readTlsMaterial(config), now);
}
function validateTlsMaterial(config: DashboardFallbackConfig, {cert, key}: TlsMaterial, now: number): FallbackTlsOptions {
  const origin = new URL(config.url);
  if (origin.protocol !== 'https:' || origin.origin !== config.url) throw new Error('Dashboard fallback requires an HTTPS origin.');
  const leaf = new X509Certificate(cert);
  if (!(Date.parse(leaf.validFrom) <= now && now < Date.parse(leaf.validTo))) throw new Error('Dashboard fallback certificate is expired or not yet valid.');
  const hostname = origin.hostname.replace(/^\[|\]$/g, '');
  const covered = isIP(hostname) ? leaf.checkIP(hostname) : leaf.checkHost(hostname, { subject: 'never' });
  if (!covered) throw new Error('Dashboard fallback certificate does not cover its configured hostname or IP address.');
  if (leaf.ca || leaf.verify(leaf.publicKey)) throw new Error('Dashboard fallback needs a CA-issued server certificate, not a self-signed certificate.');
  if (!leaf.checkPrivateKey(createPrivateKey(key))) throw new Error('Dashboard fallback certificate and private key do not match.');
  const options: FallbackTlsOptions = { cert, key, minVersion: 'TLSv1.2' };
  createSecureContext(options);
  return options;
}

export interface FallbackTlsReloader {
  /** Coalesces concurrent checks; primarily useful for an explicit operator refresh. */
  refresh(): Promise<void>;
  stop(): Promise<void>;
}

/** Only the optional HTTPS listener watches certificates; no Discord restart or session reset. */
export function watchFallbackTls(
  config: DashboardFallbackConfig,
  initial: FallbackTlsOptions,
  apply: (options: FallbackTlsOptions) => void,
  logger: Pick<Logger, 'warn' | 'info'>,
  options: { intervalMs?: number; warningIntervalMs?: number; now?: () => number } = {},
): FallbackTlsReloader {
  const intervalMs = options.intervalMs ?? 60_000;
  const warningIntervalMs = options.warningIntervalMs ?? 3_600_000;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0 || !Number.isFinite(warningIntervalMs) || warningIntervalMs <= 0) {
    throw new Error('Fallback certificate reload intervals must be positive.');
  }
  const now = options.now ?? Date.now;
  const fingerprint = ({cert, key}: TlsMaterial) => createHash('sha256').update(cert).update('\0').update(key).digest('hex');
  let activeFingerprint = fingerprint(initial);
  let stopped = false;
  let running: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastWarning = -Infinity;
  const refresh = (): Promise<void> => {
    if (stopped) return Promise.resolve();
    if (running) return running;
    const operation = (async () => {
      try {
        const material = await readTlsMaterial(config);
        if (stopped) return;
        const nextFingerprint = fingerprint(material);
        if (nextFingerprint === activeFingerprint) return;
        // Complete all SAN, expiry, key and OpenSSL validation before replacing the live context.
        const next = validateTlsMaterial(config, material, now());
        if (stopped) return;
        apply(next);
        activeFingerprint = nextFingerprint;
        logger.info('Backup HTTPS certificate reloaded without restarting the bot.');
      } catch {
        const timestamp = now();
        if (!stopped && timestamp - lastWarning >= warningIntervalMs) {
          lastWarning = timestamp;
          logger.warn('Backup HTTPS certificate renewal could not be loaded. The last working certificate is still in use; check certificate renewal and file permissions.');
        }
      }
    })();
    running = operation;
    void operation.finally(() => { if (running === operation) running = undefined; }).catch(() => undefined);
    return operation;
  };
  const schedule = () => {
    if (stopped) return;
    timer = setTimeout(() => { timer = undefined; void refresh().finally(schedule).catch(() => undefined); }, intervalMs);
    timer.unref();
  };
  schedule();
  return {
    refresh,
    stop: () => { stopped = true; clearTimeout(timer); timer = undefined; return running ?? Promise.resolve(); },
  };
}
