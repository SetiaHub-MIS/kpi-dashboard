/**
 * The role ladder: promotion/demotion/transfer adjacency, and the guard that
 * refuses to strip a branch (or the company) of its last Area Manager or
 * admin. Sprint 5's "role ladder" test-suite story.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  branchChangeBlocker,
  deactivateBlocker,
  demotionsFor,
  newUserBlocker,
  nextIdFor,
  promotionsFor,
  roleChangeBlocker,
  transfersFor,
} from '../src/data/users.ts';

const mkUser = (overrides) => ({
  id: 'KP0001',
  name: 'Test Person',
  short: 'Test',
  init: 'TP',
  role: 'staff',
  branchId: 'DMC',
  active: true,
  w: [null, null, null, null],
  perkara: [0, 0, 0, 0, 0, 0, 0],
  ...overrides,
});

test('promotion is exactly one rung up, whichever peer role you start on', () => {
  assert.deepEqual(promotionsFor('staff'), ['supervisor']);
  assert.deepEqual(promotionsFor('store'), ['supervisor']);
  assert.deepEqual(promotionsFor('supervisor'), ['area_manager']);
});

test('demotion from supervisor can land on kedai or stor — it is not a straight line', () => {
  assert.deepEqual(demotionsFor('supervisor'), ['staff', 'store', 'clerk']);
});

test('a transfer is sideways: same rung, never yourself', () => {
  assert.deepEqual(transfersFor('staff'), ['store', 'clerk']);
  assert.deepEqual(transfersFor('general_manager'), ['human_resources']);
});

test('a role alone on its rung has nowhere to transfer to', () => {
  assert.deepEqual(transfersFor('manager'), []);
  assert.deepEqual(transfersFor('admin'), []);
});

test('demoting the only Area Manager at a branch is refused', () => {
  const users = [mkUser({ id: 'AM0001', role: 'area_manager', branchId: 'DMC' })];
  const blocked = roleChangeBlocker(users, 'AM0001', 'supervisor');
  assert.match(blocked, /Area Manager DMC terakhir/);
});

test('...but is fine once a second Area Manager covers the same branch', () => {
  const users = [
    mkUser({ id: 'AM0001', role: 'area_manager', branchId: 'DMC' }),
    mkUser({ id: 'AM0002', role: 'area_manager', branchId: 'DMC' }),
  ];
  assert.equal(roleChangeBlocker(users, 'AM0001', 'supervisor'), null);
});

test('an Area Manager elsewhere does not cover for this branch losing its only one', () => {
  const users = [
    mkUser({ id: 'AM0001', role: 'area_manager', branchId: 'DMC' }),
    mkUser({ id: 'AM0002', role: 'area_manager', branchId: 'DKB' }),
  ];
  assert.match(roleChangeBlocker(users, 'AM0001', 'supervisor'), /terakhir/);
});

test('admin is counted company-wide, not per branch', () => {
  const solo = [mkUser({ id: 'AD0001', role: 'admin', branchId: null })];
  assert.match(roleChangeBlocker(solo, 'AD0001', 'human_resources'), /Admin terakhir/);

  const pair = [
    mkUser({ id: 'AD0001', role: 'admin', branchId: null }),
    mkUser({ id: 'AD0002', role: 'admin', branchId: null }),
  ];
  assert.equal(roleChangeBlocker(pair, 'AD0001', 'human_resources'), null);
});

test('an inactive holder of the same role does not count as coverage', () => {
  const users = [
    mkUser({ id: 'AM0001', role: 'area_manager', branchId: 'DMC' }),
    mkUser({ id: 'AM0002', role: 'area_manager', branchId: 'DMC', active: false }),
  ];
  assert.match(roleChangeBlocker(users, 'AM0001', 'supervisor'), /terakhir/);
});

test('changing to the role you already hold is a no-op, not a block', () => {
  const users = [mkUser({ id: 'AM0001', role: 'area_manager', branchId: 'DMC' })];
  assert.equal(roleChangeBlocker(users, 'AM0001', 'area_manager'), null);
});

test('the same guard governs deactivating and transferring branches', () => {
  const users = [mkUser({ id: 'AM0001', role: 'area_manager', branchId: 'DMC' })];
  assert.match(deactivateBlocker(users, 'AM0001'), /terakhir/);
  assert.match(branchChangeBlocker(users, 'AM0001', 'DKB'), /terakhir/);

  const staff = [mkUser({ id: 'KP0001', role: 'staff' })];
  assert.equal(deactivateBlocker(staff, 'KP0001'), null, 'staff are not a required role');
});

test('a new account needs a name, a payroll number, and no clash — case-insensitive', () => {
  const existing = [mkUser({ id: 'KP0093' })];
  assert.match(newUserBlocker(existing, '', 'KP0099'), /Nama/);
  assert.match(newUserBlocker(existing, 'Someone', ''), /pekerja/);
  assert.match(newUserBlocker(existing, 'Someone', 'kp0093'), /sudah wujud/);
  assert.equal(newUserBlocker(existing, 'Someone', 'KP0099'), null);
});

test('the next free ID is one past the highest in that role\'s own series', () => {
  const users = [
    mkUser({ id: 'KP0093', role: 'staff' }),
    mkUser({ id: 'KP0111', role: 'staff' }),
    mkUser({ id: 'WS0001', role: 'supervisor' }),
  ];
  assert.equal(nextIdFor(users, 'staff'), 'KP0112');
  assert.equal(nextIdFor(users, 'supervisor'), 'WS0002');
  assert.equal(nextIdFor(users, 'admin'), 'AD0001', 'an empty series starts at 1');
});
