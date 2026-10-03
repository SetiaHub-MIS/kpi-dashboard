-- An asset row can carry several open issues at once.
--
-- Each Checklist Kedai row (A) AIR-COND .. J) LAIN-LAIN) held one state: a
-- single is_open flag and a single note. An outlet with two air-conds broken
-- at once could log only one of them; to report the second, the Area Manager
-- first had to mark the first one resolved while it was still broken
-- (reported 3 Oct 2026). Resolving also overwrote the note, so the log kept
-- no history of what had been fixed.
--
-- asset_issues holds one row per reported problem, each opened and resolved
-- on its own. The assets row stays the fixed catalogue line and keeps
-- is_open / note / opened_on / resolved_on, now maintained from its issues
-- by trigger, so the reports app's documented contract (`assets` lists open
-- physical issues) still reads the same:
--
--   is_open     — any issue still open
--   opened_on   — the oldest open issue's date; once all are fixed, the
--                 last-resolved issue's
--   note        — the open issues' notes, oldest first, one per line;
--                 once all are fixed, the last-resolved issue's
--   resolved_on — when the last issue was resolved, NULL while any is open
--
-- Those four columns are no longer written by anyone but the trigger: the
-- app's write path moves to asset_issues, and authenticated loses write on
-- assets so the summary cannot drift from its issues.

CREATE TABLE asset_issues (
  id          bigserial PRIMARY KEY,
  asset_id    bigint NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  note        text NOT NULL CHECK (btrim(note) <> ''),
  opened_on   date NOT NULL DEFAULT report_today(),
  opened_by   text REFERENCES users(id) ON UPDATE CASCADE DEFAULT app_user_id(),
  resolved_on date,
  resolved_by text REFERENCES users(id) ON UPDATE CASCADE,
  CHECK (resolved_on IS NULL OR resolved_on >= opened_on)
);

CREATE INDEX asset_issues_open ON asset_issues (asset_id) WHERE resolved_on IS NULL;

COMMENT ON TABLE asset_issues IS
  'One reported problem on a Checklist Kedai asset row. Several may be open on the same row at once (two air-conds down); each is resolved on its own.';

-- Who resolved it is stamped here rather than trusted from the client; a
-- reopened issue loses it again. The date comes from the phone, so a phone
-- whose clock runs behind is held to the day the issue was opened.
CREATE FUNCTION asset_issues_stamp_resolver()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.resolved_on IS NULL THEN
    NEW.resolved_by := NULL;
  ELSIF OLD.resolved_on IS NULL THEN
    NEW.resolved_by := app_user_id();
    NEW.resolved_on := GREATEST(NEW.resolved_on, NEW.opened_on);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_issues_stamp_resolver
  BEFORE UPDATE OF resolved_on ON asset_issues
  FOR EACH ROW EXECUTE FUNCTION asset_issues_stamp_resolver();

CREATE FUNCTION assets_refresh_summary(p_asset_id bigint)
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  UPDATE assets a
     SET is_open     = s.open_count > 0,
         opened_on   = CASE WHEN s.open_count > 0 THEN s.first_open ELSE s.last_opened END,
         note        = CASE WHEN s.open_count > 0 THEN s.open_notes ELSE s.last_note END,
         resolved_on = CASE WHEN s.open_count > 0 THEN NULL ELSE s.last_resolved END
    FROM (
      SELECT count(*) FILTER (WHERE resolved_on IS NULL)                                AS open_count,
             min(opened_on) FILTER (WHERE resolved_on IS NULL)                          AS first_open,
             string_agg(note, E'\n' ORDER BY opened_on, id) FILTER (WHERE resolved_on IS NULL) AS open_notes,
             max(resolved_on)                                                           AS last_resolved,
             (array_agg(note ORDER BY resolved_on DESC NULLS LAST, id DESC))[1]         AS last_note,
             (array_agg(opened_on ORDER BY resolved_on DESC NULLS LAST, id DESC))[1]    AS last_opened
        FROM asset_issues
       WHERE asset_id = p_asset_id
    ) s
   WHERE a.id = p_asset_id;
$$;

REVOKE EXECUTE ON FUNCTION assets_refresh_summary(bigint) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION asset_issues_refresh_summary()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM assets_refresh_summary(OLD.asset_id);
  END IF;
  IF TG_OP <> 'DELETE' AND (TG_OP = 'INSERT' OR NEW.asset_id <> OLD.asset_id) THEN
    PERFORM assets_refresh_summary(NEW.asset_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER asset_issues_refresh_summary
  AFTER INSERT OR UPDATE OR DELETE ON asset_issues
  FOR EACH ROW EXECUTE FUNCTION asset_issues_refresh_summary();

-- ------------------------------------------------------------- backfill ----
-- Every open row becomes one open issue, and a row that was fixed and still
-- carries its note becomes one resolved issue, so nothing on screen changes.

INSERT INTO asset_issues (asset_id, note, opened_on, opened_by, resolved_on)
SELECT id,
       COALESCE(NULLIF(btrim(note), ''), '(tiada catatan)'),
       opened_on,
       NULL,
       CASE WHEN is_open THEN NULL ELSE GREATEST(resolved_on, opened_on) END
  FROM assets
 WHERE opened_on IS NOT NULL
   AND (is_open OR (resolved_on IS NOT NULL AND NULLIF(btrim(note), '') IS NOT NULL))
 ORDER BY id;

-- -------------------------------------------------------- privileges ----
-- Report and resolve; nobody deletes an issue (a mistaken one is resolved),
-- and the stamps are the database's, not the caller's.

REVOKE ALL ON asset_issues FROM authenticated;
GRANT SELECT ON asset_issues TO authenticated;
GRANT INSERT (asset_id, note, opened_on) ON asset_issues TO authenticated;
GRANT UPDATE (note, resolved_on) ON asset_issues TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON assets FROM authenticated;
DROP POLICY assets_write ON assets;

ALTER TABLE asset_issues ENABLE ROW LEVEL SECURITY;

-- The same reach and the same writers assets_write had.
CREATE POLICY asset_issues_read ON asset_issues FOR SELECT TO authenticated
  USING (app_can_see_branch((SELECT a.branch_id FROM assets a WHERE a.id = asset_id)));

CREATE POLICY asset_issues_insert ON asset_issues FOR INSERT TO authenticated
  WITH CHECK (app_can_see_branch((SELECT a.branch_id FROM assets a WHERE a.id = asset_id))
              AND (app_role() = 'supervisor' OR app_manages_outlets() OR app_is_exec()));

CREATE POLICY asset_issues_update ON asset_issues FOR UPDATE TO authenticated
  USING (app_can_see_branch((SELECT a.branch_id FROM assets a WHERE a.id = asset_id))
         AND (app_role() = 'supervisor' OR app_manages_outlets() OR app_is_exec()))
  WITH CHECK (app_can_see_branch((SELECT a.branch_id FROM assets a WHERE a.id = asset_id))
              AND (app_role() = 'supervisor' OR app_manages_outlets() OR app_is_exec()));
