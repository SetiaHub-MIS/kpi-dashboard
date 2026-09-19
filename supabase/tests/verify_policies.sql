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
  ('app_can_score'),
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
  ('app_manages_outlets'),
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
  ('login_settings'),
  ('mark_lines'),
  ('mark_queries'),
  ('mark_verifications'),
  ('marks'),
  ('payroll_id_changes'),
  ('reminders'),
  ('return_events'),
  ('return_photos'),
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
expected_grant(tbl, privs) AS (VALUES
  ('assets', 'DELETE,INSERT,SELECT,UPDATE'),
  ('branch_changes', 'DELETE,INSERT,SELECT,UPDATE'),
  ('branches', 'DELETE,INSERT,SELECT,UPDATE'),
  ('checklist_categories', 'DELETE,INSERT,SELECT,UPDATE'),
  ('checklist_forms', 'DELETE,INSERT,SELECT,UPDATE'),
  ('checklist_lines', 'DELETE,INSERT,SELECT,UPDATE'),
  ('mark_coverage', 'DELETE,INSERT,SELECT,UPDATE'),
  ('mark_lines', 'DELETE,INSERT,SELECT,UPDATE'),
  ('mark_queries', 'DELETE,INSERT,SELECT,UPDATE'),
  ('mark_verifications', 'DELETE,INSERT,SELECT,UPDATE'),
  ('marks', 'DELETE,INSERT,SELECT,UPDATE'),
  ('payroll_id_changes', 'DELETE,INSERT,SELECT,UPDATE'),
  ('reminders', 'DELETE,INSERT,SELECT,UPDATE'),
  ('report_branch_monthly', 'DELETE,INSERT,SELECT,UPDATE'),
  ('report_branch_weekly', 'DELETE,INSERT,SELECT,UPDATE'),
  ('report_company_monthly', 'DELETE,INSERT,SELECT,UPDATE'),
  ('report_company_weekly', 'DELETE,INSERT,SELECT,UPDATE'),
  ('report_due', 'DELETE,INSERT,SELECT,UPDATE'),
  ('report_marks', 'DELETE,INSERT,SELECT,UPDATE'),
  ('report_periods', 'DELETE,INSERT,SELECT,UPDATE'),
  ('report_returns_branch_monthly', 'DELETE,INSERT,SELECT,UPDATE'),
  ('report_returns_open', 'DELETE,INSERT,SELECT,UPDATE'),
  ('report_staff_monthly', 'DELETE,INSERT,SELECT,UPDATE'),
  ('report_tugasan_branch_monthly', 'DELETE,INSERT,SELECT,UPDATE'),
  ('return_ageing', 'DELETE,INSERT,SELECT,UPDATE'),
  ('return_events', 'DELETE,INSERT,SELECT,UPDATE'),
  ('return_photos', 'DELETE,INSERT,SELECT,UPDATE'),
  ('return_stage_gaps', 'DELETE,INSERT,SELECT,UPDATE'),
  ('return_submission', 'DELETE,INSERT,SELECT,UPDATE'),
  ('return_submission_kpi', 'DELETE,INSERT,SELECT,UPDATE'),
  ('return_turnaround', 'DELETE,INSERT,SELECT,UPDATE'),
  ('returns', 'DELETE,INSERT,SELECT,UPDATE'),
  ('role_changes', 'DELETE,INSERT,SELECT,UPDATE'),
  ('scoring_rules', 'DELETE,INSERT,SELECT,UPDATE'),
  ('suppliers', 'DELETE,INSERT,SELECT,UPDATE'),
  ('tugasan_checks', 'DELETE,INSERT,SELECT,UPDATE'),
  ('tugasan_items', 'DELETE,INSERT,SELECT,UPDATE'),
  ('tugasan_signoffs', 'DELETE,INSERT,SELECT,UPDATE'),
  ('user_branches', 'DELETE,INSERT,SELECT,UPDATE'),
  ('users', 'DELETE,INSERT,SELECT,UPDATE')
),
expected_private(tbl) AS (VALUES
  ('login_settings')
),
expected_pol(tbl, pol, cmd, fns, roles) AS (VALUES
  ('assets', 'assets_read', 'SELECT', 'app_can_see_branch', ''),
  ('assets', 'assets_write', 'ALL', 'app_can_see_branch,app_is_exec,app_manages_outlets,app_role', 'supervisor'),
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
  ('mark_lines', 'mark_lines_write', 'ALL', 'app_can_score,app_can_see_mark', ''),
  ('mark_queries', 'mark_queries_read', 'SELECT', 'app_is_exec,app_user_id', ''),
  ('mark_queries', 'mark_queries_write', 'INSERT', 'app_is_exec,app_user_id', ''),
  ('mark_verifications', 'verifications_read', 'SELECT', 'app_can_see_mark', ''),
  ('mark_verifications', 'verifications_write', 'ALL', 'app_can_see_mark,app_is_exec,app_manages_outlets', ''),
  ('marks', 'marks_insert', 'INSERT', 'app_can_score,app_can_see_mark', ''),
  ('marks', 'marks_read', 'SELECT', 'app_can_see_mark', ''),
  ('marks', 'marks_update', 'UPDATE', 'app_can_score,app_can_see_mark', ''),
  ('payroll_id_changes', 'payroll_id_changes_read', 'SELECT', 'app_is_admin', ''),
  ('payroll_id_changes', 'payroll_id_changes_write', 'INSERT', 'app_is_admin', ''),
  ('reminders', 'reminders_insert', 'INSERT', 'app_can_see_branch,app_is_exec,app_manages_outlets,app_user_id', ''),
  ('reminders', 'reminders_mark_read', 'UPDATE', 'app_user_id', ''),
  ('reminders', 'reminders_read', 'SELECT', 'app_is_exec,app_user_id', ''),
  ('return_events', 'return_events_read', 'SELECT', 'app_can_see_branch_returns,app_can_see_returns', ''),
  ('return_events', 'return_events_write', 'ALL', 'app_can_see_branch_returns,app_is_returns_writer', ''),
  ('return_photos', 'return_photos_read', 'SELECT', 'app_can_see_branch_returns,app_can_see_returns', ''),
  ('return_photos', 'return_photos_write', 'ALL', 'app_can_see_branch_returns,app_is_returns_writer', ''),
  ('returns', 'returns_read', 'SELECT', 'app_can_see_branch_returns,app_can_see_returns', ''),
  ('returns', 'returns_write', 'ALL', 'app_can_see_branch_returns,app_is_returns_writer', ''),
  ('role_changes', 'role_changes_read', 'SELECT', 'app_is_admin', ''),
  ('role_changes', 'role_changes_write', 'INSERT', 'app_is_admin', ''),
  ('scoring_rules', 'scoring_read', 'SELECT', 'app_can_see_branch', ''),
  ('scoring_rules', 'scoring_write', 'ALL', 'app_is_admin', ''),
  ('suppliers', 'ref_read_suppliers', 'SELECT', '', ''),
  ('suppliers', 'suppliers_write', 'INSERT', 'app_is_returns_writer', ''),
  ('tugasan_checks', 'tugasan_checks_read', 'SELECT', 'app_can_see_branch', ''),
  ('tugasan_checks', 'tugasan_checks_write', 'ALL', 'app_can_see_branch,app_is_admin,app_manages_outlets', ''),
  ('tugasan_items', 'ref_read_tugasan', 'SELECT', '', ''),
  ('tugasan_items', 'ref_write_tugasan', 'ALL', 'app_is_admin', ''),
  ('tugasan_signoffs', 'tugasan_signoffs_read', 'SELECT', 'app_can_see_branch', ''),
  ('tugasan_signoffs', 'tugasan_signoffs_write', 'ALL', 'app_can_see_branch,app_is_admin,app_manages_outlets', ''),
  ('user_branches', 'user_branches_read', 'SELECT', 'app_can_see_branch,app_is_cross_branch,app_user_id', ''),
  ('user_branches', 'user_branches_write', 'ALL', 'app_is_admin', ''),
  ('users', 'users_insert_branch_staff', 'INSERT', 'app_can_see_branch,app_role', 'area_manager,staff,supervisor'),
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
  -- 2b. the signed-in role can reach the table at all. RLS says which rows;
  --     without a GRANT every request is 42501 no matter how right the policy.
  SELECT 2, 'grant on ' || e.tbl,
         CASE WHEN a.privs IS NULL THEN 'NO GRANT'
              WHEN a.privs <> e.privs THEN 'DIFFERS'
              ELSE 'PASS' END,
         CASE WHEN a.privs IS NULL THEN 'authenticated cannot reach this table'
              WHEN a.privs <> e.privs THEN 'expected [' || e.privs || '] got [' || a.privs || ']'
              ELSE '' END
    FROM expected_grant e
    LEFT JOIN (
      SELECT table_name, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privs
        FROM information_schema.role_table_grants
       WHERE table_schema = 'public' AND grantee = 'authenticated'
       GROUP BY table_name
    ) a ON a.table_name = e.tbl

  UNION ALL
  -- 2c. anon holds nothing. Every policy is TO authenticated, so a grant to
  --     anon is dead weight at best — and Supabase hands one out by default
  --     to any table created through the dashboard, which is how the live
  --     database drifted from grants.sql for a week without anyone seeing.
  SELECT 2, 'anon holds nothing on ' || e.tbl,
         CASE WHEN a.privs IS NULL THEN 'PASS' ELSE 'OVER-GRANTED' END,
         CASE WHEN a.privs IS NULL THEN '' ELSE 'anon has [' || a.privs || ']' END
    FROM expected_grant e
    LEFT JOIN (
      SELECT table_name, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privs
        FROM information_schema.role_table_grants
       WHERE table_schema = 'public' AND grantee = 'anon'
       GROUP BY table_name
    ) a ON a.table_name = e.tbl

  UNION ALL
  -- 2c'. some tables the app must not reach at all — no grant to either app
  --      role, whatever Supabase's default privileges hand out to new tables.
  SELECT 2, 'app roles hold nothing on ' || e.tbl,
         CASE WHEN a.privs IS NULL THEN 'PASS' ELSE 'OVER-GRANTED' END,
         CASE WHEN a.privs IS NULL THEN '' ELSE 'has [' || a.privs || ']' END
    FROM expected_private e
    LEFT JOIN (
      SELECT table_name,
             string_agg(DISTINCT grantee || ':' || privilege_type, ',' ORDER BY grantee || ':' || privilege_type) AS privs
        FROM information_schema.role_table_grants
       WHERE table_schema = 'public' AND grantee IN ('authenticated', 'anon')
       GROUP BY table_name
    ) a ON a.table_name = e.tbl

  UNION ALL
  -- 2d. service_role can read the directory. payroll-auth resolves a payroll
  --     number to its login address under it; Supabase's default privileges
  --     were assumed to cover this and did not on the live database (42501
  --     from the function, 17 Sep 2026), so 20260917030000 grants it and
  --     this holds the database to it.
  SELECT 2, 'service_role can read users',
         CASE WHEN EXISTS (
                SELECT 1 FROM information_schema.role_table_grants
                 WHERE table_schema = 'public' AND table_name = 'users'
                   AND grantee = 'service_role' AND privilege_type = 'SELECT')
              THEN 'PASS' ELSE 'MISSING' END,
         ''

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

  UNION ALL
  -- 5. a payroll number can change, and every reference follows it. Every
  --    foreign key to users(id) — including any added after 20260918020000 —
  --    must cascade on update, or a transfer's new number is refused.
  SELECT 5, 'fk ' || c.conrelid::regclass || '.' || c.conname || ' cascades on update',
         CASE WHEN c.confupdtype = 'c' THEN 'PASS' ELSE 'NO CASCADE' END,
         CASE WHEN c.confupdtype = 'c' THEN '' ELSE 'ON UPDATE rule is ' || c.confupdtype::text END
    FROM pg_constraint c
   WHERE c.contype = 'f' AND c.confrelid = 'public.users'::regclass
) x
ORDER BY CASE result WHEN 'PASS' THEN 9 ELSE 0 END, ord, item;
