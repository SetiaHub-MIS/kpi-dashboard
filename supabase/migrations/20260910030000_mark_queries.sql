-- A short question/answer thread attached to one week's mark.
--
-- "Tanya SV" on the staff self-view has been a stub since Sprint 3 — this is
-- what it was waiting on. The thread is scoped to exactly the two people who
-- have anything to discuss: the person the mark belongs to, and whoever scored
-- it. Head office may read and reply anywhere, the same reach as the mark
-- itself, because a question that never gets answered is worth surfacing to
-- them.

CREATE TABLE mark_queries (
  id          bigserial PRIMARY KEY,
  mark_id     bigint NOT NULL REFERENCES marks(id) ON DELETE CASCADE,
  sender_id   text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body        text NOT NULL CHECK (btrim(body) <> ''),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mark_queries_mark_idx ON mark_queries (mark_id, created_at);

COMMENT ON TABLE mark_queries IS
  'Staff <-> SV/AS thread over one week''s mark. Realtime-enabled so both sides see a new message without reloading.';

ALTER TABLE mark_queries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON mark_queries TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE mark_queries_id_seq TO authenticated;

-- Only the mark's own person, whoever scored it, or head office may read the
-- thread or post into it — never a supervisor or Area Manager elsewhere in the
-- same branch who happens to have marks access, because they are not part of
-- this conversation.
CREATE POLICY mark_queries_read ON mark_queries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM marks m WHERE m.id = mark_id
      AND (m.user_id = app_user_id() OR m.scored_by = app_user_id() OR app_is_exec())
  ));

CREATE POLICY mark_queries_write ON mark_queries FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = app_user_id()
    AND EXISTS (
      SELECT 1 FROM marks m WHERE m.id = mark_id
        AND (m.user_id = app_user_id() OR m.scored_by = app_user_id() OR app_is_exec())
    )
  );

-- No update or delete policy: a message stands once sent, the same as the rest
-- of the app's audit trail (role_changes, branch_changes, return_events).

-- Every hosted Supabase project already has this publication; it is created
-- here only so the migration also runs clean against a bare Postgres (the test
-- harness included).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE mark_queries;
