-- A real e-mail address per person, so a forgotten password can be reset.
--
-- Sign-in has always been keyed on the payroll number, with the login's
-- address synthesised as kp0093@checklist.local — a domain that receives no
-- mail, which is why "forgot password" could not exist. This adds the real
-- address to the directory, and keeps the login's address in step with it:
-- when someone has an e-mail, that is where Supabase sends the reset link;
-- when they do not, the synthetic address stays and admin resets by hand.
--
-- The payroll number remains the identity. The app never asks anyone to
-- type an e-mail to sign in; the payroll-auth Edge Function resolves it.

ALTER TABLE users ADD COLUMN email text;

ALTER TABLE users ADD CONSTRAINT users_email_format
  CHECK (email IS NULL OR email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- One person per address, case-insensitively; blanks are not a collision.
CREATE UNIQUE INDEX users_email_key ON users (lower(email)) WHERE email IS NOT NULL;

COMMENT ON COLUMN users.email IS
  'Real address for password resets. NULL means none — the login keeps its synthetic @checklist.local address and admin resets by hand.';

-- ---------------------------------------------- login address follows ----
--
-- SECURITY DEFINER because auth.users is Supabase's table, not ours, and the
-- admin updating a directory row holds no grant on it. search_path pinned for
-- the same reason every app_* helper pins it.

CREATE FUNCTION sync_auth_email()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  login_email text;
BEGIN
  IF NEW.auth_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.email IS NOT DISTINCT FROM OLD.email
     AND NEW.auth_user_id IS NOT DISTINCT FROM OLD.auth_user_id THEN
    RETURN NEW;
  END IF;

  login_email := COALESCE(lower(NEW.email), lower(NEW.id) || '@checklist.local');

  UPDATE auth.users
     SET email = login_email, updated_at = now()
   WHERE id = NEW.auth_user_id;

  UPDATE auth.identities
     SET identity_data = identity_data || jsonb_build_object('email', login_email),
         updated_at = now()
   WHERE user_id = NEW.auth_user_id AND provider = 'email';

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION sync_auth_email() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER users_sync_auth_email
  AFTER INSERT OR UPDATE OF email, auth_user_id ON users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_email();
