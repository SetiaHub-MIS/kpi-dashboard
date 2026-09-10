-- In-app reminders from an Area Manager to an SV/AS about unmarked crew.
--
-- The sprint plan called for Expo Push here, but Expo Go can no longer receive
-- remote push at all, and a real device push needs an EAS development build and
-- Firebase credentials neither of which exist for this project yet. This is the
-- fallback the app can ship and test today: a reminder is a row the recipient's
-- own session reads, not something sent through an outside service, so it needs
-- no push infrastructure. Upgrading to real push later only adds a sender on
-- top of this table; nothing here has to change.

CREATE TABLE reminders (
  id            bigserial PRIMARY KEY,
  branch_id     text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  recipient_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_by       text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  message       text NOT NULL CHECK (btrim(message) <> ''),
  created_at    timestamptz NOT NULL DEFAULT now(),
  read_at       timestamptz
);

CREATE INDEX reminders_recipient_idx ON reminders (recipient_id, created_at DESC);

COMMENT ON TABLE reminders IS
  'In-app nudges from an Area Manager (or head office) to an SV/AS about unmarked crew.';

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON reminders TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE reminders_id_seq TO authenticated;

CREATE POLICY reminders_read ON reminders FOR SELECT TO authenticated
  USING (recipient_id = app_user_id() OR sent_by = app_user_id() OR app_is_exec());

-- Only the Area Manager covering the branch, or head office, may send one.
CREATE POLICY reminders_insert ON reminders FOR INSERT TO authenticated
  WITH CHECK (
    sent_by = app_user_id()
    AND app_can_see_branch(branch_id)
    AND (app_role() = 'area_manager' OR app_is_exec())
  );

-- The only update a recipient may make is marking their own reminder read.
CREATE POLICY reminders_mark_read ON reminders FOR UPDATE TO authenticated
  USING (recipient_id = app_user_id())
  WITH CHECK (recipient_id = app_user_id());
