-- One predicate for "may score a checklist", instead of two that can drift.
--
-- Adding the Area Manager as a scorer meant editing `marks_insert`, and I
-- edited only that one — `mark_lines_write` still said supervisor-or-head-office.
-- The result passed every test and still failed in the app: the mark row was
-- created and its per-perkara lines were refused, leaving a total with no detail
-- behind it.
--
-- Two policies encoding the same rule is what allowed that, so they now share a
-- function. Change who may score in one place.

CREATE OR REPLACE FUNCTION app_can_score()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role IN ('supervisor', 'area_manager', 'general_manager', 'human_resources', 'admin')
       FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION app_can_score() IS
  'Who may write a checklist mark and its lines. SV/AS score staff and stor; the Area Manager scores SV/AS; head office may correct anywhere.';

DROP POLICY IF EXISTS marks_insert ON marks;
DROP POLICY IF EXISTS mark_lines_write ON mark_lines;

CREATE POLICY marks_insert ON marks FOR INSERT TO authenticated
  WITH CHECK (app_can_see_mark(branch_id, form_key) AND app_can_score());

CREATE POLICY mark_lines_write ON mark_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM marks m WHERE m.id = mark_id
                   AND app_can_see_mark(m.branch_id, m.form_key))
         AND app_can_score())
  WITH CHECK (EXISTS (SELECT 1 FROM marks m WHERE m.id = mark_id
                        AND app_can_see_mark(m.branch_id, m.form_key))
              AND app_can_score());
