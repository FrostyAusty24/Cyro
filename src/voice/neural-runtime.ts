import { spawn as spawnProcess, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const NEURAL_RUNTIME_DIR = path.resolve('bin', 'tts');
export function neuralRuntimeInstalled(directory = NEURAL_RUNTIME_DIR): boolean {
  return ['installed.json', 'package.json', 'node_modules/kokoro-js/package.json', 'model/config.json', 'model/tokenizer.json', 'model/tokenizer_config.json', 'model/onnx/model_quantized.onnx']
    .every(file => existsSync(path.join(directory, file)));
}

function createChild(directory: string): ChildProcess {
  if (!neuralRuntimeInstalled(directory)) throw new Error('Natural voices are not installed on this host yet.');
  const emittedPath = fileURLToPath(new URL('./kokoro-worker.js', import.meta.url));
  const workerPath = existsSync(emittedPath) ? emittedPath : fileURLToPath(new URL('./kokoro-worker.ts', import.meta.url));
  const args = ['--max-old-space-size=192', '--unhandled-rejections=strict'];
  if (workerPath.endsWith('.ts')) args.push('--import', 'tsx');
  // The worker needs no Discord, streaming-provider or dashboard credentials.
  const env: NodeJS.ProcessEnv = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP']) if (process.env[key]) env[key] = process.env[key];
  return spawnProcess(process.execPath, [...args, workerPath, directory], {
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'], serialization: 'advanced', windowsHide: true, shell: false, env,
  });
}

interface Job {
  id: number; text: string; voice: string; signal?: AbortSignal; abort: () => void;
  resolve: (wav: Buffer) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout>;
}
interface RuntimeOptions { directory?: string; spawn?: () => ChildProcess; timeoutMs?: number; idleMs?: number; maxPending?: number }

/** One model process for all guilds. Cancelling active inference retires it before any replacement starts. */
export class NeuralTtsQueue {
  private readonly factory: () => ChildProcess;
  private readonly timeoutMs: number;
  private readonly idleMs: number;
  private readonly maxPending: number;
  private nextId = 0;
  private queue: Job[] = [];
  private active?: Job;
  private child?: ChildProcess;
  private ready = false;
  private retiring = false;
  private closed = false;
  private idleTimer?: ReturnType<typeof setTimeout>;
  private exited: Promise<void> = Promise.resolve();

  constructor(options: RuntimeOptions = {}) {
    this.factory = options.spawn ?? (() => createChild(options.directory ?? NEURAL_RUNTIME_DIR));
    this.timeoutMs = options.timeoutMs ?? 45_000;
    this.idleMs = options.idleMs ?? 300_000;
    this.maxPending = options.maxPending ?? 12;
  }

  synthesize(text: string, voice: string, signal?: AbortSignal): Promise<Buffer> {
    if (this.closed) return Promise.reject(new Error('Speech is stopping.'));
    if (signal?.aborted) return Promise.reject(new Error('Speech was cancelled.'));
    if (this.queue.length + (this.active ? 1 : 0) >= this.maxPending) return Promise.reject(new Error('Cyro has too many speech messages waiting. Try again shortly.'));
    return new Promise((resolve, reject) => {
      const job: Job = {
        id: ++this.nextId, text, voice, signal, resolve, reject,
        abort: () => this.cancel(job, new Error('Speech was cancelled.')),
        timer: setTimeout(() => this.cancel(job, new Error('Speech took too long. Try a shorter message.')), this.timeoutMs),
      };
      signal?.addEventListener('abort', job.abort, { once: true });
      this.queue.push(job);
      this.pump();
    });
  }

  private settle(job: Job, error?: Error, wav?: Buffer): void {
    clearTimeout(job.timer);
    job.signal?.removeEventListener('abort', job.abort);
    if (this.active === job) this.active = undefined;
    const index = this.queue.indexOf(job);
    if (index !== -1) this.queue.splice(index, 1);
    // Drop the message content as soon as the request leaves the queue.
    job.text = '';
    if (error) job.reject(error); else job.resolve(wav!);
  }

  private cancel(job: Job, error: Error): void {
    if (this.active === job) { this.settle(job, error); this.retire(); }
    else if (this.queue.includes(job)) this.settle(job, error);
  }

  private retire(): void {
    clearTimeout(this.idleTimer);
    if (!this.child || this.retiring) return;
    this.retiring = true;
    this.ready = false;
    this.child.ref();
    this.child.channel?.ref();
    this.child.kill('SIGKILL');
    // Only the confirmed exit handler may spawn a replacement; never overlap model processes.
  }

  private pump(): void {
    if (this.closed || this.retiring || this.active) return;
    clearTimeout(this.idleTimer);
    const job = this.queue.shift();
    if (!job) {
      if (this.child) {
        this.child.unref(); this.child.channel?.unref();
        this.idleTimer = setTimeout(() => this.retire(), this.idleMs);
        this.idleTimer.unref();
      }
      return;
    }
    this.active = job;
    if (!this.child) {
      try { this.start(); }
      catch { this.settle(job, new Error('Natural voices are unavailable on this host.')); this.pump(); return; }
    }
    this.child!.ref(); this.child!.channel?.ref();
    if (this.ready) this.send(job);
  }

  private send(job: Job): void {
    if (!this.child?.connected || this.active !== job) { this.cancel(job, new Error('The speech worker disconnected.')); return; }
    try {
      this.child.send({ type: 'synthesize', id: job.id, text: job.text, voice: job.voice }, error => {
        if (error && this.active === job) this.cancel(job, new Error('The speech worker could not accept this message.'));
      });
    } catch { this.cancel(job, new Error('The speech worker could not accept this message.')); }
  }

  private start(): void {
    const child = this.factory();
    this.child = child;
    this.ready = false;
    this.retiring = false;
    this.exited = new Promise(resolve => {
      const exit = (): void => {
        if (this.child !== child) return;
        this.child = undefined; this.ready = false; this.retiring = false;
        if (this.active) this.settle(this.active, new Error('Natural speech could not be generated. Try again shortly.'));
        resolve();
        this.pump();
      };
      child.once('exit', exit);
      child.once('close', exit);
      child.once('error', () => {
        if (this.child !== child) return;
        if (this.active) this.settle(this.active, new Error('The natural speech worker could not start.'));
        if (!child.pid) exit(); else this.retire();
      });
    });
    child.on('message', (message: unknown) => {
      if (this.child !== child || this.retiring || !message || typeof message !== 'object') return;
      const reply = message as { type?: unknown; id?: unknown; wav?: unknown };
      if (reply.type === 'ready') { this.ready = true; if (this.active) this.send(this.active); return; }
      if (reply.type === 'fatal') {
        if (this.active) this.settle(this.active, new Error('Natural voices could not load on this host.'));
        // An installation failure will affect every waiting request, without logging their contents.
        for (const job of [...this.queue]) this.settle(job, new Error('Natural voices are unavailable on this host.'));
        this.retire(); return;
      }
      const job = this.active;
      if (!job || reply.id !== job.id) return;
      if (reply.type !== 'result' || !Buffer.isBuffer(reply.wav) || reply.wav.length < 44 || reply.wav.length > 4 * 1024 * 1024 || reply.wav.subarray(0, 4).toString() !== 'RIFF' || reply.wav.subarray(8, 12).toString() !== 'WAVE') {
        this.settle(job, new Error('Natural speech could not be generated for this message.'));
      } else this.settle(job, undefined, reply.wav);
      this.pump();
    });
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.active) this.settle(this.active, new Error('Speech is stopping.'));
    for (const job of [...this.queue]) this.settle(job, new Error('Speech is stopping.'));
    this.retire();
    await this.exited;
  }
}
