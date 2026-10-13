import { expect, it } from 'vitest';
import { drainRuntime, startWhileActive } from '../src/services/lifecycle.js';

it('keeps the client and storage ownership until a network-awaiting handler has saved its result', async () => {
  let finish!: () => void;
  const network = new Promise<void>(resolve => { finish = resolve; });
  let stored = false; let accepting = true; let destroyed = false; let released = false;
  const handler = network.then(() => { stored = true; });
  const shutdown = drainRuntime({
    stopIntake: () => { accepting = false; },
    stopProducers: async () => undefined,
    drainHandlers: async () => { await handler; },
    flushStorage: async () => { expect(stored).toBe(true); expect(destroyed).toBe(false); },
    destroyClient: () => { destroyed = true; },
    releaseOwnership: async () => { expect(destroyed).toBe(true); released = true; },
  });
  expect(accepting).toBe(false); expect(destroyed).toBe(false); expect(released).toBe(false);
  finish(); await shutdown;
  expect(stored && destroyed && released).toBe(true);
});

it('does not start the web server or login when shutdown begins during storage initialization', async () => {
  let finish!: () => void; let stopping = false; let networkStarted = false;
  const initialization = new Promise<void>(resolve => { finish = resolve; });
  const startup = startWhileActive([() => initialization, async () => { networkStarted = true; }], () => stopping);
  stopping = true; finish(); await startup;
  expect(networkStarted).toBe(false);
});
