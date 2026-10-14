import { EventEmitter } from 'node:events';
import { expect, it, vi } from 'vitest';
import { NeuralTtsQueue } from '../src/voice/neural-runtime.js';
import { splitSpeechText } from '../src/voice/neural-text.js';

function fakeChild() {
  const child = new EventEmitter() as EventEmitter & Record<string, any>;
  child.connected = true; child.exitCode = null; child.send = vi.fn(); child.kill = vi.fn(() => true);
  child.ref = vi.fn(); child.unref = vi.fn(); child.channel = { ref: vi.fn(), unref: vi.fn() };
  return child;
}
function wav() { const result = Buffer.alloc(100); result.write('RIFF'); result.write('WAVE', 8); return result; }

it('serializes inference across callers using one reusable child', async () => {
  const child = fakeChild(), spawn = vi.fn(() => child as any);
  const runtime = new NeuralTtsQueue({ spawn });
  const first = runtime.synthesize('First message', 'bm_daniel', undefined, 'Frosty');
  const second = runtime.synthesize('Second message', 'af_heart');
  expect(spawn).toHaveBeenCalledTimes(1);
  child.emit('message', { type: 'ready' });
  expect(child.send).toHaveBeenCalledTimes(1);
  const firstId = child.send.mock.calls[0][0].id;
  expect(child.send.mock.calls[0][0]).toMatchObject({ text: 'First message', speakerName: 'Frosty' });
  child.emit('message', { type: 'result', id: firstId, wav: wav() });
  await expect(first).resolves.toEqual(wav());
  expect(child.send).toHaveBeenCalledTimes(2);
  const secondId = child.send.mock.calls[1][0].id;
  expect(child.send.mock.calls[1][0].speakerName).toBeUndefined();
  child.emit('message', { type: 'result', id: secondId, wav: wav() });
  await expect(second).resolves.toEqual(wav());
  expect(spawn).toHaveBeenCalledTimes(1);
  const closing = runtime.close(); child.emit('exit', 0, null); await closing;
});

it('cancels active inference without overlapping processes or discarding another caller', async () => {
  const children: ReturnType<typeof fakeChild>[] = [];
  const runtime = new NeuralTtsQueue({ spawn: () => { const child = fakeChild(); children.push(child); return child as any; } });
  const controller = new AbortController();
  const first = runtime.synthesize('Cancelled message', 'bm_daniel', controller.signal);
  const firstRejected = expect(first).rejects.toThrow(/cancelled/);
  const second = runtime.synthesize('Another server stays queued', 'af_heart');
  children[0].emit('message', { type: 'ready' });
  controller.abort(); await firstRejected;
  expect(children[0].kill).toHaveBeenCalledWith('SIGKILL');
  expect(children).toHaveLength(1);
  children[0].emit('exit', null, 'SIGKILL');
  expect(children).toHaveLength(2);
  children[1].emit('message', { type: 'ready' });
  expect(children[1].send.mock.calls[0][0].text).toBe('Another server stays queued');
  children[1].emit('message', { type: 'result', id: children[1].send.mock.calls[0][0].id, wav: wav() });
  await expect(second).resolves.toEqual(wav());
  const closing = runtime.close(); children[1].emit('exit', 0, null); await closing;
});

it('removes a cancelled queued message without stopping the current caller', async () => {
  const child = fakeChild(), runtime = new NeuralTtsQueue({ spawn: () => child as any });
  const first = runtime.synthesize('Keep playing', 'bm_daniel');
  const controller = new AbortController();
  const second = runtime.synthesize('Never speak this cancelled message', 'af_heart', controller.signal);
  const rejected = expect(second).rejects.toThrow(/cancelled/);
  child.emit('message', { type: 'ready' });
  controller.abort(); await rejected;
  expect(child.kill).not.toHaveBeenCalled();
  child.emit('message', { type: 'result', id: child.send.mock.calls[0][0].id, wav: wav() });
  await first;
  expect(child.send).toHaveBeenCalledTimes(1);
  const closing = runtime.close(); child.emit('exit', 0, null); await closing;
});

it('retires timed-out inference and waits for confirmed exit before recovery', async () => {
  vi.useFakeTimers();
  const children: ReturnType<typeof fakeChild>[] = [];
  const runtime = new NeuralTtsQueue({ timeoutMs: 50, spawn: () => { const child = fakeChild(); children.push(child); return child as any; } });
  try {
    const first = runtime.synthesize('Timeout', 'bm_daniel');
    const rejected = expect(first).rejects.toThrow(/too long/);
    children[0].emit('message', { type: 'ready' });
    await vi.advanceTimersByTimeAsync(51); await rejected;
    const next = runtime.synthesize('Recovery', 'af_heart');
    expect(children).toHaveLength(1);
    children[0].emit('exit', null, 'SIGKILL');
    children[1].emit('message', { type: 'ready' });
    children[1].emit('message', { type: 'result', id: children[1].send.mock.calls[0][0].id, wav: wav() });
    await expect(next).resolves.toEqual(wav());
    const closing = runtime.close(); children[1].emit('exit', 0, null); await closing;
  } finally { vi.useRealTimers(); }
});

it('rejects malformed worker audio and continues the remaining queue', async () => {
  const child = fakeChild(), runtime = new NeuralTtsQueue({ spawn: () => child as any });
  const first = runtime.synthesize('Malformed result', 'bm_daniel');
  const rejected = expect(first).rejects.toThrow(/could not be generated/);
  const second = runtime.synthesize('Valid next result', 'af_heart');
  child.emit('message', { type: 'ready' });
  child.emit('message', { type: 'result', id: child.send.mock.calls[0][0].id, wav: Buffer.alloc(100) });
  await rejected;
  child.emit('message', { type: 'result', id: child.send.mock.calls[1][0].id, wav: wav() });
  await second;
  const closing = runtime.close(); child.emit('exit', 0, null); await closing;
});

it('bounds pending work and kills the model process when shutdown rejects outstanding callers', async () => {
  const child = fakeChild(), runtime = new NeuralTtsQueue({ spawn: () => child as any, maxPending: 2 });
  const first = expect(runtime.synthesize('First', 'bm_daniel')).rejects.toThrow(/stopping/);
  const second = expect(runtime.synthesize('Second', 'af_heart')).rejects.toThrow(/stopping/);
  await expect(runtime.synthesize('Too many', 'af_heart')).rejects.toThrow(/too many/);
  const closing = runtime.close();
  expect(child.kill).toHaveBeenCalledWith('SIGKILL');
  child.emit('exit', null, 'SIGKILL');
  await Promise.all([first, second, closing]);
});

it('splits long speech into short complete-word chunks without dropping text', () => {
  const text = 'Welcome to Cyro. Join our community game night this weekend and bring a friend. Choose a voice that you enjoy, send a message, and hear it spoken in the call. '.repeat(2).trim();
  const chunks = splitSpeechText(text);
  expect(chunks.length).toBeGreaterThan(1);
  expect(chunks.every(chunk => chunk.length <= 100)).toBe(true);
  expect(chunks.join(' ')).toBe(text);
  expect(splitSpeechText('x'.repeat(400)).map(chunk => chunk.length)).toEqual([100, 100, 100, 100]);
});
