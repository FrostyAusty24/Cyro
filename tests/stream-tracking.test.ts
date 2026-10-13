import { expect, it, vi } from 'vitest';
import { AlertService } from '../src/services/alert-service.js';
import { Logger } from '../src/logger.js';
import type { LiveSnapshot, StreamerRecord } from '../src/types.js';

const snapshot: LiveSnapshot = { sessionId: 'broadcast-1', title: 'Playing together', viewerCount: 25, url: 'https://twitch.tv/creator' };
function setup(overrides: Partial<StreamerRecord> = {}) {
  let record: StreamerRecord = { id: 'stream-a', guildId: 'guild-a', platform: 'twitch', username: 'creator', displayName: 'Creator',
    alertChannelId: 'channel-a', cooldownSeconds: 0, cleanupMode: 'keep', messageTemplate: '{url}', enabled: true, state: 'unknown',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
  const message = { id: 'message-a', channelId: 'channel-a', guildId: 'guild-a', author: { id: 'bot' } };
  const send = vi.fn(async () => message);
  const fetchMessage = vi.fn(async () => message);
  const channel = { guildId: 'guild-a', isSendable: () => true, isTextBased: () => true, messages: { fetch: fetchMessage }, send };
  const client = { user: { id: 'bot' }, guilds: { fetch: vi.fn(async () => ({ id: 'guild-a', channels: { fetch: vi.fn(async () => channel) } })) } };
  const store = { update: vi.fn(async (_id: string, patch: Partial<StreamerRecord>) => (record = { ...record, ...patch })), forGuild: async () => [record] };
  const analytics = { observe: vi.fn(async () => undefined), pause: vi.fn(async () => undefined) };
  const service = new AlertService(client as never, store as never, new Logger('error'), analytics);
  return { service, analytics, send, fetchMessage, message, store, record: () => record };
}

it('starts analytics only after a real announcement is successfully posted and saved', async () => {
  const test = setup();
  await test.service.markLive(test.record(), snapshot);
  expect(test.analytics.observe).toHaveBeenCalledWith(expect.objectContaining({ alertMessageId: 'message-a', alertedSessionId: snapshot.sessionId }), expect.objectContaining(snapshot));
  expect(test.send).toHaveBeenCalledOnce();
  expect(test.analytics.observe.mock.invocationCallOrder[0]).toBeGreaterThan(test.store.update.mock.invocationCallOrder.at(-1)!);
});

it('refreshes the actual bot message before counting a later live sample', async () => {
  const test = setup({ state: 'live', currentSessionId: snapshot.sessionId, alertedSessionId: snapshot.sessionId, alertMessageId: 'message-a', alertMessageChannelId: 'channel-a' });
  await test.service.markLive(test.record(), snapshot);
  expect(test.fetchMessage).toHaveBeenCalledWith({ message: 'message-a', cache: false, force: true });
  expect(test.analytics.observe).toHaveBeenCalledOnce();
  expect(test.send).not.toHaveBeenCalled();
});

it('does not announce or collect metrics for a paused streamer even during a manual check', async () => {
  const test = setup({ enabled: false });
  await test.service.markLive(test.record(), snapshot);
  expect(test.send).not.toHaveBeenCalled();
  expect(test.analytics.observe).not.toHaveBeenCalled();
  expect(test.analytics.pause).toHaveBeenCalledWith('stream-a');
});

it('ends analytics before offline cleanup even when the announcement is kept', async () => {
  const test = setup({ state: 'live', currentSessionId: snapshot.sessionId, alertedSessionId: snapshot.sessionId, alertMessageId: 'message-a', alertMessageChannelId: 'channel-a' });
  await test.service.markOffline(test.record());
  expect(test.analytics.pause).toHaveBeenCalledWith('stream-a');
  expect(test.analytics.observe).not.toHaveBeenCalled();
});

it('stops analytics when a configured streamer is removed', async () => {
  const test = setup({ state: 'live', alertMessageId: 'message-a' });
  await test.service.retire(test.record());
  expect(test.analytics.pause).toHaveBeenCalledWith('stream-a');
});

it('breaks the previous broadcast baseline before a replacement announcement can fail', async () => {
  const test = setup({ state: 'live', currentSessionId: 'older', alertedSessionId: 'older', alertMessageId: 'older-message', alertMessageChannelId: 'channel-a' });
  test.send.mockRejectedValueOnce(new Error('Discord unavailable'));
  await test.service.markLive(test.record(), snapshot);
  expect(test.analytics.pause).toHaveBeenCalledWith('stream-a');
  expect(test.analytics.observe).not.toHaveBeenCalled();
});

it.each(['deleted', 'different-guild', 'different-author'])('does not count an announcement that is %s', async (reason) => {
  const test = setup({ state: 'live', currentSessionId: snapshot.sessionId, alertedSessionId: snapshot.sessionId, alertMessageId: 'message-a', alertMessageChannelId: 'channel-a' });
  if (reason === 'deleted') test.fetchMessage.mockRejectedValueOnce(new Error('Unknown message'));
  if (reason === 'different-guild') test.message.guildId = 'guild-b';
  if (reason === 'different-author') test.message.author.id = 'another-user';
  await test.service.markLive(test.record(), snapshot);
  expect(test.analytics.observe).not.toHaveBeenCalled();
  expect(test.analytics.pause).toHaveBeenCalledWith('stream-a');
  expect(test.send).not.toHaveBeenCalled();
});

it('excludes test announcements and streams blocked by title filters or cooldowns', async () => {
  const test = setup();
  await test.service.testAlert(test.record());
  expect(test.analytics.observe).not.toHaveBeenCalled();
  for (const override of [{ titleFilter: 'a different game' }, { cooldownSeconds: 300, lastAlertAt: new Date().toISOString() }]) {
    const blocked = setup(override);
    await blocked.service.markLive(blocked.record(), snapshot);
    expect(blocked.send).not.toHaveBeenCalled();
    expect(blocked.analytics.observe).not.toHaveBeenCalled();
  }
});

it('does not use a follower total fetched before the announcement as a growth baseline', async () => {
  const test = setup();
  await test.service.markLive(test.record(), { ...snapshot, followerCount: 100 });
  expect(test.analytics.observe).toHaveBeenLastCalledWith(expect.anything(),expect.objectContaining({ followerCount: undefined }));
  await test.service.markLive(test.record(), { ...snapshot, followerCount: 105 });
  expect(test.analytics.observe).toHaveBeenLastCalledWith(expect.anything(),expect.objectContaining({ followerCount: 105 }));
});
