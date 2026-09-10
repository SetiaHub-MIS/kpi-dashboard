/**
 * Branch scoping, mirrored client-side from the RLS policies. Sprint 5's
 * "branch scoping" test-suite story — same rules `app_can_see_branch()` and
 * `app_can_see_mark()` enforce in Postgres, exercised here as plain
 * functions so a scoping bug shows up without a database.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  branchesOf,
  canSeeBranch,
  isCentralStore,
  isCrossBranch,
  marksRoles,
  seesReturns,
  seesStoreOps,
} from '../src/data/users.ts';

const mkUser = (overrides) => ({
  id: 'U0001',
  name: 'Test',
  short: 'Test',
  init: 'TT',
  role: 'staff',
  branchId: 'DMC',
  active: true,
  w: [null, null, null, null],
  perkara: [],
  ...overrides,
});

test('a branch-posted role sees only its own branch', () => {
  const user = mkUser({ role: 'supervisor', branchId: 'DMC' });
  assert.equal(canSeeBranch(user, 'DMC'), true);
  assert.equal(canSeeBranch(user, 'DKB'), false);
});

test('the four cross-branch roles see every branch, including one they hold no posting to', () => {
  for (const role of ['manager', 'general_manager', 'human_resources', 'admin']) {
    const user = mkUser({ role, branchId: null });
    assert.equal(canSeeBranch(user, 'DMC'), true, role);
    assert.equal(canSeeBranch(user, 'DKB'), true, role);
  }
});

test('an Area Manager sees their home branch plus whatever user_branches adds, and no other', () => {
  const user = mkUser({ role: 'area_manager', branchId: 'DMC', branchIds: ['DKB'] });
  assert.deepEqual(branchesOf(user), ['DMC', 'DKB']);
  assert.equal(canSeeBranch(user, 'DMC'), true);
  assert.equal(canSeeBranch(user, 'DKB'), true);
  assert.equal(canSeeBranch(user, 'HQ'), false);
});

test('no signed-in user reaches nothing — canSeeBranch is false for undefined, not a throw', () => {
  assert.equal(canSeeBranch(undefined, 'DMC'), false);
});

test('a null branchId query is unreachable to anyone but a cross-branch role', () => {
  const staff = mkUser({ role: 'staff', branchId: 'DMC' });
  assert.equal(canSeeBranch(staff, null), false);
  const admin = mkUser({ role: 'admin', branchId: null });
  assert.equal(canSeeBranch(admin, null), true);
});

test('the cross-branch manager is the one role shut out of the stor side', () => {
  assert.equal(seesStoreOps('manager'), false);
  for (const role of ['staff', 'store', 'clerk', 'supervisor', 'area_manager', 'general_manager', 'human_resources', 'admin']) {
    assert.equal(seesStoreOps(role), true, role);
  }
});

test('returns are closed to the cross-branch manager and to admin alike', () => {
  assert.equal(seesReturns('manager'), false);
  assert.equal(seesReturns('admin'), false);
  assert.equal(seesReturns('human_resources'), true);
});

test('pekerja stor and kerani stor are the HQ central-store team', () => {
  assert.equal(isCentralStore('store'), true);
  assert.equal(isCentralStore('clerk'), true);
  assert.equal(isCentralStore('staff'), false);
});

test('isCrossBranch names exactly the four head-office roles, not area_manager', () => {
  assert.equal(isCrossBranch('area_manager'), false, 'an Area Manager still has a home branch');
  for (const role of ['manager', 'general_manager', 'human_resources', 'admin']) {
    assert.equal(isCrossBranch(role), true, role);
  }
});

test('marking is a relation: supervisor marks staff and store, Area Manager marks supervisor', () => {
  assert.deepEqual(marksRoles('supervisor').sort(), ['staff', 'store'].sort());
  assert.deepEqual(marksRoles('area_manager'), ['supervisor']);
});

test('a role nobody marks under returns an empty queue, not undefined behaviour', () => {
  assert.deepEqual(marksRoles('staff'), []);
  assert.deepEqual(marksRoles(undefined), []);
});
