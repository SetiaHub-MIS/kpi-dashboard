/**
 * Runs every migration against a real Postgres (PGlite), reads back the policy
 * and function catalogue, and emits supabase/tests/verify_policies.sql — a
 * script that compares a live database against that snapshot.
 */
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const db = new PGlite({ extensions: { pgcrypto } });

await db.exec(`
  CREATE SCHEMA IF NOT EXISTS auth;
  -- The columns provision_login() writes, plus what the e-mail sync touches.
  CREATE TABLE auth.users (
    id uuid PRIMARY KEY, instance_id uuid, aud text, role text, email text,
    encrypted_password text, email_confirmed_at timestamptz,
    raw_app_meta_data jsonb, raw_user_meta_data jsonb,
    confirmation_token text, recovery_token text, email_change text, email_change_token_new text,
    created_at timestamptz, updated_at timestamptz
  );
  CREATE TABLE auth.identities (
    provider_id text, user_id uuid, provider text, identity_data jsonb DEFAULT '{}'::jsonb,
    last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz
  );
  -- pgcrypto sits in the extensions schema on Supabase; the migrations that
  -- hash passwords put that schema on their search_path and nothing else.
  CREATE SCHEMA IF NOT EXISTS extensions;
  CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid
  $$;
  CREATE ROLE authenticated;
  CREATE ROLE anon;
  CREATE ROLE service_role BYPASSRLS;
  -- Enough of Supabase Storage for return_photos.sql to apply. Its policies
  -- live in the storage schema, which the checks below never query (they are
  -- scoped to schemaname = 'public'), so this is only here to let the
  -- migration itself run.
  CREATE SCHEMA IF NOT EXISTS storage;
  CREATE TABLE storage.buckets (
    id text PRIMARY KEY, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]
  );
  CREATE TABLE storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text, name text, owner uuid
  );
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(name, '/') $$;
`);

const MIGRATIONS = [
  '20260909010000_init.sql',
  '20260909010100_auth_bridge.sql',
  '20260909010200_rls.sql',
  '20260909020000_return_submission_stage.sql',
  '20260909020100_return_kpi.sql',
  '20260909030000_tugasan_stays_with_area_manager.sql',
  '20260909030100_returns_leave_admin.sql',
  '20260909030200_central_store_at_hq.sql',
  '20260909030300_grants.sql',
  '20260909030400_real_branches.sql',
  '20260910010000_sv_checklist.sql',
  '20260910010100_who_may_score.sql',
  '20260910020000_return_photos.sql',
  '20260910030000_mark_queries.sql',
  '20260910030100_reminders.sql',
  '20260916010000_branch_staff_management.sql',
  '20260916020000_tighten_grants.sql',
  '20260917010000_user_email.sql',
  '20260917020000_set_my_email.sql',
  '20260917030000_service_role_reads_users.sql',
  '20260918010000_auto_provision_logins.sql',
  '20260918020000_payroll_number_changes.sql',
  '20260918030000_manager_manages_outlets.sql',
  '20260918040000_report_views.sql',
  '20260919010000_payroll_number_shape.sql',
];
for (const m of MIGRATIONS) {
  await db.exec(readFileSync(`${ROOT}supabase/migrations/${m}`, 'utf8'));
}

// Which app_* helpers each policy leans on. Comparing the set of predicates is
// robust to whitespace and to how a given PG version deparses the expression,
// while still catching a policy wired to the wrong rule.
const pol = await db.query(`
  SELECT tablename, policyname, cmd,
         coalesce(qual,'') || ' ' || coalesce(with_check,'') AS body
    FROM pg_policies WHERE schemaname = 'public'
   ORDER BY tablename, policyname
`);

const rows = pol.rows.map((r) => {
  const fns = [...new Set((r.body.match(/app_[a-z_]+/g) ?? []))].sort();
  const roles = [...new Set((r.body.match(/'(staff|store|clerk|supervisor|area_manager|manager|general_manager|human_resources|admin)'/g) ?? []).map((s) => s.slice(1, -1)))].sort();
  return { ...r, fns: fns.join(','), roles: roles.join(',') };
});

const fns = await db.query(`
  SELECT p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname LIKE 'app\\_%'
   ORDER BY 1
`);

const grants = await db.query(`
  SELECT table_name, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privs
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND grantee = 'authenticated'
   GROUP BY table_name ORDER BY table_name
`);

// Tables the app must not reach at all — no grant to either app role in the
// migrations (login_settings holds the starting password). Held to "nothing",
// which "grant on <tbl>" cannot express.
const privateTables = await db.query(`
  SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'r'
     AND NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants g
                      WHERE g.table_schema = 'public' AND g.table_name = c.relname
                        AND g.grantee IN ('authenticated', 'anon'))
   ORDER BY 1
`);

const rls = await db.query(`
  SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity ORDER BY 1
`);

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const sql = `-- Policy verification for Checklist Mingguan.
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
${fns.rows.map((r) => `  (${q(r.proname)})`).join(',\n')}
),
expected_rls(tbl) AS (VALUES
${rls.rows.map((r) => `  (${q(r.relname)})`).join(',\n')}
),
expected_grant(tbl, privs) AS (VALUES
${grants.rows.map((r) => `  (${q(r.table_name)}, ${q(r.privs)})`).join(',\n')}
),
expected_private(tbl) AS (VALUES
${privateTables.rows.map((r) => `  (${q(r.relname)})`).join(',\n')}
),
expected_pol(tbl, pol, cmd, fns, roles) AS (VALUES
${rows.map((r) => `  (${q(r.tablename)}, ${q(r.policyname)}, ${q(r.cmd)}, ${q(r.fns)}, ${q(r.roles)})`).join(',\n')}
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
`;

// The script is meant for a database this process never sees, so the least
// it can do is prove it parses and runs — against the very database it was
// generated from, where every row must read PASS. A generator slip (an
// ambiguous cast, a column that is not there) is caught here rather than in
// the SQL editor. The dynamic sections (5.) find their rows at run time, so
// a non-PASS on this database is a generator bug, not drift.
const dryRun = await db.query(sql);
const notPass = dryRun.rows.filter((r) => r.result !== 'PASS');
if (notPass.length > 0) {
  console.error('verify_policies.sql does not pass against its own source database:');
  for (const r of notPass) console.error(`  ${r.result.padEnd(12)} ${r.item}  ${r.detail}`);
  process.exit(1);
}

writeFileSync(`${ROOT}supabase/tests/verify_policies.sql`, sql);
console.log(`policies: ${rows.length}, functions: ${fns.rows.length}, rls tables: ${rls.rows.length}, granted tables: ${grants.rows.length}, checks: ${dryRun.rows.length} (all PASS here)`);
