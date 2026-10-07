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
  APP_ROLES,
  ROLE_LADDER,
  withHome,
  activeFirst,
  canSetSupervisorTitle,
  deactivateBlocker,
  demotionsFor,
  emailBlocker,
  hiringScope,
  isSqlOnlyRole,
  postingFor,
  newUserBlocker,
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
});

// --- the app moves people up to Manager and no further; the GM is SQL's.
// HR sits on Admin's rung (6 Oct 2026): the two administer together.

test('promotion stops at Manager: nothing above it is offered', () => {
  assert.deepEqual(promotionsFor('area_manager'), ['manager']);
  assert.deepEqual(promotionsFor('manager'), []);
});

test('the General Manager is never a destination', () => {
  for (const from of ['manager', 'admin', 'general_manager', 'human_resources']) {
    for (const to of [...promotionsFor(from), ...demotionsFor(from), ...transfersFor(from)]) {
      assert.ok(!isSqlOnlyRole(to), `${from} -> ${to}`);
    }
  }
  assert.deepEqual(transfersFor('general_manager'), [], 'not even sideways');
  assert.deepEqual([...promotionsFor('general_manager'), ...demotionsFor('general_manager')], [],
    'the GM is not moved out of their role from the app either');
  assert.deepEqual(promotionsFor('manager'), [], 'Manager is not promoted into the admin console');
});

test('Admin and HR move sideways into each other, and nowhere else', () => {
  assert.deepEqual(transfersFor('admin'), ['human_resources']);
  assert.deepEqual(transfersFor('human_resources'), ['admin']);
  for (const held of ['admin', 'human_resources']) {
    assert.deepEqual([...promotionsFor(held), ...demotionsFor(held)], [], held);
  }
});

test('the "Akaun baharu" picker offers every role but the General Manager', () => {
  assert.deepEqual(APP_ROLES, ROLE_LADDER.filter((r) => !isSqlOnlyRole(r)));
  assert.ok(!APP_ROLES.includes('general_manager'));
  assert.ok(APP_ROLES.includes('admin') && APP_ROLES.includes('human_resources'),
    'admin and HR are created in-app');
});

test('a role alone on its rung has nowhere to transfer to', () => {
  assert.deepEqual(transfersFor('manager'), []);
});

// --- only Admin is a required role (7 Oct 2026). An outlet may be left without
// an Area Manager — the Branches tab flags it — so moving, demoting or
// deactivating an Area Manager never needs a replacement in first.

test('an Area Manager may be demoted, deactivated or moved even as the only one at an outlet', () => {
  const users = [mkUser({ id: 'AM0001', role: 'area_manager', branchId: 'DMC' })];
  assert.equal(roleChangeBlocker(users, 'AM0001', 'supervisor'), null);
  assert.equal(deactivateBlocker(users, 'AM0001'), null);
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

test('an inactive Admin does not count as the remaining one', () => {
  const users = [
    mkUser({ id: 'AD0001', role: 'admin', branchId: null }),
    mkUser({ id: 'AD0002', role: 'admin', branchId: null, active: false }),
  ];
  assert.match(deactivateBlocker(users, 'AD0001'), /Admin terakhir/);
});

test('changing to the role you already hold is a no-op, not a block', () => {
  const users = [mkUser({ id: 'AM0001', role: 'area_manager', branchId: 'DMC' })];
  assert.equal(roleChangeBlocker(users, 'AM0001', 'area_manager'), null);
});

test('staff are not a required role', () => {
  const staff = [mkUser({ id: 'KP0001', role: 'staff' })];
  assert.equal(deactivateBlocker(staff, 'KP0001'), null);
});


test('a new account needs a name, a payroll number, and no clash — case-insensitive', () => {
  const existing = [mkUser({ id: 'KP0093' })];
  assert.match(newUserBlocker(existing, '', 'KP0099'), /Nama/);
  assert.match(newUserBlocker(existing, 'Someone', ''), /pekerja/);
  assert.match(newUserBlocker(existing, 'Someone', 'kp0093'), /sudah wujud/);
  assert.equal(newUserBlocker(existing, 'Someone', 'KP0099'), null);
});

// --- who may hire whom, mirroring users_insert_branch_staff in RLS

test('admin hires any role, anywhere', () => {
  assert.deepEqual(hiringScope(mkUser({ id: 'AD0001', role: 'admin', branchId: null })), { kind: 'any' });
});

test('a supervisor hires pekerja kedai at their own outlet only', () => {
  assert.deepEqual(
    hiringScope(mkUser({ id: 'WS0001', role: 'supervisor', branchId: 'DMC' })),
    { kind: 'branch', roles: ['staff'], branchIds: ['DMC'] }
  );
});

test('an Area Manager hires pekerja kedai and SV/AS at every outlet they cover, home posting first', () => {
  assert.deepEqual(
    hiringScope(mkUser({ id: 'AM0001', role: 'area_manager', branchId: 'DMC', branchIds: ['DKB'] })),
    { kind: 'branch', roles: ['staff', 'supervisor'], branchIds: ['DMC', 'DKB'] }
  );
});

test('an unposted supervisor has nowhere to hire into', () => {
  assert.deepEqual(hiringScope(mkUser({ role: 'supervisor', branchId: null })), { kind: 'none' });
});

// --- who may tag an SV/AS sv or asisten, mirroring set_supervisor_title() in RLS

test('admin may tag any SV/AS', () => {
  const admin = mkUser({ id: 'AD0001', role: 'admin', branchId: null });
  const sv = mkUser({ id: 'WS0001', role: 'supervisor', branchId: 'DMC' });
  assert.equal(canSetSupervisorTitle(admin, sv), true);
});

test('an Area Manager may tag an SV/AS only at an outlet they cover', () => {
  const am = mkUser({ id: 'AM0001', role: 'area_manager', branchId: 'DMC', branchIds: ['DKB'] });
  assert.equal(canSetSupervisorTitle(am, mkUser({ id: 'WS0001', role: 'supervisor', branchId: 'DMC' })), true);
  assert.equal(canSetSupervisorTitle(am, mkUser({ id: 'WS0012', role: 'supervisor', branchId: 'DKB' })), true);
  assert.equal(canSetSupervisorTitle(am, mkUser({ id: 'WS0099', role: 'supervisor', branchId: 'BKP' })), false);
});

test('the SV/AS may not tag themselves, and nobody may tag a non-supervisor', () => {
  const sv = mkUser({ id: 'WS0001', role: 'supervisor', branchId: 'DMC' });
  assert.equal(canSetSupervisorTitle(sv, sv), false);
  const admin = mkUser({ id: 'AD0001', role: 'admin', branchId: null });
  assert.equal(canSetSupervisorTitle(admin, mkUser({ id: 'KP0093', role: 'staff', branchId: 'DMC' })), false);
});

test('staff, the stor team, the Manager and the GM do not hire', () => {
  for (const role of ['staff', 'store', 'clerk', 'manager', 'general_manager']) {
    assert.deepEqual(hiringScope(mkUser({ role, branchId: role === 'store' ? 'HQ' : 'DMC' })), { kind: 'none' }, role);
  }
  assert.deepEqual(hiringScope(undefined), { kind: 'none' });
});

test('HR hires anyone, anywhere, as admin does', () => {
  for (const role of ['admin', 'human_resources']) {
    assert.deepEqual(hiringScope(mkUser({ role, branchId: null })), { kind: 'any' }, role);
  }
  const hr = mkUser({ id: 'HR0001', role: 'human_resources', branchId: null });
  assert.equal(canSetSupervisorTitle(hr, mkUser({ id: 'WS0001', role: 'supervisor', branchId: 'DMC' })), true);
});

// --- where a new account is posted, from what was picked on the form

test('head office holds no branch, whatever was picked', () => {
  for (const role of ['manager', 'general_manager', 'human_resources', 'admin']) {
    assert.deepEqual(postingFor(role, ['DMC', 'DKB']), { branchId: null, extraBranchIds: [] }, role);
  }
});

test('an Area Manager is posted to the first outlet and covers the rest', () => {
  assert.deepEqual(postingFor('area_manager', ['DMC', 'DKB', 'DPM']), {
    branchId: 'DMC',
    extraBranchIds: ['DKB', 'DPM'],
  });
  assert.deepEqual(postingFor('area_manager', ['DKB']), { branchId: 'DKB', extraBranchIds: [] });
});

test('every other role gets exactly one outlet, extras dropped', () => {
  assert.deepEqual(postingFor('staff', ['DMC', 'DKB']), { branchId: 'DMC', extraBranchIds: [] });
  assert.deepEqual(postingFor('supervisor', ['DKB']), { branchId: 'DKB', extraBranchIds: [] });
});

test('nothing picked is a null posting, not a crash', () => {
  assert.deepEqual(postingFor('staff', []), { branchId: null, extraBranchIds: [] });
  assert.deepEqual(postingFor('area_manager', []), { branchId: null, extraBranchIds: [] });
});

// --- the e-mail on a directory row is optional, but must be an address when given

test('an e-mail is optional, but has to look like one', () => {
  assert.equal(emailBlocker(''), null);
  assert.equal(emailBlocker('   '), null);
  assert.equal(emailBlocker('nama@contoh.com'), null);
  assert.match(emailBlocker('nama'), /E-mel/);
  assert.match(emailBlocker('nama@contoh'), /E-mel/);
  assert.match(emailBlocker('nama contoh@x.com'), /E-mel/);
});

// --- an Area Manager's home outlet is chosen directly (6–7 Oct 2026): a covered
// outlet swaps to home, any other outlet replaces the old home in one step.

test('picking a covered outlet as home swaps it to the front, keeping every outlet', () => {
  assert.deepEqual(withHome(['DMC', 'DKB', 'DPM'], 'DPM'), ['DPM', 'DMC', 'DKB']);
});

test('picking an outlet not yet covered replaces the old home and keeps the extras', () => {
  assert.deepEqual(withHome(['DMC', 'DKB'], 'DPM'), ['DPM', 'DKB']);
  assert.deepEqual(withHome(['DMC'], 'DKB'), ['DKB'], 'a one-outlet Area Manager simply moves');
});

test('the deactivated are listed after everyone active, each keeping its own order', () => {
  const list = [
    mkUser({ id: 'KP0001', active: true }),
    mkUser({ id: 'KP0002', active: false }),
    mkUser({ id: 'KP0003', active: true }),
    mkUser({ id: 'KP0004', active: false }),
  ];
  assert.deepEqual(activeFirst(list).map((u) => u.id), ['KP0001', 'KP0003', 'KP0002', 'KP0004']);
  assert.deepEqual(list.map((u) => u.id), ['KP0001', 'KP0002', 'KP0003', 'KP0004'], 'the list given is left as it was');
});
