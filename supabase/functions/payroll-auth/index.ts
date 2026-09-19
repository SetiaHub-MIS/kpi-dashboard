// Payroll-number sign-in and password reset.
//
// Staff sign in with the number printed on their payslip. Supabase Auth only
// knows addresses, and since 20260917 a person's login address is their real
// e-mail when the directory has one, or kp0093@checklist.local when it does
// not. Which of the two it is cannot be known from the phone — that would
// mean handing out e-mail addresses to anyone who can type a payroll number
// — so the lookup happens here, under the service role, and the address
// never leaves this function.
//
//   { action: 'sign-in',       payrollId, password }   -> { access_token, refresh_token }
//   { action: 'request-reset', payrollId, redirectTo } -> { ok: true }
//
// 'request-reset' answers { ok: true } whether or not the account exists or
// has an address: the reply must not say who is on the payroll. Supabase
// itself sends the mail, to the login address, which is why the trigger in
// 20260917010000_user_email.sql keeps that address current.
//
// Deploy from the repository root, once linked to the project:
//   npx supabase functions deploy payroll-auth
//
// @ts-nocheck — this file runs on Deno (the Supabase Edge Runtime), not
// Node/React Native, so it is outside the app's tsconfig and its `npm:`/`Deno`
// globals are unresolved by the editor's TypeScript service.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_DOMAIN = Deno.env.get('AUTH_EMAIL_DOMAIN') ?? 'checklist.local';
// Letters and digits, any length payroll uses; the table holds the same rule.
const PAYROLL = /^[A-Z0-9]{2,12}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const payrollId = String(body.payrollId ?? '').trim().toUpperCase();
  if (!PAYROLL.test(payrollId)) return json({ error: 'invalid_payroll' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
  // Service role: reads the directory past RLS. Never used to sign anyone in.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, noSession);
  // Anon: the same client a phone would use, so the sign-in is an ordinary one.
  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, noSession);

  const { data: row, error: lookupError } = await admin
    .from('users')
    .select('email, auth_user_id, active')
    .eq('id', payrollId)
    .maybeSingle();
  // A failed read is not "no such person": it means the service role could
  // not see the directory at all, and every account would quietly fall back
  // to its synthetic address. Logged so it can be told apart; never returned.
  if (lookupError) {
    console.error(`lookup ${payrollId}: ${lookupError.code ?? '-'} ${lookupError.message}`);
  }

  const loginEmail = row?.email
    ? String(row.email).toLowerCase()
    : `${payrollId.toLowerCase()}@${EMAIL_DOMAIN}`;

  if (body.action === 'sign-in') {
    const password = String(body.password ?? '');
    if (!password) return json({ error: 'invalid_credentials' }, 401);

    const { data, error } = await anon.auth.signInWithPassword({ email: loginEmail, password });
    // One answer for a wrong password, an unknown number and an unlinked
    // account alike — saying which would confirm who exists.
    if (error || !data.session) return json({ error: 'invalid_credentials' }, 401);

    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  if (body.action === 'request-reset') {
    if (row?.email && row.auth_user_id && row.active) {
      const redirectTo = typeof body.redirectTo === 'string' ? body.redirectTo : undefined;
      // Supabase refuses a redirect that is not on the project's allow-list,
      // so this cannot be turned into an open redirect from the request body.
      const { error } = await anon.auth.resetPasswordForEmail(
        loginEmail,
        redirectTo ? { redirectTo } : undefined,
      );
      // The phone hears nothing either way, so this line is the only record
      // of a send that Supabase refused — an address its mailer will not
      // deliver to, a rate limit. Dashboard → Edge Functions → payroll-auth
      // → Logs. The payroll number is logged, the address is not.
      if (error) {
        console.error(`request-reset ${payrollId}: ${error.status ?? '-'} ${error.code ?? '-'} ${error.message}`);
      }
    }
    return json({ ok: true });
  }

  return json({ error: 'unknown_action' }, 400);
});
