-- Issue a login for every staff row that has none, and link the two.
--
-- Sign-in is keyed on the payroll number: the app turns KP0093 into
-- kp0093@checklist.local and sends that to Supabase Auth. The address is
-- plumbing and is never shown; users.auth_user_id is the real link, which is
-- why a mark's history survives any change to it.
--
-- Run in the Supabase SQL editor. It is idempotent — anyone who already has an
-- account is skipped — so re-run it after adding staff.
--
--   1. Set the two settings below.
--   2. Run.
--   3. Tell people their password and have them change it.
--
-- The starting password is the same for everyone, which is only acceptable
-- because nobody has real data in front of them yet. Change it before pilot,
-- and make first-login password change part of handing the app over.

\set ON_ERROR_STOP on

DO $$
DECLARE
  email_domain   text := 'checklist.local';
  start_password text := 'Checklist2026!';
  staff          record;
  new_uid        uuid;
  made           int := 0;
BEGIN
  FOR staff IN
    SELECT id FROM users WHERE active AND auth_user_id IS NULL ORDER BY id
  LOOP
    new_uid := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_uid,
      'authenticated',
      'authenticated',
      lower(staff.id) || '@' || email_domain,
      crypt(start_password, gen_salt('bf')),
      -- Confirmed on creation: these addresses receive no mail, so a
      -- confirmation link would never arrive.
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('payroll_id', staff.id),
      now(), now()
    );

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      new_uid, new_uid,
      jsonb_build_object('sub', new_uid::text,
                         'email', lower(staff.id) || '@' || email_domain,
                         'email_verified', true),
      'email', now(), now(), now()
    );

    UPDATE users SET auth_user_id = new_uid WHERE id = staff.id;
    made := made + 1;
  END LOOP;

  RAISE NOTICE 'logins created: %', made;
END $$;

-- What the app will see. Every active person should have an account; anyone
-- listed as MISSING cannot sign in.
SELECT u.id,
       u.role,
       coalesce(u.branch_id, '—')                         AS branch,
       CASE WHEN u.auth_user_id IS NULL THEN 'MISSING' ELSE 'ok' END AS login,
       a.email
  FROM users u
  LEFT JOIN auth.users a ON a.id = u.auth_user_id
 WHERE u.active
 ORDER BY CASE WHEN u.auth_user_id IS NULL THEN 0 ELSE 1 END, u.id;
