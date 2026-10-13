import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import { Events, type Client } from 'discord.js';
import { expect, it, vi } from 'vitest';
import { CommandHandler } from '../src/commands/handler.js';
import { Logger } from '../src/logger.js';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

it('stops command intake and drains a started provider check and its final reply', async () => {
  const client = new EventEmitter();
  const check = deferred();
  const reply = deferred();
  const monitor = { check: vi.fn(async () => { await check.promise; return { checked: 1, live: 0, offline: 1, errors: 0 }; }) };
  const interaction = {
    commandName: 'streamalerts', guildId: '123456789012345678',
    isAutocomplete: () => false, isChatInputCommand: () => true, inCachedGuild: () => true,
    memberPermissions: { has: () => true }, options: { getSubcommand: () => 'check' },
    deferReply: vi.fn(async () => undefined), editReply: vi.fn(() => reply.promise),
  };
  const handler = new CommandHandler(client as Client, {} as never, {} as never, {} as never, monitor as never, new Logger('error'));
  handler.attach();
  client.emit(Events.InteractionCreate, interaction);
  await setImmediate();
  expect(monitor.check).toHaveBeenCalledOnce();
  handler.stop();
  expect(client.listenerCount(Events.InteractionCreate)).toBe(0);
  client.emit(Events.InteractionCreate, interaction);
  let drained = false;
  const flushing = handler.flush().then(() => { drained = true; });
  await setImmediate();
  expect(drained).toBe(false);
  check.resolve();
  await setImmediate();
  expect(interaction.editReply).toHaveBeenCalledOnce();
  expect(drained).toBe(false);
  reply.resolve();
  await flushing;
  expect(drained).toBe(true);
  expect(monitor.check).toHaveBeenCalledOnce();
});
