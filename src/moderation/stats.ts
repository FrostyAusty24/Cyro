import type { Ticket } from './store.js';
export interface StaffStat { userId: string; claims: number; closes: number; averageClaimSeconds: number | null }
export function staffStats(tickets: Ticket[], period: '7d' | '30d' | 'all', now = Date.now()): StaffStat[] {
  const cutoff = period === 'all' ? 0 : now - (period === '7d' ? 7 : 30) * 86400000;
  const stats = new Map<string, StaffStat & { seconds: number }>();
  const get = (id: string) => { if (!stats.has(id)) stats.set(id, { userId: id, claims: 0, closes: 0, averageClaimSeconds: null, seconds: 0 }); return stats.get(id)!; };
  for (const ticket of tickets) {
    if (ticket.claimedBy && ticket.claimedAt && Date.parse(ticket.claimedAt) >= cutoff) { const entry = get(ticket.claimedBy); entry.claims++; entry.seconds += Math.max(0, (Date.parse(ticket.claimedAt) - Date.parse(ticket.createdAt)) / 1000); }
    if (ticket.closedBy && ticket.closedAt && Date.parse(ticket.closedAt) >= cutoff) get(ticket.closedBy).closes++;
  }
  return [...stats.values()].map(({ seconds, ...s }) => ({ ...s, averageClaimSeconds: s.claims ? Math.round(seconds / s.claims) : null })).sort((a, b) => b.closes - a.closes || b.claims - a.claims || a.userId.localeCompare(b.userId));
}
