-- A mark stays open to its scorer until the Area Manager confirms it; after
-- that it is fixed.
--
-- Three things change together because they describe the same week:
--
--   * A perkara may score 0. The scale was 1..5 and there was no way to say
--     "not done at all" — the lowest a supervisor could give was 1.
--   * A week may be submitted with perkara left blank. Not every one of the
--     22 applies to every pekerja every week, so a blank is left out of the
--     denominator rather than scored zero — the same rule the SV/AS form has
--     had since 20260910010000, now for every form. max_score already moves
--     with the number of lines scored, so only the app changes for this.
--   * Once a mark carries a mark_verifications row, its total and its lines
--     can no longer be written. The Area Manager's "Ubah" lives on the
--     verification row, so their adjustment is untouched by this; what is
--     shut is the scorer going back and changing what was confirmed.
--
-- The lock is one predicate used by both write policies, for the reason
-- 20260910010100 gives: a rule spelled out in two places is a rule that
-- drifts. An upsert onto a locked week fails at the row (ON CONFLICT DO
-- UPDATE checks the UPDATE policy's USING), so nothing is half-written.

ALTER TABLE mark_lines DROP CONSTRAINT mark_lines_score_check;
ALTER TABLE mark_lines ADD CONSTRAINT mark_lines_score_check CHECK (score >= 0);

COMMENT ON COLUMN mark_lines.score IS
  '0..scale_max. A perkara that does not apply has no row at all, and is not in marks.max_score.';

CREATE FUNCTION app_mark_verified(p_mark_id bigint)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM mark_verifications v WHERE v.mark_id = p_mark_id);
$$;

COMMENT ON FUNCTION app_mark_verified(bigint) IS
  'True once the Area Manager has confirmed the mark. A confirmed mark and its lines are read-only to everyone; only the verification row itself may still change.';

DROP POLICY marks_update ON marks;
CREATE POLICY marks_update ON marks FOR UPDATE TO authenticated
  USING (app_can_see_mark(branch_id, form_key) AND app_can_score() AND NOT app_mark_verified(id))
  WITH CHECK (app_can_see_mark(branch_id, form_key) AND NOT app_mark_verified(id));

DROP POLICY mark_lines_write ON mark_lines;
CREATE POLICY mark_lines_write ON mark_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM marks m WHERE m.id = mark_id
                   AND app_can_see_mark(m.branch_id, m.form_key))
         AND app_can_score()
         AND NOT app_mark_verified(mark_id))
  WITH CHECK (EXISTS (SELECT 1 FROM marks m WHERE m.id = mark_id
                        AND app_can_see_mark(m.branch_id, m.form_key))
              AND app_can_score()
              AND NOT app_mark_verified(mark_id));
