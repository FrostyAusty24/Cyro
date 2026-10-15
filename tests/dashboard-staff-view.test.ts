import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

type StaffRow = { userId: string; claims?: number; closes?: number; moderationActions?: number; applicationsReviewed?: number; totalActions?: number; openAssigned?: number; averageClaimSeconds?: number | null; averageCloseSeconds?: number | null };
type RankedRow = StaffRow & { rank: number; totalActions: number };
const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const start = source.indexOf('function staffLeaderboardRows(');
const end = source.indexOf('\nfunction renderStaff(', start);
const rank = runInNewContext(`${source.slice(start, end)}\nstaffLeaderboardRows;`) as (rows: StaffRow[], sort: string, query: string, activity: string, label: (id: string) => string) => RankedRow[];
const name = (id: string) => ({ '101': 'Sam', '102': 'Jamie', '103': 'Alex' })[id] || id;

describe('dashboard staff ranking', () => {
  it('sorts total activity without changing the stored source rows', () => {
    const rows = [{ userId: '101', claims: 1, closes: 1 }, { userId: '102', moderationActions: 3, applicationsReviewed: 2 }];
    const before = structuredClone(rows);
    const result = rank(rows, 'totalActions', '', 'all', name);
    expect(result.map(row => [row.userId, row.totalActions, row.rank])).toEqual([['102', 5, 1], ['101', 2, 2]]);
    expect(rows).toEqual(before);
  });

  it('supports older ticket-only records without inventing missing activity', () => {
    const result = rank([{ userId: '101', claims: 5, closes: 3 }], 'totalActions', '', 'all', name)[0];
    expect(result).toMatchObject({ totalActions: 8, moderationActions: 0, applicationsReviewed: 0, openAssigned: 0 });
    expect(result.averageClaimSeconds).toBeUndefined();
  });

  it('keeps missing averages after measured results, including a real zero', () => {
    const rows = [{ userId: '101', totalActions: 50, averageClaimSeconds: null }, { userId: '102', totalActions: 2, averageClaimSeconds: 0 }, { userId: '103', totalActions: 3, averageClaimSeconds: 90 }];
    expect(rank(rows, 'averageClaimSeconds', '', 'all', name).map(row => row.userId)).toEqual(['102', '103', '101']);
  });

  it('searches case-insensitive display names and IDs while retaining the global rank', () => {
    const rows = [{ userId: '101', totalActions: 10 }, { userId: '102', totalActions: 20 }];
    expect(rank(rows, 'totalActions', ' sAM ', 'all', name).map(row => [row.userId, row.rank])).toEqual([['101', 2]]);
    expect(rank(rows, 'totalActions', '102', 'all', name).map(row => row.userId)).toEqual(['102']);
  });

  it('filters recorded activity independently of the current assigned workload', () => {
    const rows = [{ userId: '101', openAssigned: 3 }, { userId: '102', closes: 1 }, { userId: '103', applicationsReviewed: 2 }];
    expect(rank(rows, 'openAssigned', '', 'tickets', name).map(row => row.userId)).toEqual(['102']);
    expect(rank(rows, 'totalActions', '', 'applications', name).map(row => row.userId)).toEqual(['103']);
    expect(rank(rows, 'totalActions', '', 'moderation', name)).toEqual([]);
  });
});
