/**
 * Tugasan remarks and dates reach Postgres even when the box never blurs, and
 * each write sends only what it changes. In October a remark typed after the
 * tick was lost when the row was closed, and a test at Kapar left a week
 * signed as filled with nothing ticked: these replay both, against the real
 * store, with the database writes recorded and applied to stand-in tables.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

import { AUTOSAVE_MS, createUnsaved, dateReady, rowOfKey } from '../src/data/tugasanAutosave.ts';

register('./fixtures/stub-resolve.mjs', import.meta.url);
const { useTugasan } = await import('../src/store/useTugasan.ts');
const { writes, gate, tables, checkRow, signoffRow, writeElsewhere, scopeParts } = await import(
  './fixtures/stub-lib-tugasan.ts'
);
const { tugasanScope } = await import('../src/data/tugasan.ts');

const S = tugasanScope('BBT', 0);
const store = () => useTugasan.getState();
const checks = () => writes.filter((w) => w.kind === 'check').map((w) => w.row);
const lastCheck = () => checks().at(-1);
/** The key of one line of one week in the stand-in tables. */
const at = (itemKey, weekIdx) => ({ ...scopeParts(S), weekNo: weekIdx + 1, itemKey });
/** The line as the table holds it. */
const line = (itemKey, weekIdx) => checkRow(at(itemKey, weekIdx));
/** The week's signatures as the table holds them. */
const week = (weekIdx) => signoffRow(at(undefined, weekIdx));
/** Let pending promise callbacks run (the writes are async). */
const settle = () => new Promise((r) => setImmediate(r));
const fresh = () => {
  writes.length = 0;
  tables.checks.clear();
  tables.signoffs.clear();
  useTugasan.setState({ entriesByMonth: {}, signOffByMonth: {} });
};

// ------------------------------------------------------------- the rules ----

test('the open row key names the item and the week', () => {
  assert.deepEqual(rowOfKey('peti_cash-0'), { itemKey: 'peti_cash', weekIdx: 0 });
  assert.deepEqual(rowOfKey('x_report-3'), { itemKey: 'x_report', weekIdx: 3 });
  assert.equal(rowOfKey('peti_cash-4'), null);
  assert.equal(rowOfKey('nonsense'), null);
});

test('a date is ready when empty or real; a half-typed one waits', () => {
  assert.equal(dateReady(''), true);
  assert.equal(dateReady('18/9/2026'), true);
  assert.equal(dateReady('18/9'), false);
  assert.equal(dateReady('31/2/2026'), false);
});

test('a save clears a row only if nothing was typed while it was written', () => {
  const u = createUnsaved();
  const v1 = u.edit('r');
  const v2 = u.edit('r');
  u.saved('r', v1);
  assert.equal(u.current('r'), v2, 'the newer typing is still unsaved');
  u.saved('r', v2);
  assert.equal(u.current('r'), undefined);
});

// ------------------------------------------------------------- the store ----

test('the October case: a remark typed after the tick is written when the row closes', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  fresh();
  await store().toggle(S, 'peti_cash', 0, '4/10/2026', 'TPG001');
  assert.equal(line('peti_cash', 0).note, null, 'the tick goes in with no remark yet');
  store().setNote(S, 'peti_cash', 0, 'RM4,000');
  // The row is closed: no blur, the screen calls commitEntry.
  assert.deepEqual(await store().commitEntry(S, 'peti_cash', 0), { ok: true });
  assert.equal(line('peti_cash', 0).note, 'RM4,000');
  assert.equal(line('peti_cash', 0).done, true);
  assert.equal(line('peti_cash', 0).inspectedOn, '2026-10-04');
});

test('typing alone is written a moment after it stops', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  fresh();
  store().setNote(S, 'x_report', 1, 'SALES');
  t.mock.timers.tick(AUTOSAVE_MS - 1);
  await settle();
  assert.equal(checks().length, 0, 'not while still typing');
  store().setNote(S, 'x_report', 1, 'SALES OK');
  t.mock.timers.tick(AUTOSAVE_MS - 1);
  await settle();
  assert.equal(checks().length, 0, 'each keystroke starts the wait again');
  t.mock.timers.tick(1);
  await settle();
  assert.equal(checks().length, 1);
  assert.equal(lastCheck().note, 'SALES OK');
});

test('opening and closing a row without typing writes nothing', async () => {
  fresh();
  assert.deepEqual(await store().commitEntry(S, 'peti_cash', 2), { ok: true });
  assert.equal(writes.length, 0);
});

test('a half-typed date is not saved by the pause; closing the row asks for a real one', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  fresh();
  store().setTarikh(S, 'peti_cash', 3, '18/9');
  t.mock.timers.tick(AUTOSAVE_MS);
  await settle();
  assert.equal(writes.length, 0, 'no write, and no error popped up mid-typing');
  const refused = await store().commitEntry(S, 'peti_cash', 3);
  assert.equal(refused.ok, false);
  store().setTarikh(S, 'peti_cash', 3, '18/9/2026');
  assert.deepEqual(await store().commitEntry(S, 'peti_cash', 3), { ok: true });
  assert.equal(lastCheck().inspectedOn, '2026-09-18');
});

test('a keystroke during a save is written by the next save', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  fresh();
  store().setNote(S, 'x_report', 2, 'C2');
  let release;
  gate.next = new Promise((r) => (release = r));
  const first = store().commitEntry(S, 'x_report', 2);
  store().setNote(S, 'x_report', 2, 'C2 - 0.20');
  release();
  await first;
  assert.equal(lastCheck().note, 'C2');
  await store().commitEntry(S, 'x_report', 2);
  assert.equal(lastCheck().note, 'C2 - 0.20');
  await store().commitEntry(S, 'x_report', 2);
  assert.equal(checks().length, 2, 'and nothing more once it is all written');
});

test('ticking after typing writes the remark with the tick, and closing does not write it again', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  fresh();
  store().setNote(S, 'peti_cash', 1, 'RM3,500');
  await store().toggle(S, 'peti_cash', 1, '11/10/2026', 'TPG001');
  assert.equal(lastCheck().note, 'RM3,500');
  assert.equal(lastCheck().done, true);
  await store().commitEntry(S, 'peti_cash', 1);
  assert.equal(checks().length, 1);
});

// --------------------------------------------- each write, only its change ----

test('a remark saved from a phone with an older copy keeps the tick and the date', async () => {
  fresh();
  // Ticked on another phone; this one loaded before that and shows it unticked.
  writeElsewhere('check', { ...at('x_report', 0), done: true, inspectedOn: '2026-10-06' });
  store().setNote(S, 'x_report', 0, 'C1= 1.00 c2 = -1.00');
  assert.deepEqual(await store().commitEntry(S, 'x_report', 0), { ok: true });
  assert.deepEqual(Object.keys(lastCheck()).filter((k) => !['branchId', 'period', 'weekNo', 'itemKey'].includes(k)), ['note'],
    'the save sends the remark and nothing else');
  assert.deepEqual(line('x_report', 0), { done: true, inspectedOn: '2026-10-06', note: 'C1= 1.00 c2 = -1.00' });
});

test('a date saved on its own leaves the remark written elsewhere', async () => {
  fresh();
  writeElsewhere('check', { ...at('peti_cash', 1), done: true, note: 'RM4,000' });
  store().setTarikh(S, 'peti_cash', 1, '12/10/2026');
  await store().commitEntry(S, 'peti_cash', 1);
  assert.deepEqual(line('peti_cash', 1), { done: true, note: 'RM4,000', inspectedOn: '2026-10-12' });
});

test('a tick does not resend a remark or a date it only loaded', async () => {
  fresh();
  // Written elsewhere since this phone loaded: a remark and a date.
  writeElsewhere('check', { ...at('x_report', 2), note: 'SALES OK', inspectedOn: '2026-10-15' });
  useTugasan.setState({ entriesByMonth: { [S]: { 'x_report-2': { done: false, note: '', tarikh: '14/10/2026' } } } });
  await store().toggle(S, 'x_report', 2, '16/10/2026', 'TPG001');
  assert.deepEqual(line('x_report', 2), { done: true, note: 'SALES OK', inspectedOn: '2026-10-15' });
});

test('a note typed beside a half-typed date is written when the row closes; the date waits', async () => {
  fresh();
  store().setNote(S, 'peti_cash', 2, 'RM3,000');
  store().setTarikh(S, 'peti_cash', 2, '18/1');
  const closed = await store().commitEntry(S, 'peti_cash', 2);
  assert.equal(closed.ok, false, 'the date is asked for');
  assert.equal(line('peti_cash', 2).note, 'RM3,000', 'but the remark is not held back by it');
  assert.equal(line('peti_cash', 2).inspectedOn, null);
});

test('the checker’s stamp leaves who filled the week as the table has it', async () => {
  fresh();
  writeElsewhere('signoff', { ...at(undefined, 1), filledBy: 'TPG001', signedOn: '2026-10-11' });
  // This phone's copy has no "filled by" yet.
  await store().stampChecked(S, 1, 'HQ0222');
  assert.deepEqual(week(1), { filledBy: 'TPG001', signedOn: '2026-10-11', checkedBy: 'HQ0222' });
});

// ------------------------------------------------- untick closes the week ----

test('taking the week’s only tick off clears who filled it, the date and any check', async () => {
  fresh();
  await store().toggle(S, 'x_report', 0, '6/10/2026', 'HQ0222');
  assert.deepEqual(week(0), { filledBy: 'HQ0222', signedOn: '2026-10-06', checkedBy: null });
  await store().stampChecked(S, 0, 'TPG001');
  await store().toggle(S, 'x_report', 0, '6/10/2026', 'HQ0222');
  assert.deepEqual(week(0), { filledBy: null, checkedBy: null, signedOn: null }, 'the week reads as not filled');
  assert.deepEqual(store().signOffByMonth[S][0], { filledBy: null, checkedBy: null, tarikh: '' });
  assert.equal(line('x_report', 0).done, false);
  assert.equal(line('x_report', 0).inspectedOn, '2026-10-06', 'the line keeps its inspection date');
});

test('taking one tick off while the other line stays ticked keeps the week filled', async () => {
  fresh();
  await store().toggle(S, 'peti_cash', 3, '25/10/2026', 'HQ0222');
  await store().toggle(S, 'x_report', 3, '25/10/2026', 'HQ0222');
  await store().toggle(S, 'x_report', 3, '25/10/2026', 'HQ0222');
  assert.equal(week(3).filledBy, 'HQ0222');
  assert.equal(writes.filter((w) => w.kind === 'signoff').length, 1, 'the sign-off is written once, by the first tick');
});

test('ticking again after the week was cleared signs it afresh', async () => {
  fresh();
  await store().toggle(S, 'peti_cash', 1, '7/10/2026', 'HQ0222');
  await store().toggle(S, 'peti_cash', 1, '7/10/2026', 'HQ0222');
  await store().toggle(S, 'peti_cash', 1, '8/10/2026', 'TPG001');
  assert.deepEqual(week(1), { filledBy: 'TPG001', checkedBy: null, signedOn: '2026-10-08' });
});
