import { expect, it } from 'vitest';
import { ActivityType } from 'discord.js';
import { defaultStatusRoleConfig, parseStatusRoleConfig, statusMatches } from '../src/status-roles/types.js';
import { StatusRoleStore } from '../src/status-roles/store.js';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

it('matches only custom status state with per-server text, exact and case options', () => {
  const config = parseStatusRoleConfig({ ...defaultStatusRoleConfig(), enabled: true, text: 'cyrobot.ca', roleId: '223456789012345678' });
  expect(statusMatches(config, { status: 'online', activities: [{ type: ActivityType.Custom, state: 'Support CYROBOT.CA today' }] })).toBe(true);
  expect(statusMatches(config, { status: 'online', activities: [{ type: ActivityType.Playing, state: 'cyrobot.ca', name: 'cyrobot.ca' }] })).toBe(false);
  expect(statusMatches({ ...config, match: 'exact' }, { status: 'online', activities: [{ type: ActivityType.Custom, state: 'Support cyrobot.ca' }] })).toBe(false);
  expect(statusMatches({ ...config, caseSensitive: true }, { status: 'online', activities: [{ type: ActivityType.Custom, state: 'CYROBOT.CA' }] })).toBe(false);
  expect(statusMatches(config, { status: 'offline', activities: [] })).toBe(null);
  expect(statusMatches({ ...config, offlineBehavior: 'remove' }, { status: 'offline', activities: [] })).toBe(false);
  expect(statusMatches(config, undefined)).toBe(null);
});
it('persists isolated assignments atomically before exposing a mutation', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-status-store-'));
  try {
    const store = new StatusRoleStore(dir); await store.init();
    const id = '123456789012345678', role = '223456789012345678', member = '323456789012345678';
    await store.mutate(id, state => { state.assignments[`${member}:${role}`] = { memberId: member, roleId: role, state: 'pending-add' }; });
    const restarted = new StatusRoleStore(dir); await restarted.init();
    expect(restarted.get(id).assignments[`${member}:${role}`]?.state).toBe('pending-add');
    expect(restarted.get(role).assignments).toEqual({});
    await restarted.purgeGuild(id, () => false); expect(await restarted.guildIds()).toEqual([id]);
    await restarted.purgeGuild(id); expect(await restarted.guildIds()).toEqual([]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
