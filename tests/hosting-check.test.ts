import { expect, it } from 'vitest';
import { inspectHosting } from '../src/hosting-check.js';

it('reports public-host blockers without including credential values', () => {
  const checks = inspectHosting({ DISCORD_TOKEN: 'private-token-example', DISCORD_CLIENT_SECRET: 'private-secret-example',
    DISCORD_CLIENT_ID: '123456789012345678', DISCORD_COMMAND_SCOPE: 'development', DASHBOARD_URL: 'http://localhost:3000' }, '24.19.0');
  expect(checks.filter(check => check.status === 'fail').map(check => check.id)).toEqual(expect.arrayContaining(['global-commands', 'dashboard-enabled', 'public-origin']));
  expect(JSON.stringify(checks)).not.toContain('private-token-example');
  expect(JSON.stringify(checks)).not.toContain('private-secret-example');
});

it('accepts configured global hosting but rejects a placeholder dashboard domain', () => {
  const env = { DISCORD_TOKEN: 'private-token', DISCORD_CLIENT_SECRET: 'private-secret', DISCORD_CLIENT_ID: '123456789012345678',
    DASHBOARD_ENABLED: 'true', DASHBOARD_URL: 'https://bot.community.dev' };
  expect(inspectHosting(env, '24.19.0').filter(check => check.status === 'fail')).toEqual([]);
  expect(inspectHosting({ ...env, DASHBOARD_URL: 'https://bot.your-domain.example' }).find(check => check.id === 'public-origin')?.status).toBe('fail');
});

it('requires a real DNS name rather than a reserved example or IP literal', () => {
  for (const host of ['bot.example.com', 'example.net', 'example.org', '127.0.0.2', '10.1.2.3', '[::1]']) {
    expect(inspectHosting({ DASHBOARD_URL: `https://${host}` }).find(check => check.id === 'public-origin')?.status).toBe('fail');
  }
});

it('leaves fallback disabled by default and reports configuration without reading private TLS files', () => {
  expect(inspectHosting({}).some(check => check.id.startsWith('fallback-'))).toBe(false);
  const env = { DASHBOARD_ENABLED: 'true', DASHBOARD_URL: 'https://cyrobot.ca',
    DASHBOARD_FALLBACK_ENABLED: 'true', DASHBOARD_FALLBACK_URL: 'https://203.0.113.10:1029',
    DASHBOARD_FALLBACK_PORT: '1029', DASHBOARD_FALLBACK_CERT_FILE: '/private/certificate.pem', DASHBOARD_FALLBACK_KEY_FILE: '/private/secret-key.pem',
    PORT: '1029', CYRO_INTERNAL_DASHBOARD_PORT: '3000' };
  const checks = inspectHosting(env);
  expect(checks.find(check => check.id === 'fallback-config')?.status).toBe('pass');
  expect(checks.filter(check => check.id.startsWith('fallback-') && check.status === 'manual').map(check => check.id))
    .toEqual(['fallback-tls', 'fallback-network', 'fallback-oauth', 'fallback-outage']);
  expect(JSON.stringify(checks)).not.toContain('secret-key.pem');
  expect(JSON.stringify(checks)).not.toContain('203.0.113.10');
  expect(inspectHosting({ ...env, CYRO_INTERNAL_DASHBOARD_PORT: '1029' }).find(check => check.id === 'fallback-config')?.status).toBe('fail');
  expect(inspectHosting({ ...env, CYRO_INTERNAL_DASHBOARD_PORT: 'invalid' }).find(check => check.id === 'fallback-config')?.status).toBe('fail');
});

it('reports unsafe fallback settings without echoing attacker-controlled credential or environment values', () => {
  const checks = inspectHosting({ DASHBOARD_ENABLED: 'true', DASHBOARD_URL: 'https://cyrobot.ca',
    DASHBOARD_FALLBACK_ENABLED: 'true', DASHBOARD_FALLBACK_URL: 'https://user:private-credential@backup.cyrobot.ca',
    DASHBOARD_FALLBACK_CERT_FILE: '/private/cert', DASHBOARD_FALLBACK_KEY_FILE: '/private/key' });
  expect(checks.find(check => check.id === 'fallback-config')?.status).toBe('fail');
  expect(JSON.stringify(checks)).not.toContain('private-credential');
});
