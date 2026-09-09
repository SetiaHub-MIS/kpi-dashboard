/**
 * The offline queue's rules. First write wins: a mark already in Postgres
 * stands, and the queued one comes back to be shown to the supervisor.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  dismissRejection,
  drainOrder,
  emptyQueue,
  enqueue,
  isRetryable,
  noteAttempt,
  reject,
  settle,
  slotOf,
} from '../src/data/queue.ts';

const input = (over = {}) => ({
  userId: 'KP0093',
  branchId: 'DMC',
  formKey: 'kedai',
  period: { year: 2026, month: 9 },
  weekNo: 2,
  scores: { '1-0': 4 },
  maxScore: 110,
  scoredBy: 'WS0001',
  ...over,
});

const queued = (id, over = {}, at = '2026-09-09T08:00:00Z') => ({
  id,
  input: input(over),
  queuedAt: at,
  attempts: 0,
});

test('a week is identified by person, period and week number', () => {
  assert.equal(slotOf(input()), 'KP0093-2026-9-2');
  assert.notEqual(slotOf(input({ weekNo: 3 })), slotOf(input()));
  assert.notEqual(slotOf(input({ userId: 'KP0103' })), slotOf(input()));
});

test('re-marking the same week offline replaces, rather than queuing twice', () => {
  // Both were typed by the same person on the same device: the second is a
  // correction. Sending both would write the stale one over the fresh one.
  let q = enqueue(emptyQueue, queued('a'));
  q = enqueue(q, queued('b', { scores: { '1-0': 5 } }));

  assert.equal(q.pending.length, 1);
  assert.equal(q.pending[0].id, 'b');
  assert.deepEqual(q.pending[0].input.scores, { '1-0': 5 });
});

test('a different week for the same person queues alongside', () => {
  let q = enqueue(emptyQueue, queued('a'));
  q = enqueue(q, queued('b', { weekNo: 3 }));
  assert.equal(q.pending.length, 2);
});

test('a mark that reached Postgres leaves the queue', () => {
  const q = settle(enqueue(emptyQueue, queued('a')), 'a');
  assert.deepEqual(q.pending, []);
  assert.deepEqual(q.rejected, []);
});

test('a conflicted mark is kept, not dropped', () => {
  const q = reject(enqueue(emptyQueue, queued('a')), 'a', 'Syazana', '2026-09-10T02:00:00Z');

  assert.equal(q.pending.length, 0, 'no longer retried');
  assert.equal(q.rejected.length, 1, 'but not thrown away');
  assert.equal(q.rejected[0].personLabel, 'Syazana');
  assert.equal(q.rejected[0].queuedAt, '2026-09-09T08:00:00Z', 'when it was typed');
  assert.equal(q.rejected[0].rejectedAt, '2026-09-10T02:00:00Z', 'when it lost');
  assert.deepEqual(q.rejected[0].input.scores, { '1-0': 4 }, 'what was typed survives');
});

test('rejecting something absent changes nothing', () => {
  const q = enqueue(emptyQueue, queued('a'));
  assert.deepEqual(reject(q, 'nope', 'x', 'now'), q);
});

test('a rejection is cleared only when someone dismisses it', () => {
  let q = reject(enqueue(emptyQueue, queued('a')), 'a', 'Syazana', 'now');
  q = dismissRejection(q, 'a');
  assert.deepEqual(q.rejected, []);
});

test('failed attempts are counted so a stuck mark is visible', () => {
  let q = enqueue(emptyQueue, queued('a'));
  q = noteAttempt(q, 'a', 'Network request failed');
  q = noteAttempt(q, 'a', 'Network request failed');
  assert.equal(q.pending[0].attempts, 2);
  assert.equal(q.pending[0].lastError, 'Network request failed');
});

test('the database saying no is not retried; not reaching it is', () => {
  // A PostgrestError carries a code: it was reached and refused.
  assert.equal(isRetryable({ code: '42501', message: 'permission denied' }), false);
  assert.equal(isRetryable({ code: '23505' }), false);
  // A fetch failure has no code — the stockroom case.
  assert.equal(isRetryable(new TypeError('Network request failed')), true);
  assert.equal(isRetryable({ message: 'Failed to fetch' }), true);
  assert.equal(isRetryable(undefined), true);
});

test('the queue replays oldest first', () => {
  let q = enqueue(emptyQueue, queued('b', { weekNo: 3 }, '2026-09-09T10:00:00Z'));
  q = enqueue(q, queued('a', { weekNo: 4 }, '2026-09-09T08:00:00Z'));
  assert.deepEqual(drainOrder(q).map((x) => x.id), ['a', 'b']);
});
