/**
 * The returns chain: the Friday due-date rule, stage ordering, ageing bands
 * and on-time submission. Sprint 5's "returns chain" test-suite story.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ageingStatus,
  bucketOf,
  dueOn,
  gapDays,
  newReturnBlocker,
  nextStage,
  stagesFor,
  submissionStats,
  turnaroundDays,
} from '../src/data/returns.ts';

const record = (overrides) => ({
  id: 'PR0001',
  branchId: 'DMC',
  outlet: 'Kedai Machang',
  billNo: 'BR-0001',
  billDate: '2026-09-01',
  reason: 'damage',
  remark: '',
  supplier: 'Test Supplier',
  disposition: null,
  events: {},
  ...overrides,
});

test('a Monday arrival is due the same week — the next Friday', () => {
  assert.equal(dueOn('2026-09-07'), '2026-09-11'); // Monday -> that Friday
});

test('a list already received on a Friday is due that same day', () => {
  assert.equal(dueOn('2026-09-11'), '2026-09-11');
});

test('a Saturday arrival rolls into next week rather than starting overdue', () => {
  // The rule this session is not to reopen: a Saturday list is not born late.
  assert.equal(dueOn('2026-09-12'), '2026-09-18'); // Saturday -> the Friday after next
});

test('a Sunday arrival is due that same week’s Friday', () => {
  assert.equal(dueOn('2026-09-13'), '2026-09-18');
});

test('the chain runs through segregation, then splits by disposition', () => {
  assert.deepEqual(stagesFor(null), ['received', 'submitted_to_clerk', 'segregated']);
  assert.deepEqual(stagesFor('supplier'), [
    'received', 'submitted_to_clerk', 'segregated', 'supplier_called', 'picked_up', 'adjusted',
  ]);
  assert.deepEqual(stagesFor('discard'), [
    'received', 'submitted_to_clerk', 'segregated', 'discarded', 'adjusted',
  ]);
});

test('nextStage is the first unstamped stage in that record’s own chain', () => {
  const r = record({
    disposition: 'supplier',
    events: { received: '2026-09-01', submitted_to_clerk: '2026-09-02' },
  });
  assert.equal(nextStage(r), 'segregated');
});

test('nextStage is null once every stage in the chain is stamped', () => {
  const r = record({
    disposition: 'discard',
    events: {
      received: '2026-09-01',
      submitted_to_clerk: '2026-09-02',
      segregated: '2026-09-02',
      discarded: '2026-09-03',
      adjusted: '2026-09-04',
    },
  });
  assert.equal(nextStage(r), null);
});

test('a stage stamped before the one it follows still reads forwards, not by date', () => {
  // The bug this rule exists to prevent: two hops on the same day, or logged
  // out of calendar order, must not compute a negative gap.
  const r = record({ events: { received: '2026-09-05', submitted_to_clerk: '2026-09-05' } });
  assert.equal(gapDays(r, 'received', 'submitted_to_clerk'), 0);
});

test('gapDays is null until both ends of the hop are stamped', () => {
  const r = record({ events: { received: '2026-09-01' } });
  assert.equal(gapDays(r, 'received', 'submitted_to_clerk'), null);
});

test('turnaround measures from received, or the bill date if never received', () => {
  const r = record({ billDate: '2026-08-01', events: {} });
  assert.equal(turnaroundDays(r, '2026-08-11'), 10);
});

test('an open record ages against today and keeps climbing', () => {
  const r = record({ events: { received: '2026-08-01' } });
  assert.equal(turnaroundDays(r, '2026-09-01'), 31);
});

test('ageing: ok inside 60 days, breach inside the 7-day grace, overdue past it', () => {
  const opened = '2026-08-01';
  assert.equal(ageingStatus(record({ events: { received: opened } }), '2026-09-29'), 'ok'); // 59 days
  assert.equal(ageingStatus(record({ events: { received: opened } }), '2026-10-03'), 'breach'); // 63 days
  assert.equal(ageingStatus(record({ events: { received: opened } }), '2026-10-15'), 'overdue'); // 75 days
});

test('a cleared record is cleared regardless of how old it is', () => {
  const r = record({ events: { received: '2026-01-01', adjusted: '2026-01-05' } });
  assert.equal(ageingStatus(r, '2026-12-31'), 'cleared');
});

test('submission stats score on-time over received, per Rule 1', () => {
  const records = [
    record({ events: { received: '2026-09-07', submitted_to_clerk: '2026-09-08' } }), // Mon -> due Fri, on time
    record({ events: { received: '2026-09-07', submitted_to_clerk: '2026-09-12' } }), // after the Friday, late
    record({ events: { received: '2026-09-07' } }), // never submitted
    record({ events: {} }), // never received, does not count at all
  ];
  const stats = submissionStats(records);
  assert.deepEqual(stats, { received: 3, onTime: 1, late: 1, missing: 1, pct: 33 });
});

test('an empty list scores 100%, not a division by zero', () => {
  assert.equal(submissionStats([]).pct, 100);
});

test('ageing buckets fall back to the widest band past the named ones', () => {
  assert.equal(bucketOf(1), '≤ 3 hari');
  assert.equal(bucketOf(5), '4–7 hari');
  assert.equal(bucketOf(10), '8–14 hari');
  assert.equal(bucketOf(30), '> 14 hari');
});

test('a new return needs a bill number, a real date, and no duplicate', () => {
  const existing = [record({ billNo: 'BR-1234' })];
  assert.match(newReturnBlocker(existing, '', '2026-09-01'), /No\. bil/);
  assert.match(newReturnBlocker(existing, 'BR-9999', ''), /Tarikh bil/);
  assert.match(newReturnBlocker(existing, 'BR-9999', '1-9-2026'), /YYYY-MM-DD/);
  assert.match(newReturnBlocker(existing, 'br-1234', '2026-09-01'), /sudah direkod/);
  assert.equal(newReturnBlocker(existing, 'BR-9999', '2026-09-01'), null);
});
