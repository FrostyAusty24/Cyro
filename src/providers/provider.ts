import type { Platform, ProviderResult, ResolvedStreamer, StreamerRecord, UploadResult } from '../types.js';

export interface StreamProvider {
  readonly platform: Platform;
  isConfigured(): boolean;
  configurationHint(): string;
  resolve(username: string): Promise<ResolvedStreamer>;
  checkMany(records: StreamerRecord[]): Promise<Map<string, ProviderResult>>;
  checkUploads?(records: StreamerRecord[]): Promise<Map<string, UploadResult>>;
  uploadCapability?(record: StreamerRecord): { available: boolean; reason: string };
}

export const PROVIDER_TIMEOUT_MS = 10_000;

export function metricCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

export async function mapConcurrent<T, U>(items: T[], limit: number, task: (item: T) => Promise<U>): Promise<U[]> {
  const output: U[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const index = next++; output[index] = await task(items[index]!); }
  }));
  return output;
}

/** Resolve each username once, then merge aliases by the provider's stable broadcaster ID. */
export async function resolveBroadcasters(records: StreamerRecord[], resolve: (username: string) => Promise<ResolvedStreamer>): Promise<{ userId: string; records: StreamerRecord[] }[]> {
  const usernames = new Map<string, StreamerRecord[]>();
  for (const record of records) { const key = record.platformUserId ? `id:${record.platformUserId}` : `name:${record.username.toLowerCase()}`; const group = usernames.get(key) ?? []; group.push(record); usernames.set(key, group); }
  const resolved = await mapConcurrent([...usernames.values()], 4, async group => {
    const userId = group.find(record => record.platformUserId)?.platformUserId ?? (await resolve(group[0]!.username)).platformUserId;
    if (!userId) throw new Error('The provider did not return a broadcaster ID.');
    return { userId, records: group };
  });
  const byId = new Map<string, { userId: string; records: StreamerRecord[] }>();
  for (const group of resolved) { const existing = byId.get(group.userId); if (existing) existing.records.push(...group.records); else byId.set(group.userId, group); }
  return [...byId.values()];
}

export function providerError(records: StreamerRecord[], error: unknown): Map<string, ProviderResult> {
  const message = error instanceof Error ? error.message : String(error);
  return new Map(records.map((record) => [record.id, { kind: 'error' as const, error: message }]));
}

export function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export async function responseJson<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`${label} returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return response.json() as Promise<T>;
}
