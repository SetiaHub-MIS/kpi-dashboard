-- Head office's "may I see this row?" is answered once per query, not per row.
--
-- After the 2026 history import (about 7,400 marks), every report the
-- reports app reads timed out for the General Manager: "canceling statement
-- due to statement timeout". Measured in the PGlite harness with live-sized
-- data (352 people, 8,471 marks), the same queries take under 0.1 s without
-- row-level security and 1.7–11 s with it, as GM — report_company_monthly
-- 11.3 s, report_branch_monthly for one month 5.6 s. Supabase's limit for a
-- signed-in caller is 8 s.
--
-- The cost is the policy, not the data. marks_read calls
-- app_can_see_mark(branch_id, form_key) for every row; that calls
-- app_can_see_branch() and app_can_see_store_ops(), and each of those looks
-- up the caller in users again. They are SECURITY DEFINER, so Postgres cannot
-- inline them or notice that the answer is the same for every row — and the
-- report views read marks several times per query.
--
-- For a cross-branch role the answer IS the same for every row, and the
-- existing functions already say so. Each policy below gains that test first,
-- wrapped in (SELECT …) so Postgres evaluates it once per statement (an
-- InitPlan) and stops there when it is true. The original per-row test stays
-- behind it, unchanged, for every other role. Nobody sees a row they could
-- not see before and nobody loses one:
--
--   * marks: app_is_cross_branch() makes app_can_see_branch() true for every
--     outlet, and a stor mark additionally needs app_can_see_store_ops() —
--     exactly app_can_see_mark()'s own rule, so the manager stays blind to
--     the stor side.
--   * mark_verifications, tugasan_*: app_is_exec() (GM, HR, admin) passes
--     both app_can_see_mark() for every mark and app_can_read_tugasan() for
--     every outlet.
--   * users, scoring_rules, user_branches: app_is_cross_branch() makes
--     app_can_see_branch() true for every row.
--
-- Returns are not touched: their tables are small and report_returns_* ran
-- in 40 ms under the same test.

ALTER POLICY marks_read ON marks
  USING (
    ((SELECT app_is_cross_branch()) AND (form_key <> 'stor' OR (SELECT app_can_see_store_ops())))
    OR app_can_see_mark(branch_id, form_key)
  );

ALTER POLICY verifications_read ON mark_verifications
  USING (
    (SELECT app_is_exec())
    OR EXISTS (SELECT 1 FROM marks m WHERE m.id = mark_id
                 AND app_can_see_mark(m.branch_id, m.form_key))
  );

ALTER POLICY users_read ON users
  USING (
    (SELECT app_is_cross_branch())
    OR app_is_admin()
    OR auth_user_id = (SELECT auth.uid())   -- always see your own record
    OR app_can_see_branch(branch_id)
  );

ALTER POLICY scoring_read ON scoring_rules
  USING ((SELECT app_is_cross_branch()) OR app_can_see_branch(branch_id));

ALTER POLICY user_branches_read ON user_branches
  USING ((SELECT app_is_cross_branch()) OR user_id = (SELECT app_user_id()) OR app_can_see_branch(branch_id));

ALTER POLICY tugasan_checks_read ON tugasan_checks
  USING ((SELECT app_is_exec()) OR app_can_read_tugasan(branch_id));

ALTER POLICY tugasan_signoffs_read ON tugasan_signoffs
  USING ((SELECT app_is_exec()) OR app_can_read_tugasan(branch_id));
