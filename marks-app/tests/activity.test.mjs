/**
 * The "working on it" indicator: what each request to the server counts as,
 * and how the count behaves. components/ActivityBar.tsx shows it.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MIN_VISIBLE_MS, SHOW_AFTER_MS, activityKind, errorDetail, requestKind } from '../src/data/activity.ts';
import { useActivity } from '../src/store/useActivity.ts';

const API = 'https://aorkigafuepkexymexjt.supabase.co';

test('reads say loading: table reads, sign-in, the Edge Functions, a photo link', () => {
  assert.equal(requestKind('GET', `${API}/rest/v1/marks?select=*`), 'load');
  assert.equal(requestKind(undefined, `${API}/rest/v1/users`), 'load');
  assert.equal(requestKind('HEAD', `${API}/rest/v1/marks`), 'load');
  assert.equal(requestKind('POST', `${API}/auth/v1/token?grant_type=password`), 'load');
  assert.equal(requestKind('POST', `${API}/functions/v1/payroll-auth`), 'load');
  assert.equal(requestKind('POST', `${API}/functions/v1/xlsx-export`), 'load');
  assert.equal(requestKind('POST', `${API}/storage/v1/object/sign/return-photos/a.jpg`), 'load');
});

test('writes say saving: table writes, the set_* RPCs, photo uploads and deletes', () => {
  assert.equal(requestKind('POST', `${API}/rest/v1/asset_issues`), 'save');
  assert.equal(requestKind('patch', `${API}/rest/v1/asset_issues?id=eq.4`), 'save');
  assert.equal(requestKind('DELETE', `${API}/rest/v1/user_branches?user_id=eq.KP0093`), 'save');
  assert.equal(requestKind('POST', `${API}/rest/v1/rpc/set_my_email`), 'save');
  assert.equal(requestKind('POST', `${API}/storage/v1/object/return-photos/a.jpg`), 'save');
  assert.equal(requestKind('DELETE', `${API}/storage/v1/object/return-photos`), 'save');
});

test('a save in flight outranks a load; nothing in flight shows nothing', () => {
  assert.equal(activityKind(0, 0), null);
  assert.equal(activityKind(2, 0), 'load');
  assert.equal(activityKind(0, 1), 'save');
  assert.equal(activityKind(3, 1), 'save');
});

test('every request is counted in and out once, even if its end is called twice', () => {
  const s = useActivity.getState();
  const a = s.begin('load');
  const b = s.begin('load');
  const c = s.begin('save');
  assert.deepEqual(pick(), { loads: 2, saves: 1 });
  a();
  a();
  assert.deepEqual(pick(), { loads: 1, saves: 1 });
  b();
  c();
  assert.deepEqual(pick(), { loads: 0, saves: 0 });
});

test('quick requests do not flash it; once up it stays long enough to read', () => {
  assert.ok(SHOW_AFTER_MS > 0 && SHOW_AFTER_MS <= 500);
  assert.ok(MIN_VISIBLE_MS >= SHOW_AFTER_MS);
});

function pick() {
  const { loads, saves } = useActivity.getState();
  return { loads, saves };
}

test('a failure reads as the database code and its words, or the error message, cut short', () => {
  assert.equal(errorDetail({ code: '57014', message: 'canceling statement due to statement timeout' }),
    '57014 canceling statement due to statement timeout');
  assert.equal(errorDetail(new TypeError('Failed to fetch')), 'Failed to fetch');
  assert.equal(errorDetail(new Error('marks: 42501 permission denied')), 'marks: 42501 permission denied');
  assert.equal(errorDetail('plain'), 'plain');
  assert.equal(errorDetail('x'.repeat(300)).length, 180);
});
