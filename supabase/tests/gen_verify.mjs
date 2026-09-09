/**
 * Runs every migration against a real Postgres (PGlite), reads back the policy
 * and function catalogue, and emits supabase/tests/verify_policies.sql — a
 * script that compares a live database against that snapshot.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const db = new PGlite();

await db.exec(`
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid
  $$;
  CREATE ROLE authenticated;
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
`;

writeFileSync(`${ROOT}supabase/tests/verify_policies.sql`, sql);
console.log(`policies: ${rows.length}, functions: ${fns.rows.length}, rls tables: ${rls.rows.length}, granted tables: ${grants.rows.length}`);
