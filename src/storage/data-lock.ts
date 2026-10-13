import { mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import lockfile from 'proper-lockfile';

interface DataLockOptions {
  /** Wait only for an existing owner; callers otherwise fail immediately. */
  waitMs?: number;
  signal?: AbortSignal;
  onWaiting?: () => void;
}

function ownershipError(): Error {
  return new Error('Another bot process owns this data folder. Stop the other instance. After a crash, allow up to 60 seconds for the abandoned lock to expire; never remove a live lock.');
}

/** One active process owns a local persistent data directory, including all its JSON stores. */
export async function acquireDataLock(directory: string, onCompromised?: (error: Error) => void, options: DataLockOptions = {}): Promise<() => Promise<void>> {
  const waitMs = options.waitMs ?? 0;
  if (!Number.isFinite(waitMs) || waitMs < 0 || waitMs > 75_000) throw new RangeError('Data-lock wait must be between 0 and 75000 milliseconds.');
  options.signal?.throwIfAborted();
  const deadline = performance.now() + waitMs;
  await mkdir(directory, { recursive: true });
  const canonical = await realpath(directory);
  let waiting = false;
  while (true) {
    options.signal?.throwIfAborted();
    if (waiting && performance.now() >= deadline) throw ownershipError();
    let release: () => Promise<void>;
    try {
      release = await lockfile.lock(canonical, {
        lockfilePath: path.join(canonical, '.bot-owner.lock'),
        stale: 60_000,
        update: 5_000,
        retries: 0,
        ...(onCompromised ? { onCompromised } : {}),
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ELOCKED') throw error;
      const remaining = deadline - performance.now();
      if (remaining <= 0) throw ownershipError();
      if (!waiting) options.onWaiting?.();
      waiting = true;
      await delay(Math.min(1_000, remaining), undefined, { signal: options.signal });
      continue;
    }
    // An in-flight filesystem acquisition cannot be cancelled; release before reporting cancellation.
    if (options.signal?.aborted || (waiting && performance.now() >= deadline)) {
      await release();
      options.signal?.throwIfAborted();
      throw ownershipError();
    }
    let released = false;
    return async () => { if (!released) { released = true; await release(); } };
  }
}
