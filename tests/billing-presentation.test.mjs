import test from 'node:test';
import assert from 'node:assert/strict';
import { subscriptionSummary } from '../src/utils/billing/presentation.ts';

const now = Date.parse('2026-10-08T12:00:00Z');
const paid = { status: 'active', mode: 'live', paid_count: 1, paid_until: '2026-11-08T12:00:00Z' };

test('paid status requires a real payment and an unexpired period', () => {
  assert.equal(subscriptionSummary(paid, now).label, 'Active');
  assert.equal(subscriptionSummary({ ...paid, paid_count: 0 }, now).label, 'Awaiting first payment');
  assert.equal(subscriptionSummary({ ...paid, paid_until: '2026-09-08T12:00:00Z' }, now).label, 'Renewal pending');
  assert.notEqual(subscriptionSummary({ ...paid, mode: 'test' }, now).label, 'Active');
});

test('cancellation shows the paid access expiry rather than a future bill', () => {
  const summary = subscriptionSummary({ ...paid, status: 'cancelled' }, now);
  assert.equal(summary.label, 'Ending soon'); assert.equal(summary.dateLabel, 'Access expires');
  assert.equal(summary.date, '8 Nov 2026');
});

test('completed subscriptions retain their final paid period without promising renewal', () => {
  const summary = subscriptionSummary({ ...paid, status: 'completed' }, now);
  assert.equal(summary.label, 'Ending soon'); assert.equal(summary.dateLabel, 'Access expires');
  assert.equal(summary.canRestart, false);
  assert.equal(subscriptionSummary({ ...paid, status: 'completed', paid_until: '2026-09-08T12:00:00Z' }, now).canRestart, true);
});

test('unpaid subscriptions do not invent billing dates', () => {
  assert.equal(subscriptionSummary(null, now).label, 'Not subscribed');
  assert.equal(subscriptionSummary(null, now).date, 'After your first payment');
  assert.equal(subscriptionSummary({ ...paid, status: 'created', paid_count: 0, paid_until: null }, now).label, 'Checkout pending');
});
