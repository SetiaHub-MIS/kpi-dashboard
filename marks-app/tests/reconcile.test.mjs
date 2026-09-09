/**
 * Reconciliation is the one place the app reads a file it does not control, so
 * it is tested against the real thing: tests/fixtures/transfer-note-2026-08.csv
 * is an unedited export from the stock system.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  guessMapping,
  locationCounts,
  parseCsv,
  parseLooseDate,
  normaliseBill,
  reasonFromBillType,
  reconcile,
  sniffDelimiter,
  toVendorRows,
} from '../src/data/reconcile.ts';

const fixture = readFileSync(
  fileURLToPath(new URL('./fixtures/transfer-note-2026-08.csv', import.meta.url)),
  'utf8'
);

const table = parseCsv(fixture, sniffDelimiter(fixture));
const mapping = guessMapping(table[0]);
const rows = toVendorRows(table, mapping);

test('parses the real export past its BOM', () => {
  assert.equal(sniffDelimiter(fixture), ',');
  assert.equal(table.length, 7, 'header plus six bills');
  assert.equal(table[0][0], 'LOCATION CODE', 'BOM stripped from the first header');
  assert.equal(table[0].length, 6);
});

test('guesses every column the export actually carries', () => {
  assert.deepEqual(mapping, {
    billNo: 2,
    billDate: 1,
    branch: 0,
    billType: 3,
    supplier: null, // the export has no supplier column
    amount: 4,
  });
});

test('reads the export dates day-first', () => {
  assert.equal(parseLooseDate('3/8/2026'), '2026-08-03');
  assert.equal(parseLooseDate('17/8/2026'), '2026-08-17');
  assert.equal(parseLooseDate('2026-08-17'), '2026-08-17');
  assert.equal(parseLooseDate('17/13/2026'), null, 'month 13 is not a date');
  assert.equal(parseLooseDate('17 Ogos 2026'), null, 'unrecognised shapes are not guessed');
});

test('bill types map onto our two reasons, and only those two', () => {
  assert.equal(reasonFromBillType('DELIVERY DAMAGED RETURN'), 'damage');
  assert.equal(reasonFromBillType('DAMAGED GOODS RETURN'), 'damage');
  assert.equal(reasonFromBillType('EXPIRED RETURN'), 'expired');
  assert.equal(reasonFromBillType('GOOD STOCK RETURN'), null, 'saleable stock is neither');
});

test('rows carry bill number, date, location and reason', () => {
  assert.equal(rows.length, 6);
  assert.deepEqual(
    rows.map((r) => r.billNo),
    [
      'DMCTR00000874',
      'DMCTR00000876',
      'DMCTR00000878',
      'DMCTR00000877',
      'DMCTR00000875',
      'DMCTR00000879',
    ]
  );
  assert.equal(rows[0].billDate, '2026-08-03');
  assert.equal(rows[0].branch, 'DMC');
  assert.equal(rows[0].reason, 'damage');
  assert.equal(rows[0].amount, '-1071.3');
  assert.equal(rows[0].line, 2, 'line 1 is the header');
});

test('location codes are reported rather than assumed', () => {
  assert.deepEqual(locationCounts(rows), [{ code: 'DMC', count: 6 }]);
});

test('bill numbers match across punctuation and case', () => {
  assert.equal(normaliseBill('BR-8842'), 'BR8842');
  assert.equal(normaliseBill('br 8842'), 'BR8842');
  assert.equal(normaliseBill('dmctr00000874'), 'DMCTR00000874');
});

const rec = (billNo, over = {}) => ({
  id: billNo,
  branchId: 'MCG',
  outlet: 'Kedai Machang',
  billNo,
  billDate: '2026-08-03',
  reason: 'damage',
  remark: '',
  supplier: 'Munchy Food Industries',
  disposition: null,
  events: { received: '2026-08-03' },
  ...over,
});

test('diffs the real export against our records', () => {
  const records = [
    rec('DMCTR00000874'), // matches, clean
    rec('dmc tr 00000876', { billDate: '2026-08-17' }), // matches despite formatting
    rec('BR-9001'), // ours alone
  ];

  const out = reconcile(records, rows);

  assert.equal(out.matched.length, 2);
  assert.deepEqual(out.appOnly.map((r) => r.billNo), ['BR-9001']);
  assert.deepEqual(
    out.vendorOnly.map((r) => r.billNo),
    ['DMCTR00000878', 'DMCTR00000877', 'DMCTR00000875', 'DMCTR00000879']
  );
  assert.equal(out.duplicates.length, 0);
  assert.equal(out.unparsedDates.length, 0);
  assert.deepEqual(
    out.unknownTypes.map((r) => r.billNo),
    ['DMCTR00000879'],
    'GOOD STOCK RETURN has no reason in our model'
  );
});

test('flags matched bills whose details disagree', () => {
  const records = [
    rec('DMCTR00000874', { billDate: '2026-08-04', reason: 'expired' }),
    rec('DMCTR00000876', { billDate: '2026-08-17' }),
  ];

  const out = reconcile(records, rows);
  const clashed = out.mismatched.find((m) => m.record.billNo === 'DMCTR00000874');

  assert.equal(out.mismatched.length, 1);
  assert.deepEqual(clashed.clashes.sort(), ['billDate', 'reason']);
  assert.equal(clashed.row.billDate, '2026-08-03');
});

test('a bill listed twice is one bill, and is reported as repeated', () => {
  const doubled = [...rows, rows[0]];
  const out = reconcile([rec('DMCTR00000874')], doubled);

  assert.equal(out.matched.length, 1, 'not counted twice');
  assert.deepEqual(out.duplicates, ['DMCTR00000874']);
  assert.equal(out.vendorOnly.length, 5);
});

test('an unmapped supplier column never invents a clash', () => {
  const out = reconcile([rec('DMCTR00000874')], rows);
  assert.deepEqual(out.matched[0].clashes, []);
});

test('quoted cells, CRLF and blank trailing lines survive the parser', () => {
  const csv =
    'LOCATION CODE,Date,Bill Number,Bill Type,Total Bill Amount\r\n' +
    'DMC,3/8/2026,"DMC,TR-1","EXPIRED ""OLD"" RETURN",-10.5\r\n' +
    '\r\n';
  const t = parseCsv(csv);

  assert.equal(t.length, 2);
  assert.deepEqual(t[1], ['DMC', '3/8/2026', 'DMC,TR-1', 'EXPIRED "OLD" RETURN', '-10.5']);
});
