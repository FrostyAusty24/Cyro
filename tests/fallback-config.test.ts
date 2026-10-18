import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseDashboardFallback } from '../src/dashboard/fallback-config.js';
import { loadConfig } from '../src/config.js';

const primary = 'https://cyrobot.ca';
const configured = (): NodeJS.ProcessEnv => ({
  DASHBOARD_ENABLED: 'true', DASHBOARD_FALLBACK_ENABLED: 'true',
  DASHBOARD_FALLBACK_URL: 'https://203.0.113.10:1029', DASHBOARD_FALLBACK_PORT: '1029',
  DASHBOARD_FALLBACK_CERT_FILE: './private/fallback/fullchain.pem',
  DASHBOARD_FALLBACK_KEY_FILE: './private/fallback/privkey.pem',
});

describe('fallback isolation at runtime', () => {
  afterEach(() => vi.unstubAllEnvs());
  const setupEnvironment = () => {
    for (const [key, value] of Object.entries({ ...configured(), DISCORD_TOKEN: 'fixture-token', DISCORD_CLIENT_ID: '123456789012345678',
      DISCORD_COMMAND_SCOPE: 'global', DASHBOARD_URL: primary, DASHBOARD_PORT: '3000', PORT: '3000', LOG_LEVEL: 'info' })) vi.stubEnv(key, value);
  };

  it('disables malformed optional fallback without preventing bot configuration', () => {
    setupEnvironment();
    vi.stubEnv('DASHBOARD_FALLBACK_URL', 'https://person:private-credential@backup.cyrobot.ca');
    const config = loadConfig();
    expect(config.discordToken).toBe('fixture-token');
    expect(config.dashboardUrl).toBe(primary);
    expect(config.dashboardFallback).toBeUndefined();
    expect(config.dashboardFallbackWarning).toContain('fallback is disabled');
    expect(config.dashboardFallbackWarning).not.toContain('private-credential');
  });

  it('keeps primary configuration errors fatal and does not catch unrelated errors', () => {
    setupEnvironment();
    vi.stubEnv('DASHBOARD_FALLBACK_URL', 'broken');
    vi.stubEnv('DASHBOARD_URL', 'http://public.example');
    expect(() => loadConfig()).toThrow('DASHBOARD_URL');
    vi.stubEnv('DASHBOARD_URL', primary);
    vi.stubEnv('DISCORD_TOKEN', '');
    expect(() => loadConfig()).toThrow('DISCORD_TOKEN');
  });

  it('returns valid fallback configuration without a warning', () => {
    setupEnvironment();
    const config = loadConfig();
    expect(config.dashboardFallback?.port).toBe(1029);
    expect(config.dashboardFallbackWarning).toBeUndefined();
  });
});

describe('direct HTTPS fallback configuration', () => {
  it('is opt-in and ignores unused fallback fields while disabled', () => {
    expect(parseDashboardFallback({}, primary, 1029)).toBeUndefined();
    for (const flag of ['', 'false', '0', 'off', 'no']) {
      expect(parseDashboardFallback({ ...configured(), DASHBOARD_FALLBACK_ENABLED: flag, DASHBOARD_FALLBACK_URL: 'http://invalid', DASHBOARD_FALLBACK_PORT: 'broken' }, primary, 1029)).toBeUndefined();
    }
    expect(() => parseDashboardFallback({ ...configured(), DASHBOARD_FALLBACK_ENABLED: 'treu' }, primary, 3000)).toThrow('DASHBOARD_FALLBACK_ENABLED');
  });

  it('returns an isolated TLS listener with absolute certificate paths', () => {
    expect(parseDashboardFallback(configured(), primary, 3000)).toEqual({
      url: 'https://203.0.113.10:1029', host: '0.0.0.0', port: 1029,
      certFile: path.resolve('./private/fallback/fullchain.pem'), keyFile: path.resolve('./private/fallback/privkey.pem'),
    });
    expect(parseDashboardFallback({ ...configured(), DASHBOARD_FALLBACK_URL: 'https://backup.cyrobot.ca/', DASHBOARD_FALLBACK_PORT: '443', DASHBOARD_FALLBACK_HOST: '127.0.0.1' }, primary, 3000)).toMatchObject({ url: 'https://backup.cyrobot.ca', port: 443, host: '127.0.0.1' });
  });

  it('accepts a TLS IPv6 origin and does not read files or mutate the provided environment', () => {
    const env = Object.freeze({ ...configured(), DASHBOARD_FALLBACK_URL: 'https://[2001:db8::1]:1029' });
    expect(parseDashboardFallback(env, primary, 3000)?.url).toBe('https://[2001:db8::1]:1029');
  });

  it('requires the main dashboard to be enabled', () => {
    for (const value of [undefined, '', 'false']) {
      expect(() => parseDashboardFallback({ ...configured(), DASHBOARD_ENABLED: value }, primary, 3000)).toThrow('DASHBOARD_ENABLED');
    }
  });

  it.each(['http://203.0.113.10:1029', 'ftp://backup.cyrobot.ca', 'https://backup.cyrobot.ca/path', 'https://backup.cyrobot.ca/?private=value', 'https://backup.cyrobot.ca/#fragment', 'https://name:private@backup.cyrobot.ca', '', 'invalid'])('rejects unsafe or non-origin fallback URL %s', url => {
    expect(() => parseDashboardFallback({ ...configured(), DASHBOARD_FALLBACK_URL: url }, primary, 3000)).toThrow('DASHBOARD_FALLBACK_URL');
  });

  it('rejects the same hostname even at a different port to avoid cookie collisions', () => {
    for (const url of ['https://cyrobot.ca:1029', 'https://CYROBOT.CA:1029', 'https://cyrobot.ca.:1029']) {
      expect(() => parseDashboardFallback({ ...configured(), DASHBOARD_FALLBACK_URL: url }, primary, 3000)).toThrow('different hostname');
    }
  });

  it.each(['', '0', '-1', '65536', '1029.5', 'NaN', '1e3', '0x405', '1029junk'])('rejects invalid listener port %s', port => {
    expect(() => parseDashboardFallback({ ...configured(), DASHBOARD_FALLBACK_PORT: port }, primary, 3000)).toThrow('DASHBOARD_FALLBACK_PORT');
  });

  it('rejects an origin-port mismatch and conflicts with the primary listener', () => {
    expect(() => parseDashboardFallback({ ...configured(), DASHBOARD_FALLBACK_PORT: '443' }, primary, 3000)).toThrow('match');
    expect(() => parseDashboardFallback(configured(), primary, 1029)).toThrow('differ');
    expect(() => parseDashboardFallback({ ...configured(), DASHBOARD_FALLBACK_URL: 'https://backup.cyrobot.ca' }, primary, 3000)).toThrow('match');
    expect(() => parseDashboardFallback(configured(), primary, NaN)).toThrow('primary dashboard listener');
  });

  it('requires both certificate path fields and never echoes their values in errors', () => {
    for (const key of ['DASHBOARD_FALLBACK_CERT_FILE', 'DASHBOARD_FALLBACK_KEY_FILE']) {
      expect(() => parseDashboardFallback({ ...configured(), [key]: '' }, primary, 3000)).toThrow('CERT_FILE');
    }
    try { parseDashboardFallback({ ...configured(), DASHBOARD_FALLBACK_URL: 'https://person:credential-must-not-leak@backup.cyrobot.ca' }, primary, 3000); }
    catch (error) { expect(String(error)).not.toContain('credential-must-not-leak'); }
  });
});
