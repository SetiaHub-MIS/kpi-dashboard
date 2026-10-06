/**
 * Tugasan remarks and dates reach Postgres even when the box never blurs.
 * In October a remark typed after the tick was lost when the row was closed:
 * these replay that, against the real store with the database writes recorded.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

import { AUTOSAVE_MS, createUnsaved, dateReady, rowOfKey } from '../src/data/tugasanAutosave.ts';

register('./fixtures/stub-resolve.mjs', import.meta.url);
const { useTugasan } = await import('../src/store/useTugasan.ts');
const { writes, gate } = await import('./fixtures/stub-lib-tugasan.ts');
const { tugasanScope } = await import('../src/data/tugasan.ts');

const S = tugasanScope('BBT', 0);
const store = () => useTugasan.getState();
const checks = () => writes.filter((w) => w.kind === 'check').map((w) => w.row);
const lastCheck = () => checks().at(-1);
/** Let pending promise callbacks run (the writes are async). */
const settle = () => new Promise((r) => setImmediate(r));
const fresh = () => {
  writes.length = 0;
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
  assert.equal(lastCheck().note, null, 'the tick goes in with no remark yet');
  store().setNote(S, 'peti_cash', 0, 'RM4,000');
  // The row is closed: no blur, the screen calls commitEntry.
  assert.deepEqual(await store().commitEntry(S, 'peti_cash', 0), { ok: true });
  assert.equal(lastCheck().note, 'RM4,000');
  assert.equal(lastCheck().done, true);
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
