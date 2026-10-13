import { EventEmitter } from 'node:events';
import { expect, it } from 'vitest';
import { Events } from 'discord.js';
import { ModerationService } from '../src/moderation/index.js';

it('stops accepting events and drains interactions, new messages, and edits before flush completes', async () => {
  const client = new EventEmitter();
  const service = new ModerationService(client as never, '.', { warn() {}, error() {} } as never);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started = 0, completed = 0;
  const work = async () => { started++; await gate; completed++; };
  (service as any).handleInteraction = work;
  (service as any).automod = work;
  service.attach();
  client.emit(Events.InteractionCreate, {});
  client.emit(Events.MessageCreate, {});
  client.emit(Events.MessageUpdate, {}, {});
  service.stop();
  client.emit(Events.MessageCreate, {});
  let drained = false;
  const flushing = service.flush().then(() => { drained = true; });
  await new Promise(resolve => setImmediate(resolve));
  expect(started).toBe(3);
  expect(drained).toBe(false);
  release(); await flushing;
  expect(completed).toBe(3);
});
