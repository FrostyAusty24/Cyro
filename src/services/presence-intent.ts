/** Discord application flags advertise whether this bot may request GuildPresences. */
export function canUsePresenceIntent(application: unknown, expectedId: string): boolean {
  if (!application || typeof application !== 'object') return false;
  const value = application as {id?: unknown; flags?: unknown; flags_new?: unknown};
  if (value.id !== expectedId) return false;
  if ('flags_new' in value) {
    if (typeof value.flags_new !== 'string' || !/^\d{1,30}$/.test(value.flags_new)) return false;
    return (BigInt(value.flags_new) & 12288n) !== 0n;
  }
  if (typeof value.flags !== 'number' || !Number.isSafeInteger(value.flags) || value.flags < 0) return false;
  return (BigInt(value.flags) & 12288n) !== 0n;
}

export async function probePresenceIntent(readApplication: () => Promise<unknown>, expectedId: string): Promise<boolean> {
  try { return canUsePresenceIntent(await readApplication(), expectedId); }
  catch { return false; } // Never surface an authenticated request or token in diagnostics.
}
