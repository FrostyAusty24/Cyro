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
