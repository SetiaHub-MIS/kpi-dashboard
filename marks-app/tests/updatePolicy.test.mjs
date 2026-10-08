/**
 * When an app update downloaded over the air is put to use. lib/appUpdates.ts
 * asks this rule; these pin it down.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RECHECK_AFTER_MS, publishedLabel, runningCode, shouldRecheck, updateStep } from '../src/data/updatePolicy.ts';

const MIN = 60 * 1000;
const T0 = Date.UTC(2026, 9, 4, 1, 0);

test('nothing downloaded: nothing to do, signed in or not', () => {
  assert.equal(updateStep({ downloaded: false, signedIn: false }), 'wait');
  assert.equal(updateStep({ downloaded: false, signedIn: true }), 'wait');
});

test('downloaded with nobody signed in: restart at once — nothing on screen to lose', () => {
  assert.equal(updateStep({ downloaded: true, signedIn: false }), 'restart');
});

test('downloaded while someone is signed in: offered, never forced on a half-filled form', () => {
  assert.equal(updateStep({ downloaded: true, signedIn: true }), 'offer');
});

test('coming back to the front checks again after ten minutes, not before', () => {
  assert.equal(RECHECK_AFTER_MS, 10 * MIN);
  assert.equal(shouldRecheck(T0, T0 + 9 * MIN), false);
  assert.equal(shouldRecheck(T0, T0 + 10 * MIN), true);
  assert.equal(shouldRecheck(T0, T0 + 3 * 60 * MIN), true);
});

test('a clock set back does not stop the checks', () => {
  assert.equal(shouldRecheck(T0, T0 - 5 * MIN), true);
});

test('the account screen names the code running: web, development, built-in or an update', () => {
  const base = { web: false, enabled: true, embedded: false, updateId: null, createdAt: null };
  assert.deepEqual(runningCode({ ...base, web: true, updateId: 'x' }), { kind: 'web' });
  assert.deepEqual(runningCode({ ...base, enabled: false }), { kind: 'dev' });
  assert.deepEqual(runningCode({ ...base, embedded: true, updateId: '01a11932-b6dd' }), { kind: 'builtin' });
  assert.deepEqual(runningCode(base), { kind: 'builtin' });

  const at = new Date(2026, 9, 8, 9, 48);
  assert.deepEqual(runningCode({ ...base, updateId: '01a11932-b6dd-7f39-a797-73cd5d100429', createdAt: at }), {
    kind: 'update',
    id: '01a11932',
    publishedAt: at,
  });
});

test('the update time reads day/month/year and a 24-hour clock', () => {
  assert.equal(publishedLabel(new Date(2026, 9, 8, 9, 48)), '8/10/2026 09:48');
  assert.equal(publishedLabel(new Date(2026, 0, 31, 17, 5)), '31/1/2026 17:05');
});
