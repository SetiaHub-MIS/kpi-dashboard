-- Policy verification for Checklist Mingguan.
--
-- Generated from the migration files themselves, applied to a real Postgres.
-- Run it against the live database after applying migrations; every row should
-- read PASS. It reads catalogue tables only and changes nothing.
--
--   psql "$DATABASE_URL" -f supabase/tests/verify_policies.sql
--   (or paste into the Supabase SQL editor)
--
-- Regenerate after adding a migration:  node supabase/tests/gen_verify.mjs

WITH expected_fn(name) AS (VALUES
  ('app_branch_id'),
  ('app_can_see_branch'),
  ('app_can_see_branch_returns'),
  ('app_can_see_mark'),
  ('app_can_see_returns'),
  ('app_can_see_store_ops'),
  ('app_is_admin'),
  ('app_is_central_store'),
  ('app_is_cross_branch'),
  ('app_is_exec'),
  ('app_is_returns_writer'),
  ('app_role'),
  ('app_user_id')
),
expected_rls(tbl) AS (VALUES
  ('assets'),
  ('branch_changes'),
  ('branches'),
  ('checklist_categories'),
  ('checklist_forms'),
  ('checklist_lines'),
  ('mark_lines'),
  ('mark_verifications'),
  ('marks'),
  ('return_events'),
  ('returns'),
  ('role_changes'),
  ('scoring_rules'),
  ('suppliers'),
  ('tugasan_checks'),
  ('tugasan_items'),
  ('tugasan_signoffs'),
  ('user_branches'),
  ('users')
),
expected_pol(tbl, pol, cmd, fns, roles) AS (VALUES
  ('assets', 'assets_read', 'SELECT', 'app_can_see_branch', ''),
  ('assets', 'assets_write', 'ALL', 'app_can_see_branch,app_is_exec,app_role', 'area_manager,supervisor'),
  ('branch_changes', 'branch_changes_read', 'SELECT', 'app_is_admin', ''),
  ('branch_changes', 'branch_changes_write', 'INSERT', 'app_is_admin', ''),
  ('branches', 'branches_read', 'SELECT', '', ''),
  ('branches', 'branches_write', 'ALL', 'app_is_admin', ''),
  ('checklist_categories', 'ref_read_categories', 'SELECT', '', ''),
  ('checklist_categories', 'ref_write_categories', 'ALL', 'app_is_admin', ''),
  ('checklist_forms', 'ref_read_forms', 'SELECT', '', ''),
  ('checklist_forms', 'ref_write_forms', 'ALL', 'app_is_admin', ''),
  ('checklist_lines', 'ref_read_lines', 'SELECT', '', ''),
  ('checklist_lines', 'ref_write_lines', 'ALL', 'app_is_admin', ''),
  ('mark_lines', 'mark_lines_read', 'SELECT', 'app_can_see_mark', ''),
  ('mark_lines', 'mark_lines_write', 'ALL', 'app_can_see_mark,app_is_exec,app_role', 'supervisor'),
  ('mark_verifications', 'verifications_read', 'SELECT', 'app_can_see_mark', ''),
  ('mark_verifications', 'verifications_write', 'ALL', 'app_can_see_mark,app_is_exec,app_role', 'area_manager'),
  ('marks', 'marks_insert', 'INSERT', 'app_can_see_mark,app_is_exec,app_role', 'supervisor'),
  ('marks', 'marks_read', 'SELECT', 'app_can_see_mark', ''),
  ('marks', 'marks_update', 'UPDATE', 'app_can_see_mark,app_is_exec,app_role', 'area_manager,supervisor'),
  ('return_events', 'return_events_read', 'SELECT', 'app_can_see_branch_returns,app_can_see_returns', ''),
  ('return_events', 'return_events_write', 'ALL', 'app_can_see_branch_returns,app_is_returns_writer', ''),
  ('returns', 'returns_read', 'SELECT', 'app_can_see_branch_returns,app_can_see_returns', ''),
  ('returns', 'returns_write', 'ALL', 'app_can_see_branch_returns,app_is_returns_writer', ''),
  ('role_changes', 'role_changes_read', 'SELECT', 'app_is_admin', ''),
  ('role_changes', 'role_changes_write', 'INSERT', 'app_is_admin', ''),
  ('scoring_rules', 'scoring_read', 'SELECT', 'app_can_see_branch', ''),
  ('scoring_rules', 'scoring_write', 'ALL', 'app_is_admin', ''),
  ('suppliers', 'ref_read_suppliers', 'SELECT', '', ''),
  ('suppliers', 'suppliers_write', 'INSERT', 'app_is_returns_writer', ''),
  ('tugasan_checks', 'tugasan_checks_read', 'SELECT', 'app_can_see_branch', ''),
  ('tugasan_checks', 'tugasan_checks_write', 'ALL', 'app_can_see_branch,app_is_admin,app_role', 'area_manager'),
  ('tugasan_items', 'ref_read_tugasan', 'SELECT', '', ''),
  ('tugasan_items', 'ref_write_tugasan', 'ALL', 'app_is_admin', ''),
  ('tugasan_signoffs', 'tugasan_signoffs_read', 'SELECT', 'app_can_see_branch', ''),
  ('tugasan_signoffs', 'tugasan_signoffs_write', 'ALL', 'app_can_see_branch,app_is_admin,app_role', 'area_manager'),
  ('user_branches', 'user_branches_read', 'SELECT', 'app_can_see_branch,app_is_cross_branch,app_user_id', ''),
  ('user_branches', 'user_branches_write', 'ALL', 'app_is_admin', ''),
  ('users', 'users_read', 'SELECT', 'app_can_see_branch,app_is_admin', ''),
  ('users', 'users_write', 'ALL', 'app_is_admin', '')
),
actual_pol AS (
  SELECT tablename AS tbl, policyname AS pol, cmd,
         (SELECT string_agg(DISTINCT m[1], ',' ORDER BY m[1])
            FROM regexp_matches(coalesce(qual,'') || ' ' || coalesce(with_check,''),
                                '(app_[a-z_]+)', 'g') m) AS fns,
         coalesce((SELECT string_agg(DISTINCT m[1], ',' ORDER BY m[1])
            FROM regexp_matches(coalesce(qual,'') || ' ' || coalesce(with_check,''),
                 '''(staff|store|clerk|supervisor|area_manager|manager|general_manager|human_resources|admin)''', 'g') m), '') AS roles
    FROM pg_policies WHERE schemaname = 'public'
)
SELECT * FROM (
  -- 1. every helper function is present
  SELECT 1 AS ord, 'function ' || e.name AS item,
         CASE WHEN p.proname IS NULL THEN 'MISSING' ELSE 'PASS' END AS result,
         '' AS detail
    FROM expected_fn e
    LEFT JOIN pg_proc p ON p.proname = e.name
     AND p.pronamespace = 'public'::regnamespace

  UNION ALL
  -- 2. row-level security is still switched on
  SELECT 2, 'rls enabled on ' || e.tbl,
         CASE WHEN c.relrowsecurity THEN 'PASS' ELSE 'OFF' END, ''
    FROM expected_rls e
    LEFT JOIN pg_class c ON c.relname = e.tbl
     AND c.relnamespace = 'public'::regnamespace

  UNION ALL
  -- 3. each policy exists and rests on the rules it should
  SELECT 3, e.tbl || '.' || e.pol,
         CASE
           WHEN a.pol IS NULL THEN 'MISSING'
           WHEN coalesce(a.fns,'') <> e.fns OR coalesce(a.roles,'') <> e.roles THEN 'DIFFERS'
           WHEN a.cmd <> e.cmd THEN 'DIFFERS'
           ELSE 'PASS'
         END,
         CASE
           WHEN a.pol IS NULL THEN 'policy not found'
           WHEN coalesce(a.fns,'') <> e.fns
             THEN 'expected predicates [' || e.fns || '] got [' || coalesce(a.fns,'') || ']'
           WHEN coalesce(a.roles,'') <> e.roles
             THEN 'expected roles [' || e.roles || '] got [' || coalesce(a.roles,'') || ']'
           WHEN a.cmd <> e.cmd THEN 'expected ' || e.cmd || ' got ' || a.cmd
           ELSE ''
         END
    FROM expected_pol e
    LEFT JOIN actual_pol a ON a.tbl = e.tbl AND a.pol = e.pol

  UNION ALL
  -- 4. nothing extra was left behind by a partial run
  SELECT 4, a.tbl || '.' || a.pol, 'UNEXPECTED', 'policy is not in the migrations'
    FROM actual_pol a
    LEFT JOIN expected_pol e ON e.tbl = a.tbl AND e.pol = a.pol
   WHERE e.pol IS NULL
) x
ORDER BY CASE result WHEN 'PASS' THEN 9 ELSE 0 END, ord, item;
