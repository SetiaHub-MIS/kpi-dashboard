/**
 * Which signed-in role may open which screen. The guard in app/_layout.tsx
 * sends anyone else back to their own home; these pin down the rule it asks.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HOME_ROUTE, mayOpen } from '../src/data/routes.ts';

test('staff and SV/AS cannot open the manager pages, Tugasan included', () => {
  for (const role of ['staff', 'supervisor', 'store', 'clerk']) {
    for (const path of ['/manager', '/manager/tugasan', '/manager/sv', '/manager/assets', '/manager/gaps']) {
      assert.equal(mayOpen(role, path), false, `${role} → ${path}`);
    }
  }
});

test('the Area Manager and the Manager can, and admin can open anything', () => {
  for (const role of ['area_manager', 'manager', 'admin']) {
    assert.equal(mayOpen(role, '/manager/tugasan'), true, role);
  }
  for (const path of ['/staff', '/supervisor/peringatan', '/pulangan/saya', '/admin/peranan']) {
    assert.equal(mayOpen('admin', path), true, path);
  }
});

test('every other section belongs to its own roles too', () => {
  assert.equal(mayOpen('staff', '/admin'), false);
  assert.equal(mayOpen('supervisor', '/admin/cawangan'), false);
  assert.equal(mayOpen('area_manager', '/admin'), false);
  assert.equal(mayOpen('staff', '/supervisor'), false);
  assert.equal(mayOpen('supervisor', '/staff/profil'), false);
  assert.equal(mayOpen('area_manager', '/pulangan'), false);
  assert.equal(mayOpen('store', '/pulangan/saya'), true);
  assert.equal(mayOpen('clerk', '/pulangan/selesai'), true);
});

test('shared screens stay open: RLS scopes what they show', () => {
  for (const path of ['/', '/akaun', '/reset-password', '/person/KP0093', '/mark/KP0093', '/week/1', '/bil/12']) {
    assert.equal(mayOpen('staff', path), true, path);
  }
  // A section is a whole first segment, not a prefix of one.
  assert.equal(mayOpen('area_manager', '/pulangan-recon'), true);
});

test('the GM is turned away from the sections, back to sign-in', () => {
  assert.equal(mayOpen('general_manager', '/manager/tugasan'), false);
  assert.equal(mayOpen('general_manager', '/admin'), false);
  assert.equal(HOME_ROUTE.general_manager, '/');
});

test('HR works the admin console and nothing else', () => {
  assert.equal(HOME_ROUTE.human_resources, '/admin');
  assert.equal(mayOpen('human_resources', '/admin/cawangan'), true);
  for (const path of ['/manager', '/supervisor', '/staff', '/pulangan']) {
    assert.equal(mayOpen('human_resources', path), false, path);
  }
});

test('every role may open its own home, so the redirect can never loop', () => {
  for (const [role, home] of Object.entries(HOME_ROUTE)) {
    assert.equal(mayOpen(role, home), true, `${role} → ${home}`);
  }
});
