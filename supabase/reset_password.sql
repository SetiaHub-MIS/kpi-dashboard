-- Set a new password for one person, by payroll number.
--
-- Forgotten passwords are admin's job: the person asks, admin runs this and
-- tells them the new password in person, and they change it on first
-- sign-in (Profil → Tukar kata laluan). No e-mail is involved, so it works
-- for everyone, whether or not the directory holds an address for them.
--
-- Paste into the Supabase SQL editor and run.
--
--   1. Set the two settings below.
--   2. Run. The row printed at the end confirms whose password changed.
--
-- The hash is made the same way provision_logins.sql makes the starting one.
-- Every existing session for the account is dropped too, so a phone that
-- still holds the old sign-in is signed out and has to use the new password.

SET search_path = public, extensions;

DO $$
DECLARE
  payroll_id   text := 'KP0093';     -- who
  new_password text := 'changeme1';  -- what they will type; at least 6 characters
  uid          uuid;
BEGIN
  IF length(new_password) < 6 THEN
    RAISE EXCEPTION 'password must be at least 6 characters (the app refuses shorter ones)';
  END IF;

  SELECT auth_user_id INTO uid FROM users WHERE id = upper(payroll_id);
  IF uid IS NULL THEN
    RAISE EXCEPTION 'no login for % — run provision_logins.sql first', upper(payroll_id);
  END IF;

  UPDATE auth.users
     SET encrypted_password = crypt(new_password, gen_salt('bf')),
         updated_at = now()
   WHERE id = uid;

  DELETE FROM auth.sessions WHERE user_id = uid;
  DELETE FROM auth.refresh_tokens WHERE user_id = uid::text;

  RAISE NOTICE 'password set for %; existing sessions signed out', upper(payroll_id);
END $$;

-- Confirmation: the account touched, and that nothing is left signed in.
SELECT u.id, u.name, u.role, a.updated_at AS password_changed_at,
       (SELECT count(*) FROM auth.sessions s WHERE s.user_id = a.id) AS open_sessions
  FROM users u
  JOIN auth.users a ON a.id = u.auth_user_id
 WHERE a.updated_at > now() - interval '1 minute'
 ORDER BY a.updated_at DESC;
