/**
 * The clock the whole app files marks against.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  currentPeriod,
  daysBetweenIso,
  periodKey,
  periodLabel,
  periodOf,
  recentPeriods,
  samePeriod,
  todayIso,
  todayShort,
  weekIndexOf,
  weekOfMonth,
  weekRangeLabel,
} from '../src/data/period.ts';

test('today is read in local time, not UTC', () => {
  // 9pm in Kelantan (UTC+8) is still the 9th there and already the 10th in UTC.
  // Filing that mark under the 10th would put it in the wrong week at a month
  // boundary, so the local reading is the one that matters.
  const late = new Date(2026, 8, 9, 21, 30);
  assert.equal(todayIso(late), '2026-09-09');
  assert.equal(todayShort(late), '9/9/2026');
});

test('single digits are padded in ISO and left bare in the short form', () => {
  const d = new Date(2026, 0, 5);
  assert.equal(todayIso(d), '2026-01-05');
  assert.equal(todayShort(d), '5/1/2026');
});

test('periods carry the month as 1-12, not a zero-based index', () => {
  assert.deepEqual(currentPeriod(new Date(2026, 8, 9)), { year: 2026, month: 9 });
  assert.deepEqual(periodOf('2026-09-09'), { year: 2026, month: 9 });
  assert.equal(periodKey({ year: 2026, month: 9 }), '2026-09');
  assert.equal(periodLabel({ year: 2026, month: 9 }), 'SEPTEMBER 2026');
  assert.equal(periodLabel({ year: 2026, month: 3 }), 'MAC 2026');
  assert.ok(samePeriod({ year: 2026, month: 9 }, periodOf('2026-09-30')));
  assert.ok(!samePeriod({ year: 2026, month: 9 }, periodOf('2026-10-01')));
});

test('the month switcher ends on the current month and walks back', () => {
  const months = recentPeriods(3, new Date(2026, 8, 9));
  assert.deepEqual(months, [
    { year: 2026, month: 7 },
    { year: 2026, month: 8 },
    { year: 2026, month: 9 },
  ]);
  assert.deepEqual(months.map(periodLabel), ['JULAI 2026', 'OGOS 2026', 'SEPTEMBER 2026']);
});

test('the switcher crosses a year boundary without producing month 0', () => {
  const months = recentPeriods(3, new Date(2026, 1, 15));
  assert.deepEqual(months, [
    { year: 2025, month: 12 },
    { year: 2026, month: 1 },
    { year: 2026, month: 2 },
  ]);
});

test('weeks follow the workbook: four columns whatever the month length', () => {
  assert.equal(weekOfMonth('2026-09-01'), 1);
  assert.equal(weekOfMonth('2026-09-07'), 1);
  assert.equal(weekOfMonth('2026-09-08'), 2);
  assert.equal(weekOfMonth('2026-09-14'), 2);
  assert.equal(weekOfMonth('2026-09-21'), 3);
  assert.equal(weekOfMonth('2026-09-22'), 4);
  // Days 29-31 have no fifth column on the form, so they fall into week 4.
  assert.equal(weekOfMonth('2026-08-31'), 4);
  assert.equal(weekIndexOf('2026-09-09'), 1, 'week 2 is index 1');
});

test('day arithmetic is stable across a daylight-free timezone shift', () => {
  assert.equal(daysBetweenIso('2026-09-01', '2026-09-09'), 8);
  assert.equal(daysBetweenIso('2026-09-09', '2026-09-01'), -8);
  assert.equal(daysBetweenIso('2026-06-25', '2026-09-08'), 75);
});

test('the week header names the days it covers', () => {
  const sep = { year: 2026, month: 9 };
  assert.equal(weekRangeLabel(sep, 1), '1–7 Sep');
  assert.equal(weekRangeLabel(sep, 2), '8–14 Sep');
  assert.equal(weekRangeLabel(sep, 3), '15–21 Sep');
  // Week 4 absorbs whatever the month has left, so a 30-day month ends at 30
  // and a 31-day one at 31. Stopping at 28 would leave days off the form.
  assert.equal(weekRangeLabel(sep, 4), '22–30 Sep');
  assert.equal(weekRangeLabel({ year: 2026, month: 8 }, 4), '22–31 Ogos');
  assert.equal(weekRangeLabel({ year: 2026, month: 2 }, 4), '22–28 Feb');
  assert.equal(weekRangeLabel({ year: 2028, month: 2 }, 4), '22–29 Feb', 'leap year');
});
