/**
 * A week's arithmetic, and the rule that N/A is not a zero.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { scoredOnly, totalsOf } from '../src/data/scoring.ts';

test('a fully scored week is out of every line', () => {
  const scores = { '1-0': 4, '2-0': 4, '3-0': 5 };
  const t = totalsOf(scores, 3, 5);
  assert.deepEqual(t, { total: 13, filled: 3, complete: true, max: 15, pct: 87 });
});

test('the SV week from the workbook: 17 of 19 lines, out of 85', () => {
  // WS0001, June week 1: every applicable perkara scored 4, PERIKSA METER
  // SUBLOT and LAIN-LAIN left N/A. The sheet's own figures are 68 out of 85.
  const scores = {};
  for (let i = 0; i < 17; i++) scores[`k${i}`] = 4;
  scores['meter'] = 'na';
  scores['lain'] = 'na';

  const t = totalsOf(scores, 19, 5);
  assert.equal(t.total, 68, 'the workbook says 68');
  assert.equal(t.max, 85, '17 x 5, not 19 x 5');
  assert.equal(t.pct, 80, 'and 80%, as the sheet computes');
  assert.equal(t.complete, true, 'all 19 lines were answered');
});

test('counting N/A as zero would mark the same week down', () => {
  // The bug this rule exists to prevent, stated as a test.
  const asZero = totalsOf({ a: 4, b: 4, c: 0 }, 3, 5);
  const asNa = totalsOf({ a: 4, b: 4, c: 'na' }, 3, 5);
  assert.equal(asZero.pct, 53);
  assert.equal(asNa.pct, 80);
});

test('a week of nothing but N/A has no percentage rather than zero', () => {
  const t = totalsOf({ a: 'na', b: 'na' }, 2, 5);
  assert.equal(t.max, 0);
  assert.equal(t.pct, 0, 'no division by zero');
  assert.equal(t.complete, true);
});

test('an untouched line is not the same as one marked N/A', () => {
  // Both leave the total alone; only N/A counts as a decision.
  assert.equal(totalsOf({ a: 4 }, 3, 5).complete, false);
  assert.equal(totalsOf({ a: 4, b: 'na', c: 'na' }, 3, 5).complete, true);
});

test('an empty draft is complete only when the form has no lines', () => {
  assert.equal(totalsOf({}, 3, 5).complete, false);
  assert.equal(totalsOf({}, 3, 5).pct, 0);
});

test('only real scores are offered to mark_lines', () => {
  // score is CHECK (score >= 1), so N/A must never reach it.
  assert.deepEqual(scoredOnly({ a: 4, b: 'na', c: 1 }), { a: 4, c: 1 });
  assert.deepEqual(scoredOnly({ a: 'na' }), {});
});
