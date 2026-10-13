import { expect, it, vi } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { GuildIdentityService, parseIdentityPatch } from '../src/control/identity.js';
import { PermissionFlagsBits, PermissionsBitField } from 'discord.js';

it('accepts only server nickname/avatar fields and makes empty nicknames reset the server nickname', async () => {
  expect(await parseIdentityPatch({ nickname: '  Community Helper  ' })).toEqual({ nick: 'Community Helper' });
  expect(await parseIdentityPatch({ nickname: '' })).toEqual({ nick: null });
  expect(await parseIdentityPatch({ nickname: null, avatar: null })).toEqual({ nick: null, avatar: null });
  for (const bad of [{}, { username: 'global rename' }, { nickname: 'a'.repeat(33) }, { nickname: 'line\nbreak' }, null, []]) {
    await expect(parseIdentityPatch(bad)).rejects.toThrow();
  }
});

function fixture(id = '123456789012345678') {
  const user = { id: 'bot', username: 'Cyro', displayName: 'Cyro', displayAvatarURL: () => 'https://cdn.discordapp.com/default.png', setAvatar: vi.fn(), setUsername: vi.fn() };
  const guild: any = { id, client: { user }, members: {} };
  const member: any = { guild, id: 'bot', user, nickname: null, displayName: 'Cyro', avatar: null, permissions: new PermissionsBitField([PermissionFlagsBits.ChangeNickname]), displayAvatarURL: () => member.avatar ? `https://cdn.discordapp.com/${id}/custom.png` : user.displayAvatarURL() };
  guild.members.fetchMe = vi.fn(async () => member);
  guild.members.editMe = vi.fn(async (patch: any) => { if ('nick' in patch) { member.nickname = patch.nick; member.displayName = patch.nick || 'Cyro'; } if ('avatar' in patch) member.avatar = patch.avatar ? 'custom' : null; return member; });
  return { guild, member, user };
}

it('changes only the selected guild member, refreshes its current profile, and preserves all global identity', async () => {
  const service = new GuildIdentityService(); const first = fixture(); const second = fixture('223456789012345678');
  const authorize = vi.fn(async () => {});
  const result = await service.update(first.guild, 'admin', { nickname: 'Our helper' }, authorize);
  expect(result).toMatchObject({ nickname: 'Our helper', displayName: 'Our helper', defaultName: 'Cyro', customAvatar: false, canChangeNickname: true });
  expect(first.guild.members.editMe).toHaveBeenCalledExactlyOnceWith({ nick: 'Our helper', reason: 'Cyro server profile changed by Discord user admin' });
  expect(first.guild.members.fetchMe).toHaveBeenCalledWith({ force: true });
  expect(authorize).toHaveBeenCalledOnce();
  expect(await service.get(second.guild)).toMatchObject({ nickname: null, displayName: 'Cyro' });
  expect(first.user.setAvatar).not.toHaveBeenCalled(); expect(first.user.setUsername).not.toHaveBeenCalled(); expect(second.guild.members.editMe).not.toHaveBeenCalled();
});

it('checks nickname permission, refreshes authority immediately before mutation, and rejects concurrent writes without retrying an uncertain change', async () => {
  const service = new GuildIdentityService(); const f = fixture(); const authorize = vi.fn(async () => {});
  f.member.permissions = new PermissionsBitField();
  await expect(service.update(f.guild, 'admin', { nickname: 'No access' }, authorize)).rejects.toMatchObject({ status: 403 });
  expect(f.guild.members.editMe).not.toHaveBeenCalled();
  f.member.permissions = new PermissionsBitField([PermissionFlagsBits.ChangeNickname]);
  await expect(service.update(f.guild, 'admin', { nickname: 'Revoked' }, async () => { throw new Error('Revoked'); })).rejects.toThrow('Revoked');
  expect(f.guild.members.editMe).not.toHaveBeenCalled();
  let release!: () => void; const paused = new Promise<void>(resolve => { release = resolve; });
  f.guild.members.editMe.mockImplementation(async () => { await paused; throw new Error('Connection reset'); });
  const first = service.update(f.guild, 'admin', { nickname: 'Pending' }, authorize);
  const outcome = expect(first).rejects.toMatchObject({ status: 502, message: expect.stringContaining('Reload') });
  await vi.waitFor(() => expect(f.guild.members.editMe).toHaveBeenCalledOnce());
  await expect(service.update(f.guild, 'other', { nickname: 'Overlap' }, authorize)).rejects.toMatchObject({ status: 409 });
  release(); await outcome;
  expect(f.guild.members.editMe).toHaveBeenCalledOnce();
  expect(await service.get(f.guild)).toMatchObject({ nickname: null });
});

it('bounds simultaneous profile work across servers and still allows picture-only changes without nickname permission', async () => {
  const service = new GuildIdentityService(); const first = fixture(); const second = fixture('223456789012345678'); const third = fixture('323456789012345678');
  let release!: () => void; const paused = new Promise<void>(resolve => { release = resolve; });
  first.guild.members.fetchMe.mockImplementation(async () => { await paused; return first.member; });
  second.guild.members.fetchMe.mockImplementation(async () => { await paused; return second.member; });
  const a = service.update(first.guild, 'u', { nickname: 'First' }, async () => {});
  const b = service.update(second.guild, 'u', { nickname: 'Second' }, async () => {});
  try {
    await expect(service.update(third.guild, 'u', { nickname: 'Third' }, async () => {})).rejects.toMatchObject({ status: 429 });
  } finally { release(); await Promise.all([a, b]); }
  third.member.avatar = 'custom'; third.member.permissions = new PermissionsBitField();
  expect(await service.update(third.guild, 'u', { avatar: null }, async () => {})).toMatchObject({ customAvatar: false, canChangeNickname: false });
  expect(third.guild.members.editMe).toHaveBeenCalledExactlyOnceWith({ avatar: null, reason: 'Cyro server profile changed by Discord user u' });
});

it('accepts genuine PNG, JPEG and WebP uploads but rejects URLs, MIME spoofing, malformed and oversized images', async () => {
  const canvas = createCanvas(16, 16);
  for (const mime of ['image/png', 'image/jpeg', 'image/webp'] as const) {
    const bytes = canvas.toBuffer(mime as 'image/png');
    const avatar = `data:${mime};base64,${bytes.toString('base64')}`;
    expect(await parseIdentityPatch({ avatar })).toEqual({ avatar });
  }
  const png = canvas.toBuffer('image/png');
  const huge = Buffer.from(png); huge.writeUInt32BE(65535, 16);
  const bad = ['https://evil.invalid/a.png', 'C:/private.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,AAAA',
    `data:image/jpeg;base64,${png.toString('base64')}`, `data:image/png;base64,${huge.toString('base64')}`,
    `data:image/png;base64,${Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')}`, `data:image/png;base64,${png.subarray(0, 28).toString('base64')}`];
  for (const avatar of bad) await expect(parseIdentityPatch({ avatar })).rejects.toThrow();
});
