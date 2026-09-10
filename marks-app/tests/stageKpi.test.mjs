/**
 * How the stor roles are measured. Kerani stor have no checklist form — they
 * are graded on the returns they move — so this is their whole KPI.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { stageKpi } from '../src/data/stageKpi.ts';

const TODAY = '2026-09-10';

const bill = (id, events, disposition = 'supplier', billDate = '2026-09-01') => ({
  id,
  branchId: 'DMC',
  outlet: 'Kedai Machang',
  billNo: id,
  billDate,
  reason: 'damage',
  remark: '',
  supplier: 'Munchy',
  disposition,
  events,
});

test('a bill waiting on the clerk counts against the clerk, not the store', () => {
  const records = [
    // Segregated, so the next step is supplier_called — the clerk's.
    bill('A', {
      received: '2026-09-01',
      submitted_to_clerk: '2026-09-02',
      segregated: '2026-09-03',
    }),
  ];

  const clerk = stageKpi(records, 'clerk', TODAY);
  const store = stageKpi(records, 'store', TODAY);

  assert.equal(clerk.waiting, 1, 'the clerk is holding it');
  assert.equal(store.waiting, 0, 'the store has done its part');
  assert.equal(clerk.oldestWaitingDays, 9, 'received 1 Sep, today the 10th');
});

test('the clerk is answerable for the gap before they act, not after', () => {
  const records = [
    bill('A', {
      received: '2026-09-01',
      submitted_to_clerk: '2026-09-02',
      segregated: '2026-09-03',
      supplier_called: '2026-09-05',  // 2 days after segregation
      picked_up: '2026-09-12',        // 7 days after the call
      adjusted: '2026-09-13',
    }),
  ];

  const clerk = stageKpi(records, 'clerk', TODAY);
  assert.equal(clerk.waiting, 0, 'nothing left on their desk');
  assert.equal(clerk.stamped, 2, 'they stamped the call and the pickup');
  assert.deepEqual(
    clerk.hops.map((h) => [h.from, h.to, h.avgDays]),
    [
      ['supplier_called', 'picked_up', 7],
      ['segregated', 'supplier_called', 2],
    ],
    'slowest hop first'
  );
  assert.equal(clerk.avgHandoverDays, 5, '(2 + 7) / 2');

  // The store's own hops are separate and unaffected.
  const store = stageKpi(records, 'store', TODAY);
  assert.equal(store.stamped, 4, 'received, submitted, segregated, adjusted');
});

test('an aged bill sitting on the clerk is flagged as theirs', () => {
  const records = [
    bill('OLD', {
      received: '2026-06-25',
      submitted_to_clerk: '2026-06-30',
      segregated: '2026-07-01',
    }, 'supplier', '2026-06-25'),
    bill('NEW', {
      received: '2026-09-08',
      submitted_to_clerk: '2026-09-09',
      segregated: '2026-09-09',
    }),
  ];

  const clerk = stageKpi(records, 'clerk', TODAY);
  assert.equal(clerk.waiting, 2);
  assert.equal(clerk.waitingAged, 1, 'only the June bill is past two months');
  assert.equal(clerk.oldestWaitingDays, 77);
});

test('a discarded bill never reaches the clerk', () => {
  const records = [
    bill('D', {
      received: '2026-09-01',
      submitted_to_clerk: '2026-09-02',
      segregated: '2026-09-03',
    }, 'discard'),
  ];

  const clerk = stageKpi(records, 'clerk', TODAY);
  const store = stageKpi(records, 'store', TODAY);
  assert.equal(clerk.waiting, 0, 'the discard route skips them entirely');
  assert.equal(store.waiting, 1, 'it is the store that must bin it');
});

test('a bill not yet segregated is the store\'s, whatever its route will be', () => {
  const records = [bill('U', { received: '2026-09-08' }, null)];
  assert.equal(stageKpi(records, 'store', TODAY).waiting, 1);
  assert.equal(stageKpi(records, 'clerk', TODAY).waiting, 0);
});

test('never having completed a hop reads as no average, not as zero days', () => {
  const records = [
    bill('A', { received: '2026-09-01', submitted_to_clerk: '2026-09-02', segregated: '2026-09-03' }),
  ];
  const clerk = stageKpi(records, 'clerk', TODAY);
  assert.equal(clerk.avgHandoverDays, null);
  assert.deepEqual(clerk.hops, []);
});

test('an empty branch has an empty KPI rather than a broken one', () => {
  const k = stageKpi([], 'clerk', TODAY);
  assert.deepEqual(k, {
    waiting: 0,
    waitingAged: 0,
    oldestWaitingDays: 0,
    stamped: 0,
    hops: [],
    avgHandoverDays: null,
  });
});

test('a stage stamped before the one it follows is flagged, not clamped', () => {
  // The seed has exactly this: segregated on the 2nd, submitted on the 3rd.
  // Clamping to zero would read as an instant handover instead of bad dates.
  const records = [
    bill('B', {
      received: '2026-09-01',
      submitted_to_clerk: '2026-09-03',
      segregated: '2026-09-02',
    }),
  ];

  const store = stageKpi(records, 'store', TODAY);
  const hop = store.hops.find((h) => h.to === 'segregated');
  assert.equal(hop.avgDays, -1);
  assert.equal(hop.outOfOrder, true);

  const normal = store.hops.find((h) => h.to === 'submitted_to_clerk');
  assert.equal(normal.outOfOrder, false);
});
