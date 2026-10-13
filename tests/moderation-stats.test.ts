import { expect, it } from 'vitest';
import { staffStats } from '../src/moderation/stats.js';
import type { Ticket } from '../src/moderation/store.js';

it('uses claim/close event times for each reporting window and excludes owner closures', () => {
  const now = Date.parse('2026-10-11T12:00:00Z');
  const ticket = (patch: Partial<Ticket>): Ticket => ({ id: 'ticket', channelId: 'channel', ownerId: 'owner', status: 'closed', createdAt: '2026-10-01T12:00:00Z', claimedBy: null, claimedAt: null, closedBy: null, closedAt: '2026-10-11T11:00:00Z', ...patch });
  const tickets = [ticket({ claimedBy: 'staff', claimedAt: '2026-10-01T12:01:00Z', closedBy: 'staff' }), ticket({ id: 'owner-closed' }), ticket({ id: 'recent', createdAt: '2026-10-11T10:00:00Z', claimedAt: '2026-10-11T10:02:00Z', claimedBy: 'staff', closedBy: 'staff' })];
  expect(staffStats(tickets, '7d', now)).toEqual([{ userId: 'staff', claims: 1, closes: 2, averageClaimSeconds: 120 }]);
  expect(staffStats(tickets, '30d', now)).toEqual([{ userId: 'staff', claims: 2, closes: 2, averageClaimSeconds: 90 }]);
});
