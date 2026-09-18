-- A payroll number can change, and the person's history follows it.
--
-- The number was declared permanent in init.sql, and everything hangs off
-- it: marks, verifications, queries, reminders, coverage, the audit tables,
-- the login. That was the right shape and it stays — but payroll numbers
-- are issued per outlet and position (MC for a DMC pekerja, KP for BKP, HQ
-- for head office), so a transfer can bring a new one. Until now Postgres
-- simply refused the change, because none of the sixteen foreign keys said
-- what to do on UPDATE.
--
-- Now they all cascade. Changing users.id rewrites every reference in the
-- same statement, atomically: the marks stay the person's, the queries stay
-- answered, the audit stays attributed. The number remains the key and the
-- identity — it is just no longer immutable. The login follows too: the
-- synthetic address is derived from the number, so users_sync_auth_email
-- now fires on a change of id as well and rewrites it (a real e-mail is
-- untouched). Sessions survive, because they are keyed on auth.uid(), and
-- app_user_id() reads the current number off the row.
--
-- Who may change it: admin, through users_write, the same as every other
-- edit to a person. The app records each change in payroll_id_changes the
-- way it records role and posting changes.

-- ---------------------------------------------- references follow the key ----
--
-- Done dynamically rather than by naming sixteen constraints: the names are
-- Postgres's own (<table>_<column>_fkey) and the ON DELETE rule of each is
-- kept exactly as it was. verify_policies.sql checks the result, and any
-- foreign key to users(id) added later must say ON UPDATE CASCADE itself.

DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN
    SELECT c.conname, c.conrelid::regclass AS tbl, pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
     WHERE c.contype = 'f'
       AND c.confrelid = 'public.users'::regclass
       AND c.confupdtype <> 'c'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I, ADD CONSTRAINT %I %s ON UPDATE CASCADE',
                   fk.tbl, fk.conname, fk.conname, fk.def);
  END LOOP;
END $$;

-- The shape sign-in and the Edge Function already insist on, now held at the
-- table too, so an admin cannot type a number the login could never use.
-- NOT VALID: rows already there are left alone; every new or changed id is
-- checked.
ALTER TABLE users ADD CONSTRAINT users_id_format
  CHECK (id ~ '^[A-Z]{2}[0-9]{4}$') NOT VALID;

COMMENT ON COLUMN users.id IS
  'Payroll number, issued per outlet and position (MC/KP/HQ/WS/…). The identity and the key; may be changed by admin, and every reference follows it.';

-- ---------------------------------------------------------- the audit ----

CREATE TABLE payroll_id_changes (
  id          bigserial PRIMARY KEY,
  -- Cascades like the rest, so this row always points at the person under
  -- whatever number they hold now; from_id/to_id are the history itself.
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  from_id     text NOT NULL,
  to_id       text NOT NULL,
  changed_by  text REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (from_id <> to_id)
);

CREATE INDEX payroll_id_changes_user_idx ON payroll_id_changes (user_id, changed_at DESC);

ALTER TABLE payroll_id_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_id_changes_read  ON payroll_id_changes FOR SELECT TO authenticated USING (app_is_admin());
CREATE POLICY payroll_id_changes_write ON payroll_id_changes FOR INSERT TO authenticated WITH CHECK (app_is_admin());

COMMENT ON TABLE payroll_id_changes IS
  'Every change of payroll number: who held what, and who changed it. Admin-only, like role_changes.';

-- ------------------------------------------------ the login follows too ----

CREATE OR REPLACE FUNCTION sync_auth_email()
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
     AND NEW.auth_user_id IS NOT DISTINCT FROM OLD.auth_user_id
     AND NEW.id = OLD.id THEN
    RETURN NEW;
  END IF;

  login_email := COALESCE(lower(NEW.email), lower(NEW.id) || '@checklist.local');

  UPDATE auth.users
     SET email = login_email,
         -- payroll_id in the metadata is informational (provision_login()
         -- writes it); kept true rather than left to mislead.
         raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
                              || jsonb_build_object('payroll_id', NEW.id),
         updated_at = now()
   WHERE id = NEW.auth_user_id;

  UPDATE auth.identities
     SET identity_data = identity_data || jsonb_build_object('email', login_email),
         updated_at = now()
   WHERE user_id = NEW.auth_user_id AND provider = 'email';

  RETURN NEW;
END;
$$;

DROP TRIGGER users_sync_auth_email ON users;
CREATE TRIGGER users_sync_auth_email
  AFTER INSERT OR UPDATE OF email, auth_user_id, id ON users
  FOR EACH ROW EXECUTE FUNCTION sync_auth_email();
