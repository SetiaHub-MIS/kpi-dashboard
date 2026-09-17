import { FunctionsHttpError } from '@supabase/supabase-js';
import { Role } from '@/data/users';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * Sign-in, keyed on the payroll number.
 *
 * Staff know their payroll number — KP0093 is printed on everything they
 * handle — and many have no work email. Supabase Auth wants an email, so one
 * is synthesised from the number against a domain that never receives mail.
 * Since 20260917 a person with a real address in the directory signs in
 * under that instead — which is what makes "forgot password" possible — and
 * the payroll-auth Edge Function decides which, so no address is ever shown
 * to, or guessable from, the phone. The number stays the identity.
 *
 * `users.auth_user_id` is what actually links the login to the directory row,
 * so the address could change tomorrow without touching a single mark.
 */
export const AUTH_EMAIL_DOMAIN =
  process.env.EXPO_PUBLIC_AUTH_EMAIL_DOMAIN ?? 'checklist.local';

const WRONG_CREDENTIALS = 'Nombor pekerja atau kata laluan salah.';

export const emailForPayroll = (id: string) =>
  `${id.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;

/** The staff row behind a login, in the shape the app's stores use. */
export type SignedInStaff = {
  id: string;
  name: string;
  short: string;
  init: string;
  role: Role;
  branchId: string | null;
};

export type SignInResult =
  | { ok: true; staff: SignedInStaff }
  | { ok: false; message: string };

const PAYROLL = /^[A-Z]{2}\d{4}$/;

/** Why this cannot be a payroll number, or null when it might be one. */
export function payrollBlocker(id: string): string | null {
  const v = id.trim().toUpperCase();
  if (!v) return 'Masukkan nombor pekerja.';
  if (!PAYROLL.test(v)) return 'Nombor pekerja seperti KP0093 atau WS0001.';
  return null;
}

/**
 * Signs in, then reads back the directory row the account is linked to.
 *
 * A login with no `auth_user_id` pointing at it is a real state — an account
 * created before it was attached to anybody — and it fails here rather than
 * dropping the person into an app that cannot say who they are.
 */
export async function signInWithPayroll(
  payrollId: string,
  password: string
): Promise<SignInResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase belum dikonfigurasi.' };
  }

  const id = payrollId.trim().toUpperCase();
  const blocked = payrollBlocker(id);
  if (blocked) return { ok: false, message: blocked };
  if (!password) return { ok: false, message: 'Masukkan kata laluan.' };

  const failed = await establishSession(id, password);
  if (failed) return { ok: false, message: failed };

  const staff = await fetchSignedInStaff();
  if (!staff) {
    await supabase.auth.signOut();
    return {
      ok: false,
      message: 'Akaun ini belum dipadankan dengan rekod pekerja. Hubungi admin.',
    };
  }

  return { ok: true, staff };
}

/**
 * Turns a payroll number and password into a session. Returns the message to
 * show on failure, or null once the session is in place.
 *
 * The Edge Function resolves the login address; the phone never learns it.
 * If the function is unreachable — not deployed yet, or the network dropped
 * between the phone and it — the old direct route under the synthetic
 * address is tried, so nobody without a real e-mail is locked out by a
 * deploy that has not happened.
 */
async function establishSession(id: string, password: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('payroll-auth', {
    body: { action: 'sign-in', payrollId: id, password },
  });

  if (!error && data?.access_token && data?.refresh_token) {
    const { error: sessionErr } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    return sessionErr ? sessionErr.message : null;
  }

  if (error instanceof FunctionsHttpError) {
    const status: number = error.context?.status ?? 0;
    if (status === 401) return WRONG_CREDENTIALS;
    if (status === 400) {
      const body = await error.context.json().catch(() => null);
      if (body?.error === 'invalid_payroll') return 'Nombor pekerja seperti KP0093 atau WS0001.';
    }
    // Any other status — including the 404 of a function not deployed yet —
    // falls through to the direct route.
  }

  const { error: directErr } = await supabase.auth.signInWithPassword({
    email: emailForPayroll(id),
    password,
  });
  if (!directErr) return null;
  // Supabase does not distinguish a wrong password from an unknown account,
  // and neither should the message — saying which would confirm who exists.
  return /invalid login credentials/i.test(directErr.message) ? WRONG_CREDENTIALS : directErr.message;
}

/**
 * Sets a new password on the current session. Forgotten passwords are
 * admin's to reset (supabase/reset_password.sql); the app only ever changes
 * the password of whoever is signed in.
 */
export async function updatePassword(password: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { error } = await supabase.auth.updateUser({ password });
  return error ? error.message : null;
}

/**
 * The directory row for whoever is signed in, or null. RLS lets any signed-in
 * account read its own row, so this needs no elevated access.
 */
export async function fetchSignedInStaff(): Promise<SignedInStaff | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, name, short_name, initials, role, branch_id')
    .eq('auth_user_id', auth.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    short: data.short_name,
    init: data.initials,
    role: data.role as Role,
    branchId: data.branch_id,
  };
}

export async function signOutOfSupabase(): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.auth.signOut();
}
