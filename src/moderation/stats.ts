import type { Application, ModCase, Ticket } from './store.js';

export interface StaffStat {
  userId: string; claims: number; closes: number; averageClaimSeconds: number | null;
  averageCloseSeconds: number | null; openAssigned: number; moderationActions: number;
  applicationsReviewed: number; totalActions: number;
}
// Automatic filters and recovery receipts do not count as human moderation.
const HUMAN_ACTIONS = new Set(['warn', 'timeout', 'kick', 'ban', 'purge']);
export function staffStats(tickets: Ticket[], period: '7d' | '30d' | 'all', now = Date.now(), cases: ModCase[] = [], applications: Application[] = []): StaffStat[] {
  const cutoff = period === 'all' ? 0 : now - (period === '7d' ? 7 : 30) * 86400000;
  const inWindow = (time: string | null) => { const value = time ? Date.parse(time) : NaN; return Number.isFinite(value) && value >= cutoff && value <= now; };
  const stats = new Map<string, StaffStat & { claimSeconds: number; claimSamples: number; closeSeconds: number; closeSamples: number }>();
  const get = (id: string) => {
    if (!stats.has(id)) stats.set(id, { userId: id, claims: 0, closes: 0, averageClaimSeconds: null, averageCloseSeconds: null, openAssigned: 0, moderationActions: 0, applicationsReviewed: 0, totalActions: 0, claimSeconds: 0, claimSamples: 0, closeSeconds: 0, closeSamples: 0 });
    return stats.get(id)!;
  };
  for (const ticket of tickets) {
    if (ticket.status === 'open' && ticket.claimedBy) get(ticket.claimedBy).openAssigned++;
    if (ticket.claimedBy && inWindow(ticket.claimedAt)) {
      const entry = get(ticket.claimedBy); entry.claims++;
      const elapsed = (Date.parse(ticket.claimedAt!) - Date.parse(ticket.createdAt)) / 1000;
      if (Number.isFinite(elapsed) && elapsed >= 0) { entry.claimSeconds += elapsed; entry.claimSamples++; }
    }
    if (ticket.status === 'closed' && ticket.closedBy && inWindow(ticket.closedAt)) {
      const entry = get(ticket.closedBy); entry.closes++;
      const elapsed = (Date.parse(ticket.closedAt!) - Date.parse(ticket.createdAt)) / 1000;
      if (Number.isFinite(elapsed) && elapsed >= 0) { entry.closeSeconds += elapsed; entry.closeSamples++; }
    }
  }
  for (const item of cases) if (HUMAN_ACTIONS.has(item.action) && item.actorId && inWindow(item.createdAt)) get(item.actorId).moderationActions++;
  for (const item of applications) if (item.status !== 'pending' && item.reviewedBy && inWindow(item.reviewedAt)) get(item.reviewedBy).applicationsReviewed++;
  return [...stats.values()].map(({ claimSeconds, claimSamples, closeSeconds, closeSamples, ...row }) => ({
    ...row,
    averageClaimSeconds: claimSamples ? Math.round(claimSeconds / claimSamples) : null,
    averageCloseSeconds: closeSamples ? Math.round(closeSeconds / closeSamples) : null,
    totalActions: row.claims + row.closes + row.moderationActions + row.applicationsReviewed,
  })).sort((a, b) => b.totalActions - a.totalActions || b.closes - a.closes || b.claims - a.claims || a.userId.localeCompare(b.userId));
}
