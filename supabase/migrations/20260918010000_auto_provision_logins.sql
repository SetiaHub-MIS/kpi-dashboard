-- A login is issued the moment a person is added.
--
-- Until now a new users row sat without a login until admin ran
-- provision_logins.sql by hand. Since 20260916 supervisors and Area Managers
-- add their own crew from the app, which made that wait the slowest step
-- between "started on Monday" and "can be marked" — and one that depended on
-- somebody remembering. Now the database does it as part of the INSERT, the
-- same way for admin and for a supervisor, and the person can sign in at
-- once with the starting password.
--
-- The starting password is one for everyone, exactly as the script had it,
-- but it lives in login_settings — a single-row table that nothing except
-- the database itself can read — rather than in a file in the repository.
-- This migration does NOT set it. Once, live, after applying:
--
--     INSERT INTO login_settings (start_password) VALUES ('…');
--
-- Until that row exists, adding a person fails with a message that says so.
-- That is deliberate: a person who exists but cannot sign in is the failure
-- mode this migration removes, and it must not come back quietly.
--
-- The mechanics are provision_logins.sql's, moved into a trigger. AFTER
-- rather than BEFORE INSERT because users_insert_branch_staff requires
-- auth_user_id IS NULL on the row a supervisor inserts; the link is written
-- afterwards, under the function's owner, which in turn carries the login
-- address across through users_sync_auth_email. UPDATE OF active is covered
-- too, so a person added inactive, or one reactivated who never had a login,
-- gets one when they are switched on.

-- ------------------------------------------------------- the one setting ----

CREATE TABLE login_settings (
  -- A CHECK on a boolean primary key is the cheapest "exactly one row".
  one            boolean PRIMARY KEY DEFAULT true CHECK (one),
  start_password text NOT NULL CHECK (length(start_password) >= 6),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE login_settings IS
  'One row: the password every new login starts on. Read only by provision_login(); set and rotated by admin in the SQL editor.';

-- grants.sql's default privileges would hand authenticated four verbs on any
-- new table. This one is for the database alone: no grant, and RLS with no
-- policy behind it in case a grant ever reappears.
REVOKE ALL ON login_settings FROM PUBLIC, anon, authenticated, service_role;
ALTER TABLE login_settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------ the trigger ----

CREATE FUNCTION provision_login()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  start_password text;
  login_email    text;
  new_uid        uuid;
BEGIN
  IF NEW.auth_user_id IS NOT NULL OR NOT NEW.active THEN
    RETURN NEW;
  END IF;

  SELECT s.start_password INTO start_password FROM login_settings s;
  IF start_password IS NULL THEN
    RAISE EXCEPTION 'no starting password is set — admin must run: INSERT INTO login_settings (start_password) VALUES (''…'')'
      USING ERRCODE = 'P0001', HINT = 'See 20260918010000_auto_provision_logins.sql';
  END IF;

  new_uid     := gen_random_uuid();
  login_email := COALESCE(lower(NEW.email), lower(NEW.id) || '@checklist.local');

  -- The four token columns are '' rather than NULL on purpose: GoTrue reads
  -- them as strings, and a NULL surfaces later as "converting NULL to string
  -- is unsupported" the first time the account is touched by Auth.
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
    login_email,
    crypt(start_password, gen_salt('bf')),
    -- Confirmed on creation: the synthetic address receives no mail, and a
    -- real one has not been asked to prove anything.
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('payroll_id', NEW.id),
    '', '', '', '',
    now(), now()
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    new_uid, new_uid,
    jsonb_build_object('sub', new_uid::text, 'email', login_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  UPDATE users SET auth_user_id = new_uid WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION provision_login() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER users_provision_login
  AFTER INSERT OR UPDATE OF active ON users
  FOR EACH ROW EXECUTE FUNCTION provision_login();

COMMENT ON FUNCTION provision_login() IS
  'Issues a Supabase Auth login for a users row that has none, on the starting password in login_settings. Trigger only.';
