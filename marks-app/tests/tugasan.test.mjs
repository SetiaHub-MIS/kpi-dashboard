/**
 * The mapping between the Tugasan screen's scope/week model and the
 * tugasan_checks / tugasan_signoffs tables — the part that can silently
 * misfile a week if it is wrong.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PERIODS } from '../src/data/checklist.ts';
import { tugasanKey, tugasanScope } from '../src/data/tugasan.ts';
import { isoToShort, scopeParts, shortToIso, snapshotFromRows } from '../src/data/tugasanRows.ts';

const last = PERIODS.length - 1;
const current = PERIODS[last];

test('a scope resolves to its outlet and the period the switcher index means', () => {
  assert.deepEqual(scopeParts(tugasanScope('DMC', last)), { branchId: 'DMC', period: current });
  assert.deepEqual(scopeParts(tugasanScope('DKB', 0)), { branchId: 'DKB', period: PERIODS[0] });
});

test('the cross-branch placeholder and an index off the end are not a place to write', () => {
  assert.equal(scopeParts(tugasanScope(null, last)), null, 'ALL is not an outlet');
  assert.equal(scopeParts(`DMC-${PERIODS.length}`), null, 'no such month on the switcher');
  assert.equal(scopeParts('nonsense'), null);
});

test('workbook dates (D/M/YYYY) round-trip through the date column', () => {
  assert.equal(shortToIso('2/8/2026'), '2026-08-02');
  assert.equal(shortToIso('18/9/2026'), '2026-09-18');
  assert.equal(shortToIso('2026-09-18'), '2026-09-18', 'ISO is accepted too');
  assert.equal(isoToShort('2026-08-02'), '2/8/2026');
  assert.equal(isoToShort(null), '');
});

test('a date that is not one is refused rather than guessed', () => {
  assert.equal(shortToIso('31/2/2026'), null, 'February has no 31st');
  assert.equal(shortToIso('tomorrow'), null);
  assert.equal(shortToIso('9/2026'), null);
  assert.equal(shortToIso(''), null, 'blank is simply no date');
});

test('rows come back keyed the way the screen reads them', () => {
  const snap = snapshotFromRows(
    [
      { branchId: 'DMC', period: current, weekNo: 1, itemKey: 'peti_cash', done: true, note: 'RM4,000', inspectedOn: '2026-09-04' },
      { branchId: 'DMC', period: current, weekNo: 3, itemKey: 'x_report', done: false, note: null, inspectedOn: null },
      { branchId: 'DKB', period: { year: 2020, month: 1 }, weekNo: 1, itemKey: 'peti_cash', done: true, note: null, inspectedOn: null },
    ],
    [{ branchId: 'DMC', period: current, weekNo: 1, filledBy: 'AM0001', checkedBy: null, signedOn: '2026-09-04' }]
  );
  const scope = tugasanScope('DMC', last);
  assert.deepEqual(snap.entries[scope][tugasanKey('peti_cash', 0)], { done: true, note: 'RM4,000', tarikh: '4/9/2026' });
  assert.deepEqual(snap.entries[scope][tugasanKey('x_report', 2)], { done: false, note: '', tarikh: '' });
  assert.deepEqual(snap.signoffs[scope][0], { filledBy: 'AM0001', checkedBy: null, tarikh: '4/9/2026' });
  assert.equal(Object.keys(snap.entries).length, 1, 'a month the switcher cannot show is left out');
});
