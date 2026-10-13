interface RuntimeShutdown {
  stopIntake(): void;
  stopProducers(): Promise<void>;
  drainHandlers(): Promise<void>;
  flushStorage(): Promise<void>;
  destroyClient(): void;
  releaseOwnership(): Promise<void>;
}

export async function startWhileActive(phases: Array<() => Promise<unknown>>, isStopping: () => boolean): Promise<void> {
  for (const phase of phases) {
    if (isStopping()) return;
    await phase();
  }
}

/** The caller bounds this entire drain; a failed drain must not release ownership early. */
export async function drainRuntime(runtime: RuntimeShutdown): Promise<void> {
  runtime.stopIntake();
  await runtime.stopProducers();
  await runtime.drainHandlers();
  await runtime.flushStorage();
  runtime.destroyClient();
  await runtime.releaseOwnership();
}
