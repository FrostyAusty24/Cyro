import { expect, it } from 'vitest';
import { canUsePresenceIntent, probePresenceIntent } from '../src/services/presence-intent.js';

it('only requests privileged presence data when Discord advertises permission for the correct app', () => {
  const id = '100000000000000002';
  expect(canUsePresenceIntent({id,flags:8192},id)).toBe(true);
  expect(canUsePresenceIntent({id,flags:4096},id)).toBe(true);
  expect(canUsePresenceIntent({id,flags:32768},id)).toBe(false);
  expect(canUsePresenceIntent({id:'other',flags:8192},id)).toBe(false);
  expect(canUsePresenceIntent(null,id)).toBe(false);
  expect(canUsePresenceIntent({id},id)).toBe(false);
});

it('keeps the bot available without presence data if the permission probe fails', async () => {
  const id = '100000000000000002';
  expect(await probePresenceIntent(async () => ({id,flags:8192}),id)).toBe(true);
  expect(await probePresenceIntent(async () => { throw new Error('private response'); },id)).toBe(false);
});

it('supports full-width flags_new and rejects malformed authorization data', () => {
  const id = '100000000000000002';
  expect(canUsePresenceIntent({id,flags_new:'281474976718848'},id)).toBe(true);
  for (const flags_new of ['bad', '-1', '1.5', '', {}, null]) {
    expect(canUsePresenceIntent({id,flags:8192,flags_new},id)).toBe(false);
  }
  expect(canUsePresenceIntent({id,flags:8192,flags_new:'0'},id)).toBe(false);
});
