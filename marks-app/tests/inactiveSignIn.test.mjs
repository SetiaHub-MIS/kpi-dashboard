/**
 * A deactivated account is refused at sign-in with a reason, and signed back
 * out: its password still opens a session, which every policy then reads as
 * nobody, so letting it in would only show an empty app.
 *
 *   node --test tests/
 */
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('./fixtures/stub-auth-resolve.mjs', import.meta.url);
const { signInWithPayroll, fetchSignedInStaff, InactiveAccountError, INACTIVE_ACCOUNT } = await import('../src/lib/auth.ts');
const { fake } = await import('./fixtures/stub-supabase-auth.ts');

const row = (active) => ({
  id: 'KP0093', name: 'Syazana Izzah Zafirah', short_name: 'Syazana', initials: 'SI',
  role: 'staff', branch_id: 'DMC', active,
});

test('an active account signs in', async () => {
  fake.row = row(true);
  fake.signedOut = 0;
  const result = await signInWithPayroll('kp0093', 'secret');
  assert.equal(result.ok, true);
  assert.equal(result.staff.id, 'KP0093');
  assert.equal(fake.signedOut, 0);
});

test('a deactivated account is refused, told why, and signed back out', async () => {
  fake.row = row(false);
  fake.signedOut = 0;
  const result = await signInWithPayroll('KP0093', 'secret');
  assert.deepEqual(result, { ok: false, message: INACTIVE_ACCOUNT });
  assert.equal(fake.signedOut, 1);
});

test('a session kept on the phone from before the deactivation is not resumed', async () => {
  fake.row = row(false);
  fake.signedOut = 0;
  await assert.rejects(fetchSignedInStaff(), InactiveAccountError);
  assert.equal(fake.signedOut, 1);
});
