import { expect, it } from 'vitest';
import { PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { inviteUrl } from '../src/dashboard/discord-api.js';

it('requests only self nickname permission for identity, without managing member names or Administrator', () => {
  const url = new URL(inviteUrl('100000000000000002', '100000000000000001'));
  const permissions = new PermissionsBitField(BigInt(url.searchParams.get('permissions')!));
  expect(permissions.has(PermissionFlagsBits.ChangeNickname)).toBe(true);
  expect(permissions.has(PermissionFlagsBits.ManageNicknames)).toBe(false);
  expect(permissions.has(PermissionFlagsBits.Administrator)).toBe(false);
  expect(url.searchParams.get('guild_id')).toBe('100000000000000001');
});
