import { expect, it } from 'vitest';
import { SessionStore, canManageGuild } from '../src/dashboard/auth.js';

it('expires an idle session after 30 minutes even when its absolute lifetime remains', () => {
  const store = new SessionStore();
  const id = store.create({ id: 'a', username: 'Alice', avatar: null }, 'token', 86400, 0);
  expect(store.get(id, 30 * 60_000)).toBeUndefined();
});

it('refreshes authenticated activity without extending the absolute eight-hour expiry', () => {
  const store=new SessionStore();const id=store.create({id:'a',username:'Alice',avatar:null},'token',86400,0);
  for(let minute=20;minute<480;minute+=20)expect(store.get(id,minute*60_000)).toBeDefined();
  expect(store.get(id,480*60_000)).toBeUndefined();
});

it('binds one-use OAuth state to the same browser and rejects expired state', () => {
  const store = new SessionStore();
  const state = store.beginLogin(100);
  expect(store.consumeLogin(state, 'different-browser', 101)).toBe(false);
  expect(store.consumeLogin(state, state, 101)).toBe(true);
  expect(store.consumeLogin(state, state, 102)).toBe(false);
  const expired = store.beginLogin(100);
  expect(store.consumeLogin(expired, expired, 100 + 601_000)).toBe(false);
});

it('keeps sessions private, expires them, and accepts only guild management permissions', () => {
  const store=new SessionStore();
  const first=store.create({id:'a',username:'Alice',avatar:null},'token-a',60,100);
  const second=store.create({id:'b',username:'Bob',avatar:null},'token-b',60,100);
  expect(store.get(first,101)?.user.id).toBe('a');
  expect(store.get(first,101)?.csrfToken).not.toBe(store.get(second,101)?.csrfToken);
  expect(store.get(first,60100)).toBeUndefined();
  expect(canManageGuild('32')).toBe(true);expect(canManageGuild('8')).toBe(true);
  expect(canManageGuild('0',true)).toBe(true);expect(canManageGuild('1024')).toBe(false);
  expect(canManageGuild('invalid')).toBe(false);
});
