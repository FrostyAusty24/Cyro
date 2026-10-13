import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { ActivityType, Collection, Events, PermissionFlagsBits, PermissionsBitField, type Client } from 'discord.js';
import { afterEach, expect, it, vi } from 'vitest';
import { StatusRoleService } from '../src/status-roles/service.js';
import { ControlStore } from '../src/control/store.js';
import { AccessService } from '../src/control/access.js';
import { Logger } from '../src/logger.js';
import { defaultStatusRoleConfig } from '../src/status-roles/types.js';

const A = '123456789012345678', B = '223456789012345678', U = '323456789012345678', V = '423456789012345678', BOT = '523456789012345678', R = '623456789012345678', S = '723456789012345678';
const folders: string[] = [], services: StatusRoleService[] = [];
afterEach(async () => {
  for (const service of services.splice(0)) { service.stop(); await service.flush(); }
  await Promise.all(folders.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});
it('ignores presence traffic for disabled guilds and nonmatching untracked members', async () => {
  const f = await fixture(); f.service.attach(); await f.service.flush();
  f.presence(U); f.client.emit(Events.PresenceUpdate, null, f.guild.presences.cache.get(U)); await f.service.flush();
  expect(f.guild.members.fetch).not.toHaveBeenCalled();
  await f.service.updateConfig(A, f.config); await f.service.flush();
  f.guild.members.fetch.mockClear(); f.presence(V, 'something else');
  f.client.emit(Events.PresenceUpdate, null, f.guild.presences.cache.get(V)); await f.service.flush();
  expect(f.guild.members.fetch).not.toHaveBeenCalled();
});
async function fixture(available = true) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'cyro-status-service-')); folders.push(dir);
  const control = new ControlStore(dir); await control.init(); const access = new AccessService(control);
  const guild: any = { id: A, available: true, presences: { cache: new Collection() } };
  const roles = new Collection([R, S].map(id => [id, { id, guild, managed: false, editable: true, permissions: new PermissionsBitField() }]));
  guild.roles = { cache: roles, fetch: vi.fn(async () => roles) };
  const members = new Collection<string, any>();
  for (const id of [U, V, BOT]) {
    const member: any = { id, guild, pending: false, user: { id, bot: id === BOT }, roles: { cache: new Collection() }, permissions: new PermissionsBitField(id === BOT ? PermissionFlagsBits.ManageRoles : 0n) };
    member.roles.add = vi.fn(async (roleId: string) => { member.roles.cache.set(roleId, roles.get(roleId)); return member; });
    member.roles.remove = vi.fn(async (roleId: string) => { member.roles.cache.delete(roleId); return member; });
    members.set(id, member);
  }
  guild.members = { cache: members, fetch: vi.fn(async (value: any) => { const found = members.get(typeof value === 'string' ? value : value.user); if (!found) throw Object.assign(new Error('Unknown member'), { code: 10007 }); return found; }), fetchMe: vi.fn(async () => members.get(BOT)) };
  const client: any = new EventEmitter(); client.guilds = { cache: new Collection([[A, guild]]), fetch: vi.fn(async () => guild) }; client.isReady = () => true;
  const logger = new Logger('error'); vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
  const service = new StatusRoleService(client as Client, dir, logger, access, available); services.push(service); await service.init();
  const config = { ...defaultStatusRoleConfig(), enabled: true, text: 'cyrobot.ca', roleId: R };
  const presence = (memberId: string, state: string | null = 'cyrobot.ca', status = 'online') => guild.presences.cache.set(memberId, { userId: memberId, guild, status, activities: state === null ? [] : [{ type: ActivityType.Custom, state }] });
  return { dir, control, access, guild, roles, members, client, logger, service, config, presence };
}
it('grants and revokes only owned roles, persisting receipts before touching Discord', async () => {
  const f = await fixture(); await f.service.updateConfig(A, f.config);
  const member = f.members.get(U); f.presence(U);
  member.roles.add.mockImplementationOnce(async (roleId: string) => {
    const disk = JSON.parse(await readFile(path.join(f.dir, 'status-roles.json'), 'utf8'));
    expect(disk.guilds[A].assignments[`${U}:${R}`].state).toBe('pending-add');
    member.roles.cache.set(roleId, f.roles.get(roleId)); return member;
  });
  await f.service.reconcileMember(A, U); expect(member.roles.add).toHaveBeenCalledOnce();
  expect(f.service.snapshot(A).counts).toEqual({ assigned: 1, pendingAdd: 0, pendingRemove: 0 });
  expect(f.service.snapshot(B).counts.assigned).toBe(0);
  f.presence(U, null); await f.service.reconcileMember(A, U); expect(member.roles.remove).toHaveBeenCalledOnce();
  expect(f.service.snapshot(A).counts.assigned).toBe(0);
  const manual = f.members.get(V); manual.roles.cache.set(R, f.roles.get(R)); f.presence(V);
  await f.service.reconcileMember(A, V); f.presence(V, null); await f.service.reconcileMember(A, V);
  expect(manual.roles.add).not.toHaveBeenCalled(); expect(manual.roles.remove).not.toHaveBeenCalled();
});
it('rechecks access-role safety after writing the pending grant receipt', async () => {
  const f = await fixture(); await f.service.updateConfig(A, f.config); f.presence(U);
  const store = (f.service as any).store, mutate = store.mutate.bind(store);
  vi.spyOn(store, 'mutate').mockImplementation(async (id: string, fn: any) => {
    const result = await mutate(id, fn);
    if (store.get(A).assignments[`${U}:${R}`]?.state === 'pending-add') await f.control.mutate(A, value => { value.access.dashboardRoleIds = [R]; });
    return result;
  });
  await expect(f.service.reconcileMember(A, U)).rejects.toThrow('access roles');
  expect(f.members.get(U).roles.add).not.toHaveBeenCalled();
  expect(f.service.snapshot(A).counts.pendingAdd).toBe(1);
});
it('repairs unknown grant outcomes after restart and clears resolved retry warnings', async () => {
  const f = await fixture(); await f.service.updateConfig(A, f.config); f.presence(U);
  const member = f.members.get(U);
  member.roles.add.mockImplementationOnce(async (roleId: string) => { member.roles.cache.set(roleId, f.roles.get(roleId)); throw new Error('Connection reset after Discord applied it'); });
  await expect(f.service.reconcileMember(A, U)).rejects.toThrow('Connection reset');
  expect(f.service.snapshot(A).counts.pendingAdd).toBe(1); expect(f.service.snapshot(A).warnings).not.toEqual([]);
  await f.service.reconcileMember(A, U); expect(f.service.snapshot(A).warnings).toEqual([]);
  const restarted = new StatusRoleService(f.client, f.dir, f.logger, f.access, true); services.push(restarted); await restarted.init();
  await restarted.reconcile(); expect(member.roles.add).toHaveBeenCalledOnce();
  expect(restarted.snapshot(A).counts.assigned).toBe(1);
  f.presence(U, null); await restarted.reconcileMember(A, U); expect(member.roles.remove).toHaveBeenCalledOnce();
});
it('forgets departed members from gateway evidence without requesting them or revoking other roles', async () => {
  const f = await fixture(); await f.service.updateConfig(A, f.config); f.presence(U);
  await f.service.reconcileMember(A, U); f.service.attach(); await f.service.flush();
  f.guild.members.fetch.mockClear(); const member = f.members.get(U); f.members.delete(U);
  f.client.emit(Events.GuildMemberRemove, member); await f.service.flush();
  expect(f.guild.members.fetch).not.toHaveBeenCalled(); expect(f.service.snapshot(A).counts.assigned).toBe(0);
  expect(member.roles.remove).not.toHaveBeenCalled();
});
it('coalesces rapid status changes and removes an in-flight grant after the latest status clears', async () => {
  const f = await fixture(); await f.service.updateConfig(A, f.config); f.presence(U);
  let release!: () => void, entered!: () => void;
  const waiting = new Promise<void>(resolve => { entered = resolve; });
  const member = f.members.get(U);
  member.roles.add.mockImplementationOnce(async (roleId: string) => { entered(); await new Promise<void>(resolve => { release = resolve; }); member.roles.cache.set(roleId, f.roles.get(roleId)); return member; });
  const initial = f.service.reconcileMember(A, U); await waiting;
  f.presence(U, null);
  const updates = Array.from({ length: 20 }, () => f.service.reconcileMember(A, U)); release();
  await Promise.all([initial, ...updates]);
  expect(member.roles.add).toHaveBeenCalledOnce(); expect(member.roles.remove).toHaveBeenCalledOnce();
  expect(f.service.snapshot(A).counts.assigned).toBe(0);
});
it('keeps invisible/offline and unknown presence by default, removes on online mismatch or explicit offline removal', async () => {
  const f = await fixture(); await f.service.updateConfig(A, f.config); f.presence(U);
  const member = f.members.get(U); await f.service.reconcileMember(A, U);
  f.presence(U, null, 'offline'); await f.service.reconcileMember(A, U); expect(member.roles.remove).not.toHaveBeenCalled();
  f.guild.presences.cache.delete(U); await f.service.reconcileMember(A, U); expect(member.roles.remove).not.toHaveBeenCalled();
  await f.service.updateConfig(A, { ...f.config, offlineBehavior: 'remove' });
  await f.service.reconcileMember(A, U); expect(member.roles.remove).not.toHaveBeenCalled();
  f.presence(U, null, 'offline'); await f.service.reconcileMember(A, U); expect(member.roles.remove).toHaveBeenCalledOnce();
});
it('cleans owned old rewards on role changes and disable even when members are offline', async () => {
  const f = await fixture(); await f.service.updateConfig(A, f.config); f.presence(U);
  const member = f.members.get(U), manual = f.members.get(V); manual.roles.cache.set(R, f.roles.get(R));
  await f.service.reconcileMember(A, U); f.presence(U, null, 'offline');
  await f.service.updateConfig(A, { ...f.config, roleId: S }); await f.service.reconcile();
  expect(member.roles.remove).toHaveBeenCalledWith(R, expect.any(String)); expect(member.roles.add).toHaveBeenCalledTimes(1);
  f.presence(U); await f.service.reconcileMember(A, U); expect(member.roles.add).toHaveBeenLastCalledWith(S, expect.any(String));
  f.presence(U, null, 'offline'); await f.service.updateConfig(A, { ...f.config, enabled: false, roleId: S }); await f.service.reconcile();
  expect(member.roles.remove).toHaveBeenLastCalledWith(S, expect.any(String)); expect(f.service.snapshot(A).counts.assigned).toBe(0);
  expect(manual.roles.remove).not.toHaveBeenCalled();
});
it('recovers pending add and remove receipts after restarting without duplicating completed role operations', async () => {
  const f = await fixture(); await f.service.updateConfig(A, f.config); f.presence(U); const member = f.members.get(U);
  member.roles.add.mockRejectedValueOnce(new Error('Network unavailable'));
  await expect(f.service.reconcileMember(A, U)).rejects.toThrow('Network unavailable'); f.service.stop(); await f.service.flush();
  const second = new StatusRoleService(f.client, f.dir, f.logger, f.access, true); services.push(second); await second.init(); await second.reconcile();
  expect(second.snapshot(A).counts.assigned).toBe(1); expect(member.roles.add).toHaveBeenCalledTimes(2);
  f.presence(U, null);
  member.roles.remove.mockImplementationOnce(async (roleId: string) => { member.roles.cache.delete(roleId); throw new Error('Response lost'); });
  await expect(second.reconcileMember(A, U)).rejects.toThrow('Response lost'); second.stop(); await second.flush();
  const third = new StatusRoleService(f.client, f.dir, f.logger, f.access, true); services.push(third); await third.init(); await third.reconcile();
  expect(third.snapshot(A).counts).toEqual({ assigned: 0, pendingAdd: 0, pendingRemove: 0 }); expect(member.roles.remove).toHaveBeenCalledOnce();
});
it('refuses privileged, managed, cross-server, inaccessible and newly dangerous reward roles', async () => {
  const f = await fixture(), role = f.roles.get(R)!;
  role.permissions = new PermissionsBitField(PermissionFlagsBits.Administrator);
  await expect(f.service.updateConfig(A, f.config)).rejects.toThrow('Privileged');
  role.permissions = new PermissionsBitField(); role.managed = true;
  await expect(f.service.updateConfig(A, f.config)).rejects.toThrow('managed');
  role.managed = false; role.editable = false;
  await expect(f.service.updateConfig(A, f.config)).rejects.toThrow('hierarchy');
  role.editable = true; role.guild = { id: B };
  await expect(f.service.updateConfig(A, f.config)).rejects.toThrow('this server'); role.guild = f.guild;
  f.members.get(BOT).permissions = new PermissionsBitField();
  await expect(f.service.updateConfig(A, f.config)).rejects.toThrow('Manage Roles');
  f.members.get(BOT).permissions = new PermissionsBitField(PermissionFlagsBits.ManageRoles);
  await f.service.updateConfig(A, f.config); f.presence(U);
  role.permissions = new PermissionsBitField(PermissionFlagsBits.ManageGuild);
  await expect(f.service.reconcileMember(A, U)).rejects.toThrow('Privileged'); expect(f.members.get(U).roles.add).not.toHaveBeenCalled();
});
it('does not grant to bots or screening members or act while Discord is unavailable', async () => {
  const f = await fixture(); await f.service.updateConfig(A, f.config); f.presence(U); f.presence(BOT);
  f.members.get(U).pending = true; await f.service.reconcileMember(A, U); await f.service.reconcileMember(A, BOT);
  expect(f.members.get(U).roles.add).not.toHaveBeenCalled(); expect(f.members.get(BOT).roles.add).not.toHaveBeenCalled();
  f.members.get(U).pending = false; f.guild.available = false; await f.service.reconcileMember(A, U);
  f.guild.available = true; f.client.isReady = () => false; await f.service.reconcileMember(A, U);
  expect(f.members.get(U).roles.add).not.toHaveBeenCalled();
  f.client.isReady = () => true; await f.service.reconcileMember(A, U);
  f.presence(U, null); f.guild.available = false; await f.service.reconcileMember(A, U);
  expect(f.members.get(U).roles.remove).not.toHaveBeenCalled(); expect(f.service.snapshot(A).counts.assigned).toBe(1);
});
it('requires Presence Intent to enable and can disable old rules safely without it', async () => {
  const f = await fixture(); await f.service.updateConfig(A, f.config); f.presence(U); await f.service.reconcileMember(A, U);
  f.service.stop(); await f.service.flush();
  const unavailable = new StatusRoleService(f.client, f.dir, f.logger, f.access, false); services.push(unavailable); await unavailable.init();
  expect(unavailable.snapshot(A).available).toBe(false);
  await expect(unavailable.updateConfig(A, f.config)).rejects.toThrow('Presence Intent');
  f.presence(U, null); await unavailable.reconcileMember(A, U); expect(f.members.get(U).roles.remove).not.toHaveBeenCalled();
  await unavailable.updateConfig(A, { ...f.config, enabled: false }); await unavailable.reconcile();
  expect(f.members.get(U).roles.remove).toHaveBeenCalledOnce();
});
it('never calls Discord if writing an ownership receipt fails, and drains in-flight work during stop', async () => {
  const f = await fixture(); await f.service.updateConfig(A, f.config); f.presence(U); const member = f.members.get(U);
  const store = (f.service as any).store;
  vi.spyOn(store, 'mutate').mockRejectedValueOnce(new Error('Disk full'));
  await expect(f.service.reconcileMember(A, U)).rejects.toThrow('Disk full'); expect(member.roles.add).not.toHaveBeenCalled();
  let release!: () => void, entered!: () => void;
  const waiting = new Promise<void>(resolve => { entered = resolve; });
  member.roles.add.mockImplementationOnce(async (roleId: string) => { entered(); await new Promise<void>(resolve => { release = resolve; }); member.roles.cache.set(roleId, f.roles.get(roleId)); return member; });
  const job = f.service.reconcileMember(A, U); await waiting; f.service.stop();
  let drained = false; const draining = f.service.flush().then(() => { drained = true; });
  await Promise.resolve(); expect(drained).toBe(false); release(); await Promise.all([job, draining]);
  expect(drained).toBe(true); expect(f.service.snapshot(A).counts.assigned).toBe(1);
  f.presence(U, null); await f.service.reconcileMember(A, U); expect(member.roles.remove).not.toHaveBeenCalled();
});
it('isolates the same member in two guilds with independent texts and roles', async () => {
  const f = await fixture(), g = await fixture(); g.guild.id = B;
  f.client.guilds.cache.set(B, g.guild); f.client.guilds.fetch.mockImplementation(async (id: string) => f.client.guilds.cache.get(id));
  await f.service.updateConfig(A, f.config); await f.service.updateConfig(B, { ...f.config, text: 'other community', roleId: S });
  f.presence(U); g.presence(U);
  await Promise.all([f.service.reconcileMember(A, U), f.service.reconcileMember(B, U)]);
  expect(f.members.get(U).roles.add).toHaveBeenCalledWith(R, expect.any(String)); expect(g.members.get(U).roles.add).not.toHaveBeenCalled();
  g.presence(U, 'other community'); await f.service.reconcileMember(B, U);
  expect(g.members.get(U).roles.add).toHaveBeenCalledWith(S, expect.any(String));
  f.presence(U, null); await f.service.reconcileMember(A, U);
  expect(f.service.snapshot(A).counts.assigned).toBe(0); expect(f.service.snapshot(B).counts.assigned).toBe(1);
  expect(g.members.get(U).roles.remove).not.toHaveBeenCalled();
});
it('prioritizes matching members over unrelated presences in its bounded background sweep', async () => {
  const f = await fixture(); await f.service.updateConfig(A, f.config);
  for (let n = 0; n < 60; n++) f.presence(String(100000000000000000n + BigInt(n)), 'unrelated');
  f.presence(U); await f.service.reconcile(); expect(f.members.get(U).roles.add).toHaveBeenCalledOnce();
  await f.service.updateConfig(A, { ...f.config, roleId: S });
  expect(f.service.automaticRoleIds(A).sort()).toEqual([R, S]);
  f.presence(U, null); await f.service.reconcile(); expect(f.service.automaticRoleIds(A)).toEqual([S]);
});
