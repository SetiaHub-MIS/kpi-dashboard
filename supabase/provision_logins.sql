-- Backfill: issue a login for every active staff row that still has none.
--
-- Since 20260918010000 the database does this itself the moment a person is
-- added (provision_login(), on INSERT and on activation), so in normal use
-- this script finds nothing to do. It remains for rows that predate the
-- trigger, or were created while it could not run — the same mechanics, the
-- same starting password, read from login_settings rather than typed here.
--
-- Sign-in is keyed on the payroll number: the app turns KP0093 into
-- kp0093@checklist.local (or the real e-mail when the directory has one)
-- and sends that to Supabase Auth. users.auth_user_id is the real link.
--
-- Paste into the Supabase SQL editor and run. Idempotent — anyone who
-- already has an account is skipped. Tell the people it lists their
-- starting password and have them change it on first sign-in.

-- pgcrypto lives in the extensions schema on Supabase, so crypt() and
-- gen_salt() are not reachable unqualified until it is on the search path.
SET search_path = public, extensions;

DO $$
DECLARE
  email_domain   text := 'checklist.local';
  start_password text := (SELECT s.start_password FROM login_settings s);
  staff          record;
  new_uid        uuid;
  made           int := 0;
BEGIN
  IF start_password IS NULL THEN
    RAISE EXCEPTION 'no starting password is set — first run: INSERT INTO login_settings (start_password) VALUES (''…'')';
  END IF;

  FOR staff IN
    SELECT id, email FROM users WHERE active AND auth_user_id IS NULL ORDER BY id
  LOOP
    new_uid := gen_random_uuid();

    -- The four token columns are set to '' rather than left NULL on purpose:
    -- GoTrue reads them as strings, and a NULL there surfaces later as
    -- "converting NULL to string is unsupported" the first time someone tries
    -- a password reset.
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token,
      email_change, email_change_token_new,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_uid,
      'authenticated',
      'authenticated',
      -- The real address when the directory has one; the synthetic one otherwise.
      COALESCE(lower(staff.email), lower(staff.id) || '@' || email_domain),
      crypt(start_password, gen_salt('bf')),
      -- Confirmed on creation: these addresses receive no mail, so a
      -- confirmation link would never arrive.
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('payroll_id', staff.id),
      '', '', '', '',
      now(), now()
    );

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      new_uid, new_uid,
      jsonb_build_object('sub', new_uid::text,
                         'email', COALESCE(lower(staff.email), lower(staff.id) || '@' || email_domain),
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
