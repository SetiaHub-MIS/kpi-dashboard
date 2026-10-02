/**
 * The session limits: fifteen minutes idle, three hours from signing in. The
 * guard in src/lib/sessionGuard.ts asks this rule; these pin it down.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { IDLE_LIMIT_MS, MAX_SESSION_MS, mergeStamps, sessionEnd } from '../src/data/sessionLimits.ts';

const MIN = 60 * 1000;
const T0 = Date.UTC(2026, 9, 3, 1, 0); // 9am in Malaysia

test('the limits are fifteen minutes and three hours', () => {
  assert.equal(IDLE_LIMIT_MS, 15 * MIN);
  assert.equal(MAX_SESSION_MS, 180 * MIN);
});

test('a session in use is left alone', () => {
  assert.equal(sessionEnd({ signedInAt: T0, lastActiveAt: T0 + 60 * MIN }, T0 + 70 * MIN), null);
});

test('fifteen minutes without activity ends it, fourteen does not', () => {
  const s = { signedInAt: T0, lastActiveAt: T0 + 30 * MIN };
  assert.equal(sessionEnd(s, T0 + 44 * MIN), null);
  assert.equal(sessionEnd(s, T0 + 45 * MIN), 'idle');
});

test('three hours from signing in ends it, however recent the last tap', () => {
  const s = { signedInAt: T0, lastActiveAt: T0 + 179 * MIN };
  assert.equal(sessionEnd(s, T0 + 179 * MIN), null);
  assert.equal(sessionEnd(s, T0 + 180 * MIN), 'max');
});

test('when both are past, the three hours are what it says', () => {
  assert.equal(sessionEnd({ signedInAt: T0, lastActiveAt: T0 }, T0 + 200 * MIN), 'max');
});

test('a session with no record of its start ends: signed in before the limits, or the record lost', () => {
  assert.equal(sessionEnd(null, T0), 'expired');
});

test('a clock turned back past when the session began is not trusted', () => {
  const s = { signedInAt: T0, lastActiveAt: T0 };
  assert.equal(sessionEnd(s, T0 - 2 * MIN), null, 'a small correction is tolerated');
  assert.equal(sessionEnd(s, T0 - 60 * MIN), 'expired');
});

test('two records of a session read as the later sign-in and the later activity', () => {
  const memory = { signedInAt: T0, lastActiveAt: T0 + 20 * MIN };
  const stored = { signedInAt: T0, lastActiveAt: T0 + 10 * MIN };
  assert.deepEqual(mergeStamps(memory, stored), memory);
  assert.deepEqual(mergeStamps(null, stored), stored);
  assert.deepEqual(mergeStamps(memory, null), memory);
  assert.equal(mergeStamps(null, null), null);
});
