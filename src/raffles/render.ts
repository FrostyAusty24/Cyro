import { Worker } from 'node:worker_threads';
import path from 'node:path';
export interface WheelImage { names: string[]; winner: number | null; spin: boolean; caption: string; color: string }
export type WheelRenderer = (image: WheelImage) => Promise<Buffer>;
let tail: Promise<unknown> = Promise.resolve(), waiting = 0;
/** Canvas and video encoding run outside the Gateway thread, one bounded render at a time. */
export const renderWheel: WheelRenderer = input => {
  if (waiting >= 16) return Promise.reject(new Error('Wheel renderer is busy.'));
  waiting++;
  const task = tail.catch(() => undefined).then(() => new Promise<Buffer>((resolve, reject) => {
    const worker = new Worker(path.resolve('scripts/raffle-render-worker.mjs'), { workerData: input, resourceLimits: { maxOldGenerationSizeMb: 128 } });
    const timeout = setTimeout(() => { void worker.terminate(); reject(new Error('Wheel render timed out.')); }, 40_000); timeout.unref();
    worker.once('message', (message: { data?: Uint8Array; error?: string }) => { clearTimeout(timeout); if (message.data) resolve(Buffer.from(message.data)); else reject(new Error('Wheel render failed.')); });
    worker.once('error', error => { clearTimeout(timeout); reject(error); });
    worker.once('exit', code => { clearTimeout(timeout); reject(new Error(`Wheel renderer stopped (${code}).`)); });
  }));
  tail = task.finally(() => { waiting--; }).catch(() => undefined); return task;
};
