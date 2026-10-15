import { expect, it } from 'vitest';
import { staffStats } from '../src/moderation/stats.js';
import type { Application, ModCase, Ticket } from '../src/moderation/store.js';

it('uses claim/close event times for each reporting window and excludes owner closures', () => {
  const now = Date.parse('2026-10-11T12:00:00Z');
  const ticket = (patch: Partial<Ticket>): Ticket => ({ id: 'ticket', channelId: 'channel', ownerId: 'owner', status: 'closed', createdAt: '2026-10-01T12:00:00Z', claimedBy: null, claimedAt: null, closedBy: null, closedAt: '2026-10-11T11:00:00Z', ...patch });
  const tickets = [ticket({ claimedBy: 'staff', claimedAt: '2026-10-01T12:01:00Z', closedBy: 'staff' }), ticket({ id: 'owner-closed' }), ticket({ id: 'recent', createdAt: '2026-10-11T10:00:00Z', claimedAt: '2026-10-11T10:02:00Z', claimedBy: 'staff', closedBy: 'staff' })];
  expect(staffStats(tickets, '7d', now)).toEqual([{ userId: 'staff', claims: 1, closes: 2, averageClaimSeconds: 120, averageCloseSeconds: 432000, openAssigned: 0, moderationActions: 0, applicationsReviewed: 0, totalActions: 3 }]);
  expect(staffStats(tickets, '30d', now)).toEqual([{ userId: 'staff', claims: 2, closes: 2, averageClaimSeconds: 90, averageCloseSeconds: 432000, openAssigned: 0, moderationActions: 0, applicationsReviewed: 0, totalActions: 4 }]);
});

it('separates current workload from the period and excludes automated or unconfirmed reviews', () => {
  const now = Date.parse('2026-10-14T12:00:00Z');
  const createdAt = '2026-10-14T11:00:00Z';
  const tickets: Ticket[] = [{ id: 'old-open', channelId: 'channel', ownerId: 'member', status: 'open', createdAt: '2026-01-01T00:00:00Z', claimedBy: 'staff', claimedAt: '2026-01-01T01:00:00Z', closedBy: null, closedAt: null }];
  const cases: ModCase[] = ['warn', 'purge', 'anti-spam', 'blocked-word', 'support-recovery-release'].map(action => ({ id: action, action, userId: 'member', actorId: 'staff', reason: 'reason', createdAt }));
  const applications: Application[] = ['accepted', 'denied', 'pending'].map(status => ({ id: status, status: status as Application['status'], userId: 'member', createdAt, reviewedBy: 'staff', reviewedAt: createdAt, answers: [], questions: [], messageId: null, channelId: 'channel' }));
  expect(staffStats(tickets, '7d', now, cases, applications)).toEqual([{ userId: 'staff', claims: 0, closes: 0, averageClaimSeconds: null, averageCloseSeconds: null, openAssigned: 1, moderationActions: 2, applicationsReviewed: 2, totalActions: 4 }]);
});

it('ignores invalid and future events and never produces invalid timing averages', () => {
  const now = Date.parse('2026-10-14T12:00:00Z');
  const ticket = (patch: Partial<Ticket>): Ticket => ({ id: 'ticket', channelId: 'channel', ownerId: 'member', status: 'closed', createdAt: 'invalid', claimedBy: 'staff', claimedAt: '2026-10-14T10:00:00Z', closedBy: 'staff', closedAt: '2026-10-14T11:00:00Z', ...patch });
  const rows = staffStats([ticket({}), ticket({ claimedBy: 'future', closedBy: 'future', claimedAt: '2027-01-01', closedAt: '2027-01-01' }), ticket({ claimedBy: 'invalid', closedBy: 'invalid', claimedAt: 'invalid', closedAt: 'invalid' })], 'all', now);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ userId: 'staff', claims: 1, closes: 1, averageClaimSeconds: null, averageCloseSeconds: null, totalActions: 2 });
});
