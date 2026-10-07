/**
 * The Manager and Area Manager load marks one outlet at a time (7 Oct 2026):
 * which roles, which outlet first, which outlets the dropdown offers.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { defaultMarksOutlet, marksOutletsFor, scopesMarksByOutlet } from '../src/data/marksScope.ts';

const user = (role, branchId, branchIds) => ({
  id: 'X', name: 'X', short: 'X', init: 'X', role, branchId, ...(branchIds ? { branchIds } : {}),
  active: true, w: [null, null, null, null], perkara: [],
});

test('only the Manager and the Area Manager load marks one outlet at a time', () => {
  for (const role of ['manager', 'area_manager']) assert.equal(scopesMarksByOutlet(role), true, role);
  for (const role of ['staff', 'store', 'clerk', 'supervisor', 'general_manager', 'human_resources', 'admin']) {
    assert.equal(scopesMarksByOutlet(role), false, role);
  }
});

test('an Area Manager starts on their home outlet; the Manager starts on none and picks', () => {
  assert.equal(defaultMarksOutlet('area_manager', 'DMC'), 'DMC');
  assert.equal(defaultMarksOutlet('manager', null), null);
});

test('the dropdown offers every outlet to the Manager, the covered ones to an Area Manager', () => {
  const all = ['DMC', 'DKB', 'DPM'];
  assert.deepEqual(marksOutletsFor(user('manager', null), all), all);
  assert.deepEqual(marksOutletsFor(user('area_manager', 'DMC', ['DKB']), all), ['DMC', 'DKB']);
  assert.deepEqual(marksOutletsFor(user('supervisor', 'DMC'), all), []);
  assert.deepEqual(marksOutletsFor(undefined, all), []);
});
