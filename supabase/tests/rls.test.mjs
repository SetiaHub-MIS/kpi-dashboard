import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const db = new PGlite({ extensions: { pgcrypto } });

// --- stub what Supabase provides: the auth schema, auth.uid(), and the roles.
await db.exec(`
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE SCHEMA IF NOT EXISTS storage;
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
  -- Enough of Supabase Storage to hold the bucket and its policies.
  CREATE TABLE storage.buckets (
    id text PRIMARY KEY, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]
  );
  CREATE TABLE storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text, name text, owner uuid,
    created_at timestamptz DEFAULT now()
  );
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  -- Supabase refuses a plain DELETE on storage.objects; only the Storage API,
  -- which sets this flag, may remove a file. Without the stand-in, a trigger
  -- that deleted files in SQL passed here and failed on the live database.
  CREATE FUNCTION storage.protect_delete() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    IF coalesce(current_setting('storage.allow_delete_query', true), '') <> 'true' THEN
      RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END $$;
  CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects
    FOR EACH ROW EXECUTE FUNCTION storage.protect_delete();
  CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(name, '/') $$;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid
  $$;
  CREATE ROLE authenticated;
  CREATE ROLE anon;
  CREATE ROLE service_role BYPASSRLS;
`);

const file = (p) => readFileSync(`${ROOT}/${p}`, 'utf8');
for (const m of [
  'supabase/migrations/20260909010000_init.sql',
  'supabase/migrations/20260909010100_auth_bridge.sql',
  'supabase/migrations/20260909010200_rls.sql',
  'supabase/migrations/20260909020000_return_submission_stage.sql',
  'supabase/migrations/20260909020100_return_kpi.sql',
  'supabase/migrations/20260909030000_tugasan_stays_with_area_manager.sql',
  'supabase/migrations/20260909030100_returns_leave_admin.sql',
  'supabase/migrations/20260909030200_central_store_at_hq.sql',
  'supabase/migrations/20260909030300_grants.sql',
  'supabase/migrations/20260909030400_real_branches.sql',
  'supabase/migrations/20260910010000_sv_checklist.sql',
  'supabase/migrations/20260910010100_who_may_score.sql',
  'supabase/migrations/20260910020000_return_photos.sql',
  'supabase/migrations/20260910030000_mark_queries.sql',
  'supabase/migrations/20260910030100_reminders.sql',
  'supabase/migrations/20260916010000_branch_staff_management.sql',
  'supabase/migrations/20260916020000_tighten_grants.sql',
  'supabase/migrations/20260917010000_user_email.sql',
  'supabase/migrations/20260917020000_set_my_email.sql',
  'supabase/migrations/20260917030000_service_role_reads_users.sql',
  'supabase/migrations/20260918010000_auto_provision_logins.sql',
  'supabase/migrations/20260918020000_payroll_number_changes.sql',
  'supabase/migrations/20260918030000_manager_manages_outlets.sql',
  'supabase/migrations/20260918040000_report_views.sql',
  'supabase/migrations/20260919010000_payroll_number_shape.sql',
  'supabase/migrations/20260919020000_marks_open_until_verified.sql',
  'supabase/migrations/20260919030000_drop_mark_queries.sql',
  'supabase/migrations/20260919040000_assets_for_every_outlet.sql',
  'supabase/migrations/20260919050000_area_manager_hires_supervisors.sql',
  'supabase/migrations/20260919060000_label_spelling.sql',
  'supabase/migrations/20260919070000_supervisor_title.sql',
  'supabase/migrations/20260919080000_photo_files_leave_through_storage.sql',
]) {
  try { await db.exec(file(m)); console.log(`OK   ${m.split('/').pop()}`); }
  catch (e) { console.log(`FAIL ${m.split('/').pop()}\n     ${e.message}`); process.exit(1); }
}
// What admin does once, live, after 20260918010000: without it every INSERT
// into users — the seed included — refuses to create a person with no login.
await db.exec(`INSERT INTO login_settings (start_password) VALUES ('123456');`);

try { await db.exec(file('supabase/seed.sql')); console.log('OK   seed.sql'); }
catch (e) { console.log(`FAIL seed.sql\n     ${e.message}`); process.exit(1); }

// Only what Supabase genuinely provides: reach into the auth schema so
// auth.uid() is callable from a policy and from a query.
//
// Table privileges are NOT granted here on purpose. They used to be, and that
// hid a real bug — the migrations never granted them, so every policy was
// correct and every request still came back `42501 permission denied`. The
// grants now live in 20260909030300_grants.sql, where the database can be held
// to them.
await db.exec(`
  GRANT USAGE ON SCHEMA auth TO authenticated;
  GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
  GRANT USAGE ON SCHEMA storage TO authenticated;
  GRANT SELECT, INSERT, DELETE ON storage.objects TO authenticated;
  GRANT SELECT ON storage.buckets TO authenticated;
`);

// --- issue logins across every role shape and link them to their payroll rows.
// Herdi is the multi-outlet case: home DMC, plus DKB via user_branches.
const ACCOUNTS = {
  syahirah: ['11111111-1111-1111-1111-111111111111', 'WS0001', 'SV/AS, Machang'],
  farah:    ['22222222-2222-2222-2222-222222222222', 'AM0002', 'Area Mgr, DKB only'],
  hafiz:    ['33333333-3333-3333-3333-333333333333', 'ST0001', 'Store, HQ'],
  admin:    ['44444444-4444-4444-4444-444444444444', 'AD0001', 'Admin, cross-branch'],
  herdi:    ['55555555-5555-5555-5555-555555555555', 'AM0001', 'Area Mgr, DMC+DKB'],
  manager:  ['66666666-6666-6666-6666-666666666666', 'MG0001', 'Manager, no stor'],
  gm:       ['77777777-7777-7777-7777-777777777777', 'GM0001', 'General Manager'],
  hr:       ['88888888-8888-8888-8888-888888888888', 'HR0001', 'Human Resources'],
  syazana:  ['99999999-9999-9999-9999-999999999999', 'KP0093', 'Staff, Machang'],
  putri:    ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'KP0103', 'Staff, Machang (another person)'],
};
for (const [uuid, staffId] of Object.values(ACCOUNTS)) {
  await db.exec(`INSERT INTO auth.users (id) VALUES ('${uuid}');`);
  await db.exec(`UPDATE users SET auth_user_id = '${uuid}' WHERE id = '${staffId}';`);
}

// --- act as a signed-in user, exactly as PostgREST does per request.
async function as(uuid, sql) {
  await db.exec(`SET ROLE authenticated;`);
  await db.exec(`SELECT set_config('request.jwt.claims', '{"sub":"${uuid}"}', false);`);
  try { return await db.query(sql); }
  finally { await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claims','',false);`); }
}

let pass = 0, fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${ok ? '' : `\n        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`}`);
  ok ? pass++ : fail++;
};

console.log('\n=== reads are confined to the caller\'s branch ===');
for (const [who, [uuid, , desc]] of Object.entries(ACCOUNTS)) {
  const r = await as(uuid, `SELECT DISTINCT branch_id FROM users WHERE branch_id IS NOT NULL ORDER BY 1`);
  const seen = r.rows.map((x) => x.branch_id);
  // HQ is a branch like any other for staff listings; it just holds the central
  // store team rather than a kedai crew.
  const CROSS = ['admin', 'manager', 'gm', 'hr'];
  const expected = CROSS.includes(who)
    ? ['DKB', 'DMC', 'HQ']
    : who === 'herdi'
      ? ['DKB', 'DMC']
      : who === 'farah'
        ? ['DKB']
        : who === 'hafiz'
          ? ['HQ']
          : ['DMC'];
  check(`${desc.padEnd(22)} sees branches ${JSON.stringify(seen)}`, seen, expected);
}

console.log('\n=== the negative case: another branch is not merely hidden, it is unreachable ===');
{
  const r = await as(ACCOUNTS.syahirah[0], `SELECT count(*)::int n FROM users WHERE branch_id = 'DKB'`);
  check('Machang SV asking explicitly for DKB staff gets 0', r.rows[0].n, 0);

  const m = await as(ACCOUNTS.syahirah[0], `SELECT count(*)::int n FROM marks WHERE branch_id = 'DKB'`);
  check('Machang SV asking explicitly for DKB marks gets 0', m.rows[0].n, 0);

  const a = await as(ACCOUNTS.farah[0], `SELECT count(*)::int n FROM assets WHERE branch_id = 'DMC'`);
  check('DKB area manager asking for Machang assets gets 0', a.rows[0].n, 0);

  const t = await as(ACCOUNTS.farah[0], `SELECT count(*)::int n FROM tugasan_checks WHERE branch_id = 'DMC'`);
  check("DKB area manager cannot read Machang's tugasan", t.rows[0].n, 0);
}

console.log('\n=== everyone can still see their own record ===');
{
  const r = await as(ACCOUNTS.hafiz[0], `SELECT id FROM users WHERE auth_user_id = auth.uid()`);
  check('store staff reads own row', r.rows[0]?.id, 'ST0001');
}

console.log('\n=== views respect the caller, not their owner ===');
{
  const r = await as(ACCOUNTS.farah[0], `SELECT DISTINCT branch_id FROM return_turnaround ORDER BY 1`);
  check('return_turnaround scoped for DKB area manager', r.rows.map((x) => x.branch_id), ['DKB']);

  const c = await as(ACCOUNTS.syahirah[0], `SELECT count(*)::int n FROM mark_coverage WHERE branch_id = 'DKB'`);
  check('mark_coverage hides other branches', c.rows[0].n, 0);
}

console.log('\n=== the report_* views say what the reports app shows (20260918040000) ===');
{
  // The seed inserts people with joined_on = the day it ran. Pin it, so the
  // "due" population for September 2026 is the same whenever this suite runs.
  await db.exec(`UPDATE users SET joined_on = DATE '2026-01-01'`);

  const rules = await as(ACCOUNTS.gm[0],
    `SELECT (SELECT count(*)::int FROM scoring_rules) = (SELECT count(*)::int FROM branches) AS complete`);
  check('every branch now carries a scoring rule, so no report falls back to a constant', rules.rows[0].complete, true);
  await db.exec(`INSERT INTO branches (id, name, short_name) VALUES ('ZZT', 'Kedai Ujian', 'Ujian')`);
  check('...and a branch created later gets one on the spot, at the table default',
    (await as(ACCOUNTS.gm[0], `SELECT pass_threshold FROM scoring_rules WHERE branch_id = 'ZZT'`)).rows[0]?.pass_threshold, 80);

  // Machang, September 2026, the kedai form — REAL workbook figures.
  // Week 1: six of the eight pekerja were marked, five passed (KP0111 at 74%
  // did not), three were signed off by the manager.
  const w = await as(ACCOUNTS.gm[0],
    `SELECT week_no, headcount, marked, gaps, passed, avg_pct, verified, pass_threshold
       FROM report_branch_weekly
      WHERE branch_id = 'DMC' AND form_key = 'kedai' AND period_year = 2026 AND period_month = 9
      ORDER BY week_no`);
  const w1 = w.rows[0], w2 = w.rows[1];
  check('week 1 at Machang: 8 due, 6 marked, 2 gaps, 5 passed, avg 81, 3 verified, threshold 80',
    [w1.headcount, w1.marked, w1.gaps, w1.passed, w1.avg_pct, w1.verified, w1.pass_threshold], [8, 6, 2, 5, 81, 3, 80]);
  check('week 2: 3 marked, 5 gaps, 1 passed — the two who fell below 80 are findings, not hidden',
    [w2.marked, w2.gaps, w2.passed, w2.avg_pct], [3, 5, 1, 76]);
  check('a week nobody marked has avg_pct NULL, never 0', w.rows[2].avg_pct, null);

  // The monthly row re-aggregates the marks, not the rounded weekly averages.
  const m = await as(ACCOUNTS.gm[0],
    `SELECT marked, passed, avg_pct, verified, pass_rate_pct, verified_pct
       FROM report_branch_monthly
      WHERE branch_id = 'DMC' AND form_key = 'kedai' AND period_year = 2026 AND period_month = 9`);
  check('Machang for the month: 9 marked, 6 passed (67%), avg 79, 3 verified (33%)',
    [m.rows[0].marked, m.rows[0].passed, m.rows[0].pass_rate_pct, m.rows[0].avg_pct, m.rows[0].verified, m.rows[0].verified_pct],
    [9, 6, 67, 79, 3, 33]);

  // Coverage is over weeks that have started. Every started week must reconcile:
  // marked + gaps = headcount × due weeks, when nobody has transferred.
  const cov = await as(ACCOUNTS.gm[0],
    `SELECT headcount, due_weeks, marked, gaps, coverage_pct
       FROM report_branch_monthly
      WHERE branch_id = 'DMC' AND form_key = 'kedai' AND period_year = 2026 AND period_month = 9`);
  const c = cov.rows[0];
  check('coverage: marked + gaps = headcount × weeks started',
    c.marked + c.gaps, c.headcount * c.due_weeks);
  check('...and coverage_pct is that share',
    c.coverage_pct, Math.round(((c.headcount * c.due_weeks - c.gaps) * 100) / (c.headcount * c.due_weeks)));

  // The manager's adjusted total is the score the phone app shows, so it is
  // the score the report judges. KP0111 week 1 scored 81/110 = 74% (a fail);
  // the manager verifies it up to 90/110 = 82%.
  await db.exec(`INSERT INTO mark_verifications (mark_id, verified_by, adjusted_to)
                 SELECT id, 'AM0001', 90 FROM marks WHERE user_id = 'KP0111' AND period_month = 9 AND week_no = 1`);
  const adj = await as(ACCOUNTS.gm[0],
    `SELECT pct, final_pct, is_pass, is_verified FROM report_marks
      WHERE user_id = 'KP0111' AND period_year = 2026 AND period_month = 9 AND week_no = 1`);
  check('an adjusted mark reports the adjusted percentage and passes on it',
    [adj.rows[0].pct, adj.rows[0].final_pct, adj.rows[0].is_pass, adj.rows[0].is_verified], [74, 82, true, true]);
  const staff = await as(ACCOUNTS.gm[0],
    `SELECT w1_pct, passed_weeks, verified_weeks FROM report_staff_monthly
      WHERE user_id = 'KP0111' AND period_year = 2026 AND period_month = 9`);
  check("...and the person's monthly row shows the same figure",
    [staff.rows[0].w1_pct, staff.rows[0].passed_weeks, staff.rows[0].verified_weeks], [82, 1, 1]);
  await db.exec(`DELETE FROM mark_verifications WHERE mark_id IN
                 (SELECT id FROM marks WHERE user_id = 'KP0111' AND period_month = 9 AND week_no = 1)`);

  // Unmarked people are rows, not absences: the two Machang pekerja with no
  // September mark appear with four NULL weeks, ranked last.
  const unmarked = await as(ACCOUNTS.gm[0],
    `SELECT user_id, avg_pct, marked_weeks, rank_in_branch FROM report_staff_monthly
      WHERE branch_id = 'DMC' AND form_key = 'kedai' AND period_year = 2026 AND period_month = 9
      ORDER BY rank_in_branch, user_id`);
  check('all eight Machang pekerja are listed for September', unmarked.rows.length, 8);
  check('...the unmarked two at the bottom, with no average invented for them',
    unmarked.rows.slice(-2).map((r) => [r.user_id, r.avg_pct, r.marked_weeks]),
    [['KP0110', null, 0], ['MY0644', null, 0]]);
  check('...and Syazana, 86%, ranks first', [unmarked.rows[0].user_id, unmarked.rows[0].rank_in_branch], ['KP0093', 1]);

  // An inactive person leaves every denominator and keeps their marks.
  await db.exec(`UPDATE users SET active = false WHERE id = 'MY0644'`);
  const after = await as(ACCOUNTS.gm[0],
    `SELECT headcount, gaps FROM report_branch_weekly
      WHERE branch_id = 'DMC' AND form_key = 'kedai' AND period_year = 2026 AND period_month = 9 AND week_no = 1`);
  check('deactivating an unmarked person drops them from headcount and gaps alike',
    [after.rows[0].headcount, after.rows[0].gaps], [7, 1]);
  await db.exec(`UPDATE users SET active = false WHERE id = 'MY0606'`);
  const kept = await as(ACCOUNTS.gm[0],
    `SELECT marked FROM report_branch_weekly
      WHERE branch_id = 'DMC' AND form_key = 'kedai' AND period_year = 2026 AND period_month = 9 AND week_no = 1`);
  check("...while a marked person who leaves keeps their mark in the outlet's count", kept.rows[0].marked, 6);
  await db.exec(`UPDATE users SET active = true WHERE id IN ('MY0644', 'MY0606')`);

  // Company rows are sums of outlet rows, ratios re-derived from the sums.
  const co = await as(ACCOUNTS.gm[0],
    `SELECT headcount, marked, gaps, passed, pass_rate_pct FROM report_company_monthly
      WHERE form_key = 'kedai' AND period_year = 2026 AND period_month = 9`);
  check('company kedai, September: 11 due across Machang and Kota Bharu, 12 marked, 8 passed = 67%',
    [co.rows[0].headcount, co.rows[0].marked, co.rows[0].passed, co.rows[0].pass_rate_pct], [11, 12, 8, 67]);

  // Returns: the month a list was received in. Machang, August 2026: one
  // list, handed over on time, cleared in ten days.
  const ret = await as(ACCOUNTS.hr[0],
    `SELECT received, submitted_on_time, submission_pct, open, avg_turnaround_days::float AS days
       FROM report_returns_branch_monthly WHERE branch_id = 'DMC' AND year = 2026 AND month = 8`);
  check('Machang returns, August: 1 received, on time, cleared in 10 days',
    [ret.rows[0].received, ret.rows[0].submitted_on_time, ret.rows[0].submission_pct, ret.rows[0].open, ret.rows[0].days],
    [1, 1, 100, 0, 10]);
  const open = await as(ACCOUNTS.hr[0],
    `SELECT ref, status, supplier_name, last_stage FROM report_returns_open WHERE ref IN ('PR0005', 'PR0006') ORDER BY ref`);
  check('the open list carries the ageing state, the supplier and the last stage reached',
    open.rows.map((r) => [r.ref, r.status, r.supplier_name, r.last_stage]),
    [['PR0005', 'breach', 'Munchy Food Industries', 'segregated'],
     ['PR0006', 'overdue', 'Life Food Industries', 'submitted_to_clerk']]);

  // Tugasan, the one month Herdi filled: four weeks stamped, none checked.
  const tg = await as(ACCOUNTS.gm[0],
    `SELECT weeks_filled, weeks_checked, items_done, items_total FROM report_tugasan_branch_monthly
      WHERE branch_id = 'DMC' AND period_year = 2026 AND period_month = 8`);
  check('Machang tugasan, August: 4 weeks filled, 0 checked, 8 of 8 items',
    [tg.rows[0].weeks_filled, tg.rows[0].weeks_checked, tg.rows[0].items_done, tg.rows[0].items_total], [4, 0, 8, 8]);

  // The views widen nobody's reach.
  const sv = await as(ACCOUNTS.syahirah[0], `SELECT DISTINCT branch_id FROM report_branch_weekly ORDER BY 1`);
  check('a supervisor reads the outlet report for their own outlet only', sv.rows.map((r) => r.branch_id), ['DMC']);
  const mgrStor = await as(ACCOUNTS.manager[0], `SELECT count(*)::int n FROM report_marks WHERE form_key = 'stor'`);
  check('the cross-branch manager still sees no stor mark through them', mgrStor.rows[0].n, 0);
  const admRet = await as(ACCOUNTS.admin[0], `SELECT count(*)::int n FROM report_returns_open`);
  check('admin still sees no return through them', admRet.rows[0].n, 0);
  const hrAll = await as(ACCOUNTS.hr[0], `SELECT DISTINCT branch_id FROM report_branch_weekly WHERE marked > 0 ORDER BY 1`);
  check('HR reads every outlet that has marks, the stor side included', hrAll.rows.map((r) => r.branch_id), ['DKB', 'DMC', 'HQ']);

  await db.exec(`DELETE FROM branches WHERE id = 'ZZT'`);
}

console.log('\n=== writes are gated by role as well as branch ===');
const tryWrite = async (uuid, sql) => {
  try { await as(uuid, sql); return 'allowed'; } catch { return 'blocked'; }
};
check('SV/AS may insert a mark in own branch',
  await tryWrite(ACCOUNTS.syahirah[0],
    `INSERT INTO marks (user_id,branch_id,form_key,period_year,period_month,week_no,total_score,max_score)
     VALUES ('KP0110','DMC','kedai',2026,9,3,88,110)`), 'allowed');

check('SV/AS may NOT insert a mark in another branch',
  await tryWrite(ACCOUNTS.syahirah[0],
    `INSERT INTO marks (user_id,branch_id,form_key,period_year,period_month,week_no,total_score,max_score)
     VALUES ('KP0201','DKB','kedai',2026,9,3,88,110)`), 'blocked');

check('store staff may NOT insert a mark at all',
  await tryWrite(ACCOUNTS.hafiz[0],
    `INSERT INTO marks (user_id,branch_id,form_key,period_year,period_month,week_no,total_score,max_score)
     VALUES ('KP0111','DMC','kedai',2026,9,4,88,110)`), 'blocked');

check('store staff may log a return in own branch',
  await tryWrite(ACCOUNTS.hafiz[0],
    `INSERT INTO returns (ref,branch_id,bill_no,bill_date,reason)
     VALUES ('PR9001','DMC','BR-9001',DATE '2026-09-09','damage')`), 'allowed');

// Since 20260916 an SV/AS may add pekerja kedai at their own outlet (the full
// boundary is tested in its own section below); every other kind of user
// row is still admin's to create.
check('SV/AS may NOT create a user of any role but pekerja kedai',
  await tryWrite(ACCOUNTS.syahirah[0],
    `INSERT INTO users (id,name,short_name,initials,role,branch_id)
     VALUES ('WS9999','Test','Test','TT','supervisor','DMC')`), 'blocked');

check('admin may create a user',
  await tryWrite(ACCOUNTS.admin[0],
    `INSERT INTO users (id,name,short_name,initials,role,branch_id)
     VALUES ('KP9998','Test Two','Test T.','TT','staff','DMC')`), 'allowed');

console.log('\n=== rule 1: submission is scored on-time over received ===');
{
  const r = await as(ACCOUNTS.hafiz[0],
    `SELECT ref, due_on::text, is_on_time, is_submitted FROM return_submission
     WHERE ref IN ('PR0003','PR0004') ORDER BY ref`);
  const sat = r.rows.find((x) => x.ref === 'PR0003');
  check('Saturday arrival gets the FOLLOWING Friday as its deadline', sat.due_on, '2026-09-11');
  check('...and handing it over on Monday counts as on time', sat.is_on_time, true);
  check('a list never handed over is not submitted',
    r.rows.find((x) => x.ref === 'PR0004').is_submitted, false);

  // Scored over the fixed-date lists only. The two aged rows are seeded relative
  // to CURRENT_DATE, so their weekday — and therefore their Friday deadline —
  // shifts daily; including them would make this assertion flaky.
  const k = await as(ACCOUNTS.hafiz[0],
    `SELECT count(*)::int recv,
            count(*) FILTER (WHERE is_on_time)::int ok,
            round(count(*) FILTER (WHERE is_on_time) * 100.0 / count(*))::int pct
     FROM return_submission
     WHERE ref IN ('PR0001','PR0002','PR0003','PR0004')`);
  check(`three of four on time scores 75%`, [k.rows[0].ok, k.rows[0].recv, k.rows[0].pct], [3, 4, 75]);

  // The rule as the user stated it: 8 of 10 submitted is 80%.
  const worked = await as(ACCOUNTS.admin[0],
    `SELECT round(8 * 100.0 / 10)::int AS pct`);
  check('stated example: 8 of 10 scores 80%', worked.rows[0].pct, 80);
}

console.log('\n=== rules 2 and 3: two-month ceiling, one-week grace ===');
{
  const r = await as(ACCOUNTS.hafiz[0],
    `SELECT ref, age_days, status FROM return_ageing
     WHERE ref IN ('PR0004','PR0005','PR0006') ORDER BY ref`);
  const by = Object.fromEntries(r.rows.map((x) => [x.ref, x]));
  check('a fresh list is ok', by.PR0004.status, 'ok');
  check(`65 days old is in breach, still inside the week to clear`, by.PR0005.status, 'breach');
  check(`75 days old is overdue, the week is gone`, by.PR0006.status, 'overdue');

  const c = await as(ACCOUNTS.hafiz[0],
    `SELECT (clear_by - limit_on)::int AS grace FROM return_ageing WHERE ref = 'PR0005'`);
  check('grace window is exactly one week', c.rows[0].grace, 7);
}

console.log('\n=== the KPI views stay branch-scoped ===');
{
  const r = await as(ACCOUNTS.farah[0],
    `SELECT count(*)::int n FROM return_ageing WHERE branch_id = 'DMC'`);
  check('DKB area manager cannot read Machang ageing', r.rows[0].n, 0);
  const s = await as(ACCOUNTS.farah[0],
    `SELECT count(*)::int n FROM return_submission_kpi WHERE branch_id = 'DMC'`);
  check('DKB area manager cannot read Machang submission KPI', s.rows[0].n, 0);
}

console.log('\n=== an Area Manager reaches every outlet assigned to them ===');
{
  const r = await as(ACCOUNTS.herdi[0],
    `SELECT DISTINCT branch_id FROM assets WHERE branch_id IS NOT NULL ORDER BY 1`);
  check('Herdi reads assets at both his outlets', r.rows.map((x) => x.branch_id), ['DKB', 'DMC']);

  // The reverse direction is what proves user_branches is doing the work rather
  // than the role alone: Farah holds the same role and reaches only her own.
  const f = await as(ACCOUNTS.farah[0],
    `SELECT DISTINCT branch_id FROM assets WHERE branch_id IS NOT NULL ORDER BY 1`);
  check('Farah, same role, reaches only DKB', f.rows.map((x) => x.branch_id), ['DKB']);

  // The asset log used to exist for the two seeded outlets only, so an Area
  // Manager posted anywhere else opened an empty tab. Every outlet carries
  // the ten catalogue rows now, HQ none, and a new outlet gets them on insert.
  const catalogue = await db.query(
    `SELECT count(*)::int outlets, min(n) AS fewest, max(n) AS most
       FROM (SELECT b.id, count(a.id) AS n FROM branches b
              LEFT JOIN assets a ON a.branch_id = b.id
             WHERE b.id <> 'HQ' GROUP BY b.id) x`);
  check('every outlet carries the full asset catalogue',
    [catalogue.rows[0].outlets, catalogue.rows[0].fewest, catalogue.rows[0].most], [38, 10, 10]);
  const hqAssets = await db.query(`SELECT count(*)::int n FROM assets WHERE branch_id = 'HQ'`);
  check('...and HQ, which is not a kedai, carries none', hqAssets.rows[0].n, 0);
  const dmcJ = await db.query(`SELECT count(*)::int n FROM assets WHERE branch_id = 'DMC' AND name LIKE 'J) LAIN-LAIN%'`);
  check('Machang keeps a single J) LAIN-LAIN row', dmcJ.rows[0].n, 1);
  await db.exec(`INSERT INTO branches (id, name, short_name) VALUES ('ZZA', 'Kedai Ujian Aset', 'Ujian Aset')`);
  const fresh = await db.query(`SELECT count(*)::int n FROM assets WHERE branch_id = 'ZZA'`);
  check('a new outlet gets the catalogue the moment it is created', fresh.rows[0].n, 10);
  await db.exec(`DELETE FROM branches WHERE id = 'ZZA'`);

  check('Herdi may write tugasan at his assigned second outlet',
    await tryWrite(ACCOUNTS.herdi[0],
      `INSERT INTO tugasan_checks (branch_id,period_year,period_month,week_no,item_key,done,note,inspected_on)
       VALUES ('DKB',2026,9,1,'peti_cash',true,'RM3,000',DATE '2026-09-04')`), 'allowed');

  check('Farah may NOT write tugasan at an outlet she does not cover',
    await tryWrite(ACCOUNTS.farah[0],
      `INSERT INTO tugasan_checks (branch_id,period_year,period_month,week_no,item_key,done,note,inspected_on)
       VALUES ('DMC',2026,9,2,'peti_cash',true,'RM3,000',DATE '2026-09-11')`), 'blocked');

  check('user_branches rejects a role that is not area_manager',
    await tryWrite(ACCOUNTS.admin[0],
      `INSERT INTO user_branches (user_id,branch_id) VALUES ('WS0001','DKB')`), 'blocked');

  // The exact pair of writes the "Akaun baharu" form makes for a new Area
  // Manager covering more than one outlet: the row, then the extra coverage.
  check('admin posts a new Area Manager to a home outlet',
    await tryWrite(ACCOUNTS.admin[0],
      `INSERT INTO users (id,name,short_name,initials,role,branch_id)
       VALUES ('AM0900','Azlan bin Ismail','Azlan','AI','area_manager','DMC')`), 'allowed');
  check('...and adds a second outlet through user_branches',
    await tryWrite(ACCOUNTS.admin[0],
      `INSERT INTO user_branches (user_id,branch_id) VALUES ('AM0900','DKB')`), 'allowed');
  check('a supervisor may NOT hand an Area Manager another outlet',
    await tryWrite(ACCOUNTS.syahirah[0],
      `INSERT INTO user_branches (user_id,branch_id) VALUES ('AM0900','DPM')`), 'blocked');
  // Give the new person a login and look through their eyes: the second
  // outlet must be reachable, and a third must not.
  const azlan = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  await db.exec(`INSERT INTO auth.users (id) VALUES ('${azlan}');`);
  await db.exec(`UPDATE users SET auth_user_id = '${azlan}' WHERE id = 'AM0900';`);
  const seen = await as(azlan,
    `SELECT DISTINCT branch_id FROM users WHERE branch_id IS NOT NULL ORDER BY 1`);
  check('...and the new Area Manager sees exactly those two outlets',
    seen.rows.map((x) => x.branch_id), ['DKB', 'DMC']);
}

console.log('\n=== manager is cross-branch on kedai, and blind to the stor side ===');
{
  const m = await as(ACCOUNTS.manager[0],
    `SELECT DISTINCT branch_id FROM marks WHERE form_key = 'kedai' ORDER BY 1`);
  check('manager reads kedai marks at every branch', m.rows.map((x) => x.branch_id), ['DKB', 'DMC']);

  const stor = await as(ACCOUNTS.manager[0],
    `SELECT count(*)::int n FROM marks WHERE form_key = 'stor'`);
  check('manager cannot read a single 17-perkara stor mark', stor.rows[0].n, 0);

  const ret = await as(ACCOUNTS.manager[0], `SELECT count(*)::int n FROM returns`);
  check('manager cannot read returns at all', ret.rows[0].n, 0);

  const ev = await as(ACCOUNTS.manager[0], `SELECT count(*)::int n FROM return_events`);
  check('...nor the stage events behind them', ev.rows[0].n, 0);

  const kpi = await as(ACCOUNTS.manager[0], `SELECT count(*)::int n FROM return_ageing`);
  check('...nor the ageing KPI built on them', kpi.rows[0].n, 0);

  // Since 20260918030000 the Manager acts as an Area Manager over every
  // outlet: scores SV/AS, verifies, fills Tugasan, tracks assets, sends
  // reminders — at any outlet, without a user_branches row.
  check('manager may score a supervisor at any outlet (20260918030000)',
    await tryWrite(ACCOUNTS.manager[0],
      `INSERT INTO marks (user_id,branch_id,form_key,period_year,period_month,week_no,total_score,max_score,scored_by)
       VALUES ('WS0012','DKB','sv',2026,9,1,70,85,'MG0001')`), 'allowed');
  check('...and write the per-perkara lines behind it',
    await tryWrite(ACCOUNTS.manager[0],
      `INSERT INTO mark_lines (mark_id, line_id, score)
       SELECT m.id, l.id, 4 FROM marks m, checklist_lines l
        JOIN checklist_categories c ON c.id = l.category_id
        WHERE m.user_id = 'WS0012' AND m.period_month = 9 AND m.week_no = 1
          AND c.form_key = 'sv' AND c.position = 1 AND l.position = 1`), 'allowed');
  check('...and correct a kedai mark at an outlet nobody assigned to them',
    await tryWrite(ACCOUNTS.manager[0],
      `UPDATE marks SET note = 'disemak pengurus' WHERE user_id = 'KP0201' AND period_month = 9 AND week_no = 1`), 'allowed');
  check('...and verify one',
    await tryWrite(ACCOUNTS.manager[0],
      `INSERT INTO mark_verifications (mark_id, verified_by)
       SELECT m.id, 'MG0001' FROM marks m
        WHERE m.form_key = 'kedai' AND m.branch_id = 'DKB'
          AND NOT EXISTS (SELECT 1 FROM mark_verifications v WHERE v.mark_id = m.id) LIMIT 1`), 'allowed');
  check('...and fill Tugasan at any outlet',
    await tryWrite(ACCOUNTS.manager[0],
      `INSERT INTO tugasan_checks (branch_id,period_year,period_month,week_no,item_key,done,note,inspected_on)
       VALUES ('DKB',2026,9,3,'x_report',true,'ok',DATE '2026-09-18')`), 'allowed');
  check('...and send a reminder',
    await tryWrite(ACCOUNTS.manager[0],
      `INSERT INTO reminders (branch_id, recipient_id, sent_by, message)
       VALUES ('DKB', 'WS0012', 'MG0001', 'Minggu 3 belum dinilai')`), 'allowed');

  // The stor side stays shut even for writes: no scoring a pekerja stor.
  check('...but still may NOT score a pekerja stor — the stor side stays shut',
    await tryWrite(ACCOUNTS.manager[0],
      `INSERT INTO marks (user_id,branch_id,form_key,period_year,period_month,week_no,total_score,max_score,scored_by)
       VALUES ('ST0002','HQ','stor',2026,9,4,60,85,'MG0001')`), 'blocked');
}

console.log('\n=== general manager and HR write operational data anywhere ===');
{
  const r = await as(ACCOUNTS.gm[0], `SELECT count(*)::int n FROM returns WHERE branch_id = 'DMC'`);
  check('GM reads the stor side the manager cannot', r.rows[0].n > 0, true);

  const stor = await as(ACCOUNTS.hr[0], `SELECT count(*)::int n FROM marks WHERE form_key = 'stor'`);
  check('HR reads stor marks too', stor.rows[0].n > 0, true);

  check('GM may insert a mark in a branch they have no posting to',
    await tryWrite(ACCOUNTS.gm[0],
      `INSERT INTO marks (user_id,branch_id,form_key,period_year,period_month,week_no,total_score,max_score)
       VALUES ('KP0202','DKB','kedai',2026,9,2,95,110)`), 'allowed');

  check('HR may sign off a mark verification cross-branch',
    await tryWrite(ACCOUNTS.hr[0],
      `INSERT INTO mark_verifications (mark_id, verified_by)
       SELECT m.id, 'HR0001' FROM marks m WHERE m.branch_id = 'DKB' AND m.form_key = 'kedai'
        AND NOT EXISTS (SELECT 1 FROM mark_verifications v WHERE v.mark_id = m.id) LIMIT 1`), 'allowed');

  // The line between head office and admin: operational data yes, the staff
  // directory no.
  check('GM may NOT create a user — that stays admin',
    await tryWrite(ACCOUNTS.gm[0],
      `INSERT INTO users (id,name,short_name,initials,role,branch_id)
       VALUES ('KP9997','Test Three','Test Th.','TT','staff','DMC')`), 'blocked');

  check('HR may NOT create a branch either',
    await tryWrite(ACCOUNTS.hr[0],
      `INSERT INTO branches (id,name,short_name) VALUES ('TMP','Tempatan','Tempatan')`), 'blocked');
}

console.log('');
console.log('=== the SV/AS form exists and the Area Manager may score it ===');
{
  const form = await as(ACCOUNTS.herdi[0],
    `SELECT f.key, f.applies_to,
            (SELECT count(*)::int FROM checklist_categories c WHERE c.form_key = f.key) AS kategori,
            (SELECT count(*)::int FROM checklist_lines l
               JOIN checklist_categories c ON c.id = l.category_id
              WHERE c.form_key = f.key) AS lines
       FROM checklist_forms f WHERE f.key = 'sv'`);
  check('the sv form is registered against the supervisor role',
    [form.rows[0]?.applies_to, form.rows[0]?.kategori, form.rows[0]?.lines],
    ['supervisor', 14, 19]);

  // The workbook's NAMA row above every SV week reads HERDI, so the Area
  // Manager is the scorer — a policy that allowed only supervisors refused the
  // one person who actually does it.
  check('an Area Manager may score a supervisor at their own outlet',
    await tryWrite(ACCOUNTS.herdi[0],
      `INSERT INTO marks (user_id,branch_id,form_key,period_year,period_month,week_no,total_score,max_score,scored_by)
       VALUES ('WS0001','DMC','sv',2026,9,3,68,85,'AM0001')`), 'allowed');

  // 85 is 17 x 5: two perkara are N/A all year, and the maximum moves with them
  // rather than the blanks being counted as zero.
  const m = await as(ACCOUNTS.herdi[0],
    `SELECT total_score, max_score, pct FROM marks
      WHERE user_id='WS0001' AND period_month=9 AND week_no=3`);
  check('a week with two N/A perkara is scored out of 85, not 95',
    [m.rows[0].total_score, m.rows[0].max_score, m.rows[0].pct], [68, 85, 80]);

  check('an Area Manager may NOT score a supervisor at an outlet they do not cover',
    await tryWrite(ACCOUNTS.farah[0],
      `INSERT INTO marks (user_id,branch_id,form_key,period_year,period_month,week_no,total_score,max_score,scored_by)
       VALUES ('WS0001','DMC','sv',2026,9,4,68,85,'AM0002')`), 'blocked');

  const seen = await as(ACCOUNTS.syahirah[0],
    `SELECT count(*)::int n FROM marks WHERE user_id='WS0001' AND form_key='sv'`);
  check('the supervisor can read their own sv mark', seen.rows[0].n, 1);
}

  // The bug this section exists for: marks_insert allowed the Area Manager and
  // mark_lines_write did not, so a mark landed with no per-perkara detail.
  const markId = await as(ACCOUNTS.herdi[0],
    `SELECT id FROM marks WHERE user_id='WS0001' AND period_month=9 AND week_no=3`);
  const lineId = await as(ACCOUNTS.herdi[0],
    `SELECT l.id FROM checklist_lines l
       JOIN checklist_categories c ON c.id = l.category_id
      WHERE c.form_key='sv' LIMIT 1`);

  check('an Area Manager may write the lines behind a mark they made',
    await tryWrite(ACCOUNTS.herdi[0],
      `INSERT INTO mark_lines (mark_id, line_id, score)
       VALUES (${markId.rows[0].id}, ${lineId.rows[0].id}, 4)`), 'allowed');

  check('a supervisor may still write lines on the marks they make',
    await tryWrite(ACCOUNTS.syahirah[0],
      `INSERT INTO mark_lines (mark_id, line_id, score)
       SELECT m.id, ${lineId.rows[0].id}, 4 FROM marks m
        WHERE m.user_id='KP0110' AND m.form_key='kedai' LIMIT 1`), 'allowed');



console.log('\n=== the central store reaches every outlet\'s returns ===');
{
  // The store team is posted to HQ, but returns carry the outlet the goods came
  // from. Scoping them to their own branch would show them nothing at all.
  const own = await as(ACCOUNTS.hafiz[0], `SELECT DISTINCT branch_id FROM returns ORDER BY 1`);
  check('HQ store staff read returns from every outlet',
    own.rows.map((x) => x.branch_id), ['DKB', 'DMC']);

  check('...and may log one against an outlet that is not their own branch',
    await tryWrite(ACCOUNTS.hafiz[0],
      `INSERT INTO returns (ref,branch_id,bill_no,bill_date,reason)
       VALUES ('PR9200','DKB','BR-9200',DATE '2026-09-09','damage')`), 'allowed');

  // The reach is returns-only: their own marks stay scoped to HQ.
  const m = await as(ACCOUNTS.hafiz[0], `SELECT DISTINCT branch_id FROM marks ORDER BY 1`);
  check('...while their marks stay at HQ', m.rows.map((x) => x.branch_id), ['HQ']);

  // An Area Manager is still confined to the outlets assigned to them.
  const f = await as(ACCOUNTS.farah[0], `SELECT DISTINCT branch_id FROM returns ORDER BY 1`);
  check('an Area Manager is not swept along with them', f.rows.map((x) => x.branch_id), ['DKB']);
}

console.log('\n=== returns are operational, so admin is out of them ===');
{
  const r = await as(ACCOUNTS.admin[0], `SELECT count(*)::int n FROM returns`);
  check('admin cannot read returns', r.rows[0].n, 0);

  const e = await as(ACCOUNTS.admin[0], `SELECT count(*)::int n FROM return_events`);
  check('...nor the stage events', e.rows[0].n, 0);

  const k = await as(ACCOUNTS.admin[0], `SELECT count(*)::int n FROM return_ageing`);
  check('...nor the ageing report that used to be an admin screen', k.rows[0].n, 0);

  check('admin may NOT log a return',
    await tryWrite(ACCOUNTS.admin[0],
      `INSERT INTO returns (ref,branch_id,bill_no,bill_date,reason)
       VALUES ('PR9100','DMC','BR-9100',DATE '2026-09-09','damage')`), 'blocked');

  // Admin keeps the stor *marks*: this change is about returns only.
  const m = await as(ACCOUNTS.admin[0], `SELECT count(*)::int n FROM marks WHERE form_key = 'stor'`);
  check('admin still reads stor marks', m.rows[0].n > 0, true);
}

console.log('\n=== HR runs the returns side end to end ===');
{
  const r = await as(ACCOUNTS.hr[0], `SELECT count(*)::int n FROM returns`);
  check('HR reads returns at every outlet', r.rows[0].n > 0, true);

  const a = await as(ACCOUNTS.hr[0], `SELECT count(*)::int n FROM return_ageing`);
  check('HR reads the ageing report', a.rows[0].n > 0, true);

  const f = await as(ACCOUNTS.hr[0], `SELECT count(*)::int n FROM return_stage_gaps`);
  check('HR reads the stage-gap flow view', f.rows[0].n > 0, true);

  const marks = await as(ACCOUNTS.hr[0],
    `SELECT count(DISTINCT user_id)::int n FROM marks`);
  check('HR reads individual staff marks', marks.rows[0].n > 0, true);

  check('HR may advance a return',
    await tryWrite(ACCOUNTS.hr[0],
      `INSERT INTO returns (ref,branch_id,bill_no,bill_date,reason)
       VALUES ('PR9101','DKB','BR-9101',DATE '2026-09-09','expired')`), 'allowed');
}

console.log('\n=== the tugasan self-check stays with the Area Manager ===');
{
  // Head office watches whether it was filled in, and cannot fill it in.
  const r = await as(ACCOUNTS.gm[0], `SELECT count(*)::int n FROM tugasan_checks`);
  check('GM reads the tugasan of every outlet', r.rows[0].n > 0, true);

  check('GM may NOT fill in a tugasan check',
    await tryWrite(ACCOUNTS.gm[0],
      `INSERT INTO tugasan_checks (branch_id,period_year,period_month,week_no,item_key,done,note,inspected_on)
       VALUES ('DMC',2026,10,1,'peti_cash',true,'RM9,000',DATE '2026-10-02')`), 'blocked');

  check('HR may NOT sign off a tugasan month either',
    await tryWrite(ACCOUNTS.hr[0],
      `INSERT INTO tugasan_signoffs (branch_id,period_year,period_month,week_no,filled_by)
       VALUES ('DKB',2026,10,1,'HR0001')`), 'blocked');

  check('the Area Manager still can',
    await tryWrite(ACCOUNTS.herdi[0],
      `INSERT INTO tugasan_checks (branch_id,period_year,period_month,week_no,item_key,done,note,inspected_on)
       VALUES ('DMC',2026,10,1,'peti_cash',true,'RM9,000',DATE '2026-10-02')`), 'allowed');
}

console.log('');
console.log('=== photo evidence is bounded, and scoped like the bill it belongs to ===');
{
  const dmc = await as(ACCOUNTS.hafiz[0], `SELECT id FROM returns WHERE branch_id='DMC' LIMIT 1`);
  const kbr = await as(ACCOUNTS.hafiz[0], `SELECT id FROM returns WHERE branch_id='DKB' LIMIT 1`);
  const rid = dmc.rows[0].id;

  const bucket = await as(ACCOUNTS.hafiz[0],
    `SELECT public, file_size_limit FROM storage.buckets WHERE id='return-photos'`);
  check('the bucket is private and refuses anything over 1 MB',
    [bucket.rows[0]?.public, Number(bucket.rows[0]?.file_size_limit)], [false, 1048576]);

  check('the stor team may attach a photo',
    await tryWrite(ACCOUNTS.hafiz[0],
      `INSERT INTO return_photos (return_id, storage_path, uploaded_by)
       VALUES (${rid}, 'DMC/PR0001/a.jpg', 'ST0001')`), 'allowed');

  check('...and a second',
    await tryWrite(ACCOUNTS.hafiz[0],
      `INSERT INTO return_photos (return_id, storage_path, uploaded_by)
       VALUES (${rid}, 'DMC/PR0001/b.jpg', 'ST0001')`), 'allowed');

  // The storage bill is what pays for a third.
  check('but not a third — two per bill is the cap',
    await tryWrite(ACCOUNTS.hafiz[0],
      `INSERT INTO return_photos (return_id, storage_path, uploaded_by)
       VALUES (${rid}, 'DMC/PR0001/c.jpg', 'ST0001')`), 'blocked');

  // Same predicates as the bill itself: manager and admin are shut out of
  // returns, so they are shut out of the evidence too.
  const mgr = await as(ACCOUNTS.manager[0], `SELECT count(*)::int n FROM return_photos`);
  check('the cross-branch manager cannot see return photos', mgr.rows[0].n, 0);
  const adm = await as(ACCOUNTS.admin[0], `SELECT count(*)::int n FROM return_photos`);
  check('nor can admin', adm.rows[0].n, 0);
  const hr = await as(ACCOUNTS.hr[0], `SELECT count(*)::int n FROM return_photos`);
  check('HR can, because HR runs the returns side', hr.rows[0].n, 2);

  // An Area Manager sees the outlets they cover and no others.
  const farah = await as(ACCOUNTS.farah[0], `SELECT count(*)::int n FROM return_photos`);
  check('an Area Manager sees photos only for the outlets they cover', farah.rows[0].n, 0);

  // Files leave through the Storage API only (20260919080000). The harness
  // guards storage.objects the way Supabase does, so SQL that deletes a file
  // fails here exactly as it failed live.
  await db.exec(`INSERT INTO storage.objects (bucket_id, name) VALUES ('return-photos', 'guard-probe.jpg')`);
  check('a plain SQL DELETE on a file is refused, as Supabase refuses it',
    await db.query(`DELETE FROM storage.objects WHERE name = 'guard-probe.jpg'`).then(() => 'allowed', () => 'blocked'),
    'blocked');

  // The files behind the two rows, as a real upload leaves them.
  await db.exec(`INSERT INTO storage.objects (bucket_id, name, created_at) VALUES
    ('return-photos', 'DMC/PR0001/a.jpg', now() - interval '2 days'),
    ('return-photos', 'DMC/PR0001/b.jpg', now())`);

  // "Buang" used to be refused whole: the row's trigger tried to take the file
  // with it in SQL. The app now removes the file first, then the row.
  check('the stor team may remove a photo row',
    await tryWrite(ACCOUNTS.hafiz[0], `DELETE FROM return_photos WHERE storage_path = 'DMC/PR0001/b.jpg'`), 'allowed');

  // Retention asks the database what is due; the Edge Function does the removing.
  const due = async (afterDays) => {
    await db.exec(`SET ROLE service_role;`);
    try {
      return (await db.query(
        `SELECT photo_id IS NOT NULL AS has_row, storage_path FROM return_photos_due_for_purge(${afterDays}) ORDER BY storage_path`)).rows;
    } finally {
      await db.exec(`RESET ROLE;`);
    }
  };
  const age = (await db.query(
    `SELECT CURRENT_DATE - occurred_on AS days FROM return_events e JOIN returns r ON r.id = e.return_id
      WHERE r.ref = 'PR0001' AND e.stage = 'adjusted'`)).rows[0].days;

  check('a cleared bill\'s evidence is not due before its time', await due(age), []);
  check('...and is due the day after',
    await due(age - 1), [{ has_row: true, storage_path: 'DMC/PR0001/a.jpg' }]);

  // A file with no row: an upload whose row was refused, a row deleted before
  // the fix, the sample data cleared earlier. Swept, but not while an upload
  // may still be writing its row.
  await db.exec(`INSERT INTO storage.objects (bucket_id, name, created_at) VALUES
    ('return-photos', 'DMC/PR0009/stray.jpg', now() - interval '2 days'),
    ('return-photos', 'DMC/PR0009/just-now.jpg', now())`);
  // a.jpg is two days old too but still has its row, so it is not a stray.
  check('a file with no row is swept once it is a day old, and a fresh one is left alone',
    await due(365), [{ has_row: false, storage_path: 'DMC/PR0009/stray.jpg' }]);

  check('nobody signed in may ask — it reads every outlet\'s folder',
    await tryWrite(ACCOUNTS.admin[0], `SELECT * FROM return_photos_due_for_purge(30)`), 'blocked');

  // The Storage API's own path, which the guard lets through.
  await db.exec(`SELECT set_config('storage.allow_delete_query', 'true', false);
                 DELETE FROM storage.objects WHERE bucket_id = 'return-photos';
                 SELECT set_config('storage.allow_delete_query', '', false);`);
}

console.log('\n=== a confirmed mark is fixed; an open one may be re-scored, and scored 0 ===');
{
  // KP0093 week 1 carries the seed's mark_verifications row. KP0110 week 3
  // was written by the supervisor above and nobody has confirmed it.
  const locked = (await as(ACCOUNTS.syahirah[0],
    `SELECT id FROM marks WHERE user_id='KP0093' AND period_year=2026 AND period_month=9 AND week_no=1`)).rows[0].id;
  const open = (await as(ACCOUNTS.syahirah[0],
    `SELECT id FROM marks WHERE user_id='KP0110' AND period_year=2026 AND period_month=9 AND week_no=3`)).rows[0].id;
  const line = (await as(ACCOUNTS.syahirah[0],
    `SELECT l.id FROM checklist_lines l JOIN checklist_categories c ON c.id = l.category_id
      WHERE c.form_key='kedai' ORDER BY l.id LIMIT 1`)).rows[0].id;

  // The app's own re-mark: upsert the total, replace the lines.
  const upsert = (userId, week, total, max) =>
    `INSERT INTO marks (user_id,branch_id,form_key,period_year,period_month,week_no,total_score,max_score)
     VALUES ('${userId}','DMC','kedai',2026,9,${week},${total},${max})
     ON CONFLICT (user_id,period_year,period_month,week_no)
     DO UPDATE SET total_score = EXCLUDED.total_score, max_score = EXCLUDED.max_score`;

  check('a perkara may score 0 — "not done" is a score, not a blank',
    await tryWrite(ACCOUNTS.syahirah[0],
      `INSERT INTO mark_lines (mark_id, line_id, score) VALUES (${open}, ${line}, 0)`), 'allowed');
  check('...but not below it',
    await tryWrite(ACCOUNTS.syahirah[0],
      `UPDATE mark_lines SET score = -1 WHERE mark_id=${open} AND line_id=${line}`), 'blocked');

  check('a week nobody has confirmed may be re-scored, with fewer perkara than the form has',
    await tryWrite(ACCOUNTS.syahirah[0], upsert('KP0110', 3, 60, 75)), 'allowed');
  const reScored = await as(ACCOUNTS.syahirah[0], `SELECT total_score, max_score, pct FROM marks WHERE id=${open}`);
  check('...and the total, maximum and percentage follow',
    [reScored.rows[0].total_score, reScored.rows[0].max_score, reScored.rows[0].pct], [60, 75, 80]);

  check('the same re-score onto a confirmed week is refused at the row',
    await tryWrite(ACCOUNTS.syahirah[0], upsert('KP0093', 1, 60, 75)), 'blocked');
  await as(ACCOUNTS.syahirah[0], `UPDATE marks SET total_score = 10 WHERE id=${locked}`);
  const held = await as(ACCOUNTS.syahirah[0], `SELECT total_score FROM marks WHERE id=${locked}`);
  check('a plain UPDATE on it changes nothing', held.rows[0].total_score, 95);
  check('nor may its lines be written',
    await tryWrite(ACCOUNTS.syahirah[0],
      `INSERT INTO mark_lines (mark_id, line_id, score) VALUES (${locked}, ${line}, 3)`), 'blocked');
  check('head office is held to the same lock',
    await tryWrite(ACCOUNTS.admin[0], upsert('KP0093', 1, 60, 75)), 'blocked');

  check('the Area Manager may still adjust the confirmed figure — that lives on the verification',
    await tryWrite(ACCOUNTS.herdi[0],
      `UPDATE mark_verifications SET adjusted_to = 90 WHERE mark_id=${locked}`), 'allowed');
  await db.exec(`UPDATE mark_verifications SET adjusted_to = NULL WHERE mark_id=${locked}`);

  const gone = await as(ACCOUNTS.admin[0],
    `SELECT count(*)::int n FROM pg_class WHERE relname = 'mark_queries' AND relnamespace = 'public'::regnamespace`);
  check('the question thread table is gone', gone.rows[0].n, 0);
}

console.log('\n=== reminders are an Area Manager -> SV/AS nudge, not a broadcast ===');
{
  check('an Area Manager may send a reminder to the SV/AS they cover',
    await tryWrite(ACCOUNTS.herdi[0],
      `INSERT INTO reminders (branch_id, recipient_id, sent_by, message)
       VALUES ('DMC', 'WS0001', 'AM0001', '3 pekerja belum dinilai minggu ini.')`),
    'allowed');

  check('a supervisor may NOT send one — only head office chases the gaps',
    await tryWrite(ACCOUNTS.syahirah[0],
      `INSERT INTO reminders (branch_id, recipient_id, sent_by, message)
       VALUES ('DMC', 'WS0001', 'WS0001', 'self reminder')`),
    'blocked');

  check('an Area Manager may NOT send one to a branch they do not cover',
    await tryWrite(ACCOUNTS.farah[0],
      `INSERT INTO reminders (branch_id, recipient_id, sent_by, message)
       VALUES ('DMC', 'WS0001', 'AM0002', 'wrong outlet')`),
    'blocked');

  const inbox = await as(ACCOUNTS.syahirah[0], `SELECT count(*)::int n FROM reminders WHERE recipient_id='WS0001'`);
  check('the SV/AS sees the reminder addressed to them', inbox.rows[0].n, 1);

  const other = await as(ACCOUNTS.syahirah[0], `SELECT count(*)::int n FROM reminders WHERE recipient_id='WS0012'`);
  check('...but not one addressed to a different supervisor', other.rows[0].n, 0);

  const rid = (await as(ACCOUNTS.syahirah[0], `SELECT id FROM reminders WHERE recipient_id='WS0001' LIMIT 1`)).rows[0].id;

  // An UPDATE a policy's USING clause filters to zero rows does not throw — it
  // just changes nothing — so this is checked by reading the row back rather
  // than by expecting tryWrite to report 'blocked'. Getting this wrong is
  // exactly the permissive-RLS failure mode the rest of this suite warns about.
  await as(ACCOUNTS.herdi[0], `UPDATE reminders SET read_at = now() WHERE id=${rid}`);
  const afterSender = await as(ACCOUNTS.syahirah[0], `SELECT read_at FROM reminders WHERE id=${rid}`);
  check('the sender may not mark it read on the recipient\'s behalf', afterSender.rows[0].read_at, null);

  check('the recipient may mark their own reminder read',
    await tryWrite(ACCOUNTS.syahirah[0], `UPDATE reminders SET read_at = now() WHERE id=${rid}`),
    'allowed');
  const afterSelf = await as(ACCOUNTS.syahirah[0], `SELECT read_at FROM reminders WHERE id=${rid}`);
  check('...and that one sticks', afterSelf.rows[0].read_at != null, true);
}

console.log('\n=== SV/AS and Area Managers hire pekerja kedai into their own outlet, and only that ===');
{
  const hire = (id, branch, role = 'staff', extra = '') =>
    `INSERT INTO users (id, name, short_name, initials, role, branch_id${extra ? ', auth_user_id' : ''})
     VALUES ('${id}', 'Pekerja Baharu', 'Baharu', 'PB', '${role}', '${branch}'${extra ? `, '${extra}'` : ''})`;

  check('the Machang SV may add a pekerja kedai at Machang',
    await tryWrite(ACCOUNTS.syahirah[0], hire('KP0901', 'DMC')), 'allowed');

  check('...and the new person is on their own staff list straight away',
    (await as(ACCOUNTS.syahirah[0], `SELECT branch_id FROM users WHERE id='KP0901'`)).rows[0]?.branch_id, 'DMC');

  check('the Machang SV may NOT add one at Kota Bharu',
    await tryWrite(ACCOUNTS.syahirah[0], hire('KP0902', 'DKB')), 'blocked');

  check('a supervisor may NOT mint another supervisor',
    await tryWrite(ACCOUNTS.syahirah[0], hire('WS0901', 'DMC', 'supervisor')), 'blocked');

  check('...nor an admin',
    await tryWrite(ACCOUNTS.syahirah[0], hire('AD0901', 'DMC', 'admin')), 'blocked');

  check('...nor a pekerja stor — the stor team is HQ\'s, not a kedai\'s',
    await tryWrite(ACCOUNTS.syahirah[0], hire('ST0901', 'HQ', 'store')), 'blocked');

  check('the row cannot arrive with a login already attached',
    await tryWrite(ACCOUNTS.syahirah[0], hire('KP0903', 'DMC', 'staff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')), 'blocked');

  check('an unassigned (NULL branch) hire is refused — it would be invisible to everyone but admin',
    await tryWrite(ACCOUNTS.syahirah[0],
      `INSERT INTO users (id, name, short_name, initials, role, branch_id)
       VALUES ('KP0904', 'Pekerja Baharu', 'Baharu', 'PB', 'staff', NULL)`), 'blocked');

  check('an Area Manager may add at an outlet they cover through user_branches',
    await tryWrite(ACCOUNTS.herdi[0], hire('KP0905', 'DKB')), 'allowed');

  check('an Area Manager may NOT add at an outlet they do not cover',
    await tryWrite(ACCOUNTS.farah[0], hire('KP0906', 'DMC')), 'blocked');

  // One rung up the marking relation: the Area Manager appoints the SV/AS.
  check('an Area Manager may add an SV/AS at an outlet they cover',
    await tryWrite(ACCOUNTS.herdi[0], hire('WS0905', 'DKB', 'supervisor')), 'allowed');

  check('...but not at one they do not',
    await tryWrite(ACCOUNTS.farah[0], hire('WS0906', 'DMC', 'supervisor')), 'blocked');

  check('...and not another Area Manager, or anyone above',
    await tryWrite(ACCOUNTS.herdi[0], hire('AM0905', 'DMC', 'area_manager')), 'blocked');

  check('the new SV/AS arrives with no login, like a pekerja',
    await tryWrite(ACCOUNTS.herdi[0], hire('WS0907', 'DMC', 'supervisor', 'cccccccc-cccc-cccc-cccc-cccccccccccc')), 'blocked');

  check('a pekerja cannot add a colleague',
    await tryWrite(ACCOUNTS.syazana[0], hire('KP0907', 'DMC')), 'blocked');

  check('the cross-branch manager cannot either — hiring is an outlet decision',
    await tryWrite(ACCOUNTS.manager[0], hire('KP0908', 'DMC')), 'blocked');

  check('admin still may, anywhere',
    await tryWrite(ACCOUNTS.admin[0], hire('KP0909', 'DKB')), 'allowed');

  // The policy is INSERT only. A supervisor who could update would be one
  // step from promoting themselves, so the write side stays admin's.
  await as(ACCOUNTS.syahirah[0], `UPDATE users SET role = 'supervisor' WHERE id = 'KP0901'`);
  check('...and a supervisor cannot then promote the person they added',
    (await as(ACCOUNTS.admin[0], `SELECT role FROM users WHERE id='KP0901'`)).rows[0].role, 'staff');
}

console.log('\n=== editing a person: role, posting and coverage are admin\'s, and demotion must drop coverage ===');
{
  const seenBy = async (uuid) =>
    (await as(uuid, `SELECT DISTINCT branch_id FROM users WHERE branch_id IS NOT NULL ORDER BY 1`))
      .rows.map((x) => x.branch_id);

  check('Herdi starts by covering both his outlets', await seenBy(ACCOUNTS.herdi[0]), ['DKB', 'DMC']);

  check('admin may demote him to supervisor',
    await tryWrite(ACCOUNTS.admin[0], `UPDATE users SET role = 'supervisor' WHERE id = 'AM0001'`), 'allowed');

  // This is the trap the app guards against. The user_branches trigger checks
  // the role on INSERT and UPDATE of *that* table; a role change on users
  // does not touch it, so the stale row still grants the second outlet.
  check('...and with the coverage row left behind he STILL reaches Kota Bharu',
    await seenBy(ACCOUNTS.herdi[0]), ['DKB', 'DMC']);

  check('admin clears the coverage, as updateUserRole() does',
    await tryWrite(ACCOUNTS.admin[0], `DELETE FROM user_branches WHERE user_id = 'AM0001'`), 'allowed');

  check('...and only now is he confined to Machang', await seenBy(ACCOUNTS.herdi[0]), ['DMC']);

  check('the demotion is on record',
    await tryWrite(ACCOUNTS.admin[0],
      `INSERT INTO role_changes (user_id, from_role, to_role, changed_by)
       VALUES ('AM0001', 'area_manager', 'supervisor', 'AD0001')`), 'allowed');

  check('a supervisor may NOT write that record',
    await tryWrite(ACCOUNTS.syahirah[0],
      `INSERT INTO role_changes (user_id, from_role, to_role, changed_by)
       VALUES ('WS0001', 'supervisor', 'area_manager', 'WS0001')`), 'blocked');

  // A supervisor's UPDATE on users filters to zero rows rather than throwing,
  // so it is proven by reading back, as the reminders section notes.
  await as(ACCOUNTS.syahirah[0], `UPDATE users SET role = 'area_manager' WHERE id = 'WS0001'`);
  check('a supervisor cannot promote themselves',
    (await as(ACCOUNTS.admin[0], `SELECT role FROM users WHERE id='WS0001'`)).rows[0].role, 'supervisor');

  await as(ACCOUNTS.syahirah[0], `UPDATE users SET active = false WHERE id = 'KP0093'`);
  check('...nor deactivate their own staff — that stays with admin',
    (await as(ACCOUNTS.admin[0], `SELECT active FROM users WHERE id='KP0093'`)).rows[0].active, true);

  await as(ACCOUNTS.admin[0], `UPDATE users SET active = false WHERE id = 'KP0901'`);
  check('admin may deactivate, and it sticks',
    (await as(ACCOUNTS.admin[0], `SELECT active FROM users WHERE id='KP0901'`)).rows[0].active, false);

  // Put Herdi back the way the seed has him, for anything that runs after.
  await as(ACCOUNTS.admin[0], `UPDATE users SET role = 'area_manager' WHERE id = 'AM0001'`);
  await as(ACCOUNTS.admin[0], `INSERT INTO user_branches (user_id, branch_id) VALUES ('AM0001', 'DKB')`);
  check('restored: promoting back and re-adding coverage takes effect at once',
    await seenBy(ACCOUNTS.herdi[0]), ['DKB', 'DMC']);
}

console.log('\n=== a real e-mail on the directory row becomes the login\'s address ===');
{
  const loginEmail = async (payroll) =>
    (await db.query(`SELECT a.email FROM users u JOIN auth.users a ON a.id = u.auth_user_id WHERE u.id = '${payroll}'`)).rows[0]?.email ?? null;

  // The harness linked the seeded logins with no address at all; give
  // Syazana the identity row GoTrue would have written, so both updates
  // the trigger makes are observable.
  await db.exec(`INSERT INTO auth.identities (user_id, provider, identity_data)
                 VALUES ('${ACCOUNTS.syazana[0]}', 'email', '{"email":"kp0093@checklist.local"}'::jsonb)`);

  check('admin may record an e-mail',
    await tryWrite(ACCOUNTS.admin[0], `UPDATE users SET email = 'Syazana@Example.com' WHERE id = 'KP0093'`), 'allowed');
  check('...and the login now answers to it, lower-cased',
    await loginEmail('KP0093'), 'syazana@example.com');
  check('...as does the identity GoTrue keeps beside it',
    (await db.query(`SELECT identity_data->>'email' AS e FROM auth.identities WHERE user_id = '${ACCOUNTS.syazana[0]}'`)).rows[0].e, 'syazana@example.com');

  check('clearing it hands the login back its synthetic address',
    await tryWrite(ACCOUNTS.admin[0], `UPDATE users SET email = NULL WHERE id = 'KP0093'`), 'allowed');
  check('...kp0093@checklist.local', await loginEmail('KP0093'), 'kp0093@checklist.local');

  check('a malformed address is refused by the table, not the app',
    await tryWrite(ACCOUNTS.admin[0], `UPDATE users SET email = 'not-an-address' WHERE id = 'KP0093'`), 'blocked');

  await as(ACCOUNTS.admin[0], `UPDATE users SET email = 'putri@example.com' WHERE id = 'KP0103'`);
  check('the same address on two people is refused, whatever the case',
    await tryWrite(ACCOUNTS.admin[0], `UPDATE users SET email = 'PUTRI@example.com' WHERE id = 'KP0093'`), 'blocked');

  await as(ACCOUNTS.syahirah[0], `UPDATE users SET email = 'sv-wrote-this@example.com' WHERE id = 'KP0093'`);
  check('a supervisor cannot set an e-mail on their staff — editing stays admin\'s',
    (await as(ACCOUNTS.admin[0], `SELECT email FROM users WHERE id='KP0093'`)).rows[0].email, null);

  check('...but may record one when hiring, since that is part of the row they create',
    await tryWrite(ACCOUNTS.syahirah[0],
      `INSERT INTO users (id, name, short_name, initials, role, branch_id, email)
       VALUES ('KP0910', 'Pekerja Baharu', 'Baharu', 'PB', 'staff', 'DMC', 'baharu@example.com')`), 'allowed');
  check('...and the login issued on the spot (20260918010000) already carries that address',
    await loginEmail('KP0910'), 'baharu@example.com');

  // Re-linking a login by hand (what provision_logins.sql does for rows that
  // predate the trigger) fires the same sync through auth_user_id.
  await db.exec(`INSERT INTO auth.users (id, email) VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'placeholder')`);
  await db.exec(`UPDATE users SET auth_user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' WHERE id = 'KP0910'`);
  check('...and a login linked by hand later is given the real address too',
    await loginEmail('KP0910'), 'baharu@example.com');
}

console.log('\n=== a login is issued the moment a person is added (20260918010000) ===');
{
  const login = async (id) => (await db.query(
    `SELECT a.id IS NOT NULL AS issued, a.email,
            a.encrypted_password = extensions.crypt('123456', a.encrypted_password) AS password_ok,
            (SELECT count(*)::int FROM auth.identities i WHERE i.user_id = a.id AND i.provider = 'email') AS identities,
            a.raw_user_meta_data->>'payroll_id' AS payroll_id
       FROM users u LEFT JOIN auth.users a ON a.id = u.auth_user_id
      WHERE u.id = '${id}'`)).rows[0];

  // KP0901 was added by the Machang SV, KP0909 by admin, earlier in this run.
  const sv = await login('KP0901');
  check('the person a supervisor added can sign in at once, on the starting password',
    [sv.issued, sv.email, sv.password_ok, sv.identities, sv.payroll_id],
    [true, 'kp0901@checklist.local', true, 1, 'KP0901']);
  check('...and so can the one admin added — same trigger, same result',
    (await login('KP0909')).password_ok, true);

  check('the starting password itself is unreadable from the app — even by admin',
    await tryWrite(ACCOUNTS.admin[0], `SELECT start_password FROM login_settings`), 'blocked');

  await as(ACCOUNTS.admin[0],
    `INSERT INTO users (id, name, short_name, initials, role, branch_id, active)
     VALUES ('KP0911', 'Belum Mula', 'Belum', 'BM', 'staff', 'DMC', false)`);
  check('someone added inactive gets no login yet',
    (await login('KP0911')).issued, false);
  await as(ACCOUNTS.admin[0], `UPDATE users SET active = true WHERE id = 'KP0911'`);
  check('...and gets one the moment they are switched on',
    (await login('KP0911')).password_ok, true);

  await as(ACCOUNTS.admin[0], `UPDATE users SET active = false WHERE id = 'KP0093'`);
  await as(ACCOUNTS.admin[0], `UPDATE users SET active = true WHERE id = 'KP0093'`);
  check('toggling someone who already has a login leaves that login alone',
    (await db.query(`SELECT auth_user_id FROM users WHERE id = 'KP0093'`)).rows[0].auth_user_id,
    ACCOUNTS.syazana[0]);

  // The failure mode this migration exists to remove must not come back
  // quietly: with no starting password set, adding a person is refused with
  // a message that says what to do, not silently created without a login.
  await db.exec(`DELETE FROM login_settings`);
  let refused = '';
  try {
    await as(ACCOUNTS.syahirah[0],
      `INSERT INTO users (id, name, short_name, initials, role, branch_id)
       VALUES ('KP0912', 'Pekerja Baharu', 'Baharu', 'PB', 'staff', 'DMC')`);
  } catch (e) { refused = e.message; }
  check('with no starting password set, adding a person is refused outright',
    /no starting password is set/.test(refused) &&
      (await db.query(`SELECT count(*)::int AS n FROM users WHERE id = 'KP0912'`)).rows[0].n === 0, true);
  await db.exec(`INSERT INTO login_settings (start_password) VALUES ('123456')`);
}

console.log('\n=== a payroll number can change, and the person\'s history follows it (20260918020000) ===');
{
  // Syazana, KP0093, is transferred and payroll issues MC0093. Everything
  // about her — marks, the login, her session — has to come along.
  const marksOf = async (id) =>
    (await db.query(`SELECT count(*)::int AS n FROM marks WHERE user_id = '${id}'`)).rows[0].n;
  const before = await marksOf('KP0093');
  check('the fixture has marks to carry across', before > 0, true);

  check('admin may change a payroll number',
    await tryWrite(ACCOUNTS.admin[0], `UPDATE users SET id = 'MC0093' WHERE id = 'KP0093'`), 'allowed');
  check('...and every mark follows it — none left behind under the old number',
    [await marksOf('MC0093'), await marksOf('KP0093')], [before, 0]);

  const login = (await db.query(
    `SELECT email, raw_user_meta_data->>'payroll_id' AS payroll_id FROM auth.users WHERE id = '${ACCOUNTS.syazana[0]}'`)).rows[0];
  check('...the login address is rewritten to the new number',
    [login.email, login.payroll_id], ['mc0093@checklist.local', 'MC0093']);
  check('...and her existing session simply sees the new number',
    (await as(ACCOUNTS.syazana[0], `SELECT app_user_id() AS id`)).rows[0].id, 'MC0093');

  check('the change is recorded, admin-only, like a role change',
    await tryWrite(ACCOUNTS.admin[0],
      `INSERT INTO payroll_id_changes (user_id, from_id, to_id, changed_by) VALUES ('MC0093', 'KP0093', 'MC0093', 'AD0001')`), 'allowed');
  check('...and a supervisor cannot read that audit',
    await tryWrite(ACCOUNTS.syahirah[0], `SELECT * FROM payroll_id_changes`) === 'blocked'
      || (await as(ACCOUNTS.syahirah[0], `SELECT count(*)::int AS n FROM payroll_id_changes`)).rows[0].n === 0, true);

  // A real e-mail is the login address and stays so; only the synthetic one
  // is derived from the number.
  const putriEmail = (await db.query(`SELECT email FROM users WHERE id = 'KP0103'`)).rows[0].email;
  check('the fixture person has a real e-mail on file', putriEmail != null, true);
  await as(ACCOUNTS.admin[0], `UPDATE users SET id = 'MC0103' WHERE id = 'KP0103'`);
  check('a person with a real e-mail keeps it as their login through the change',
    (await db.query(`SELECT email FROM auth.users WHERE id = '${ACCOUNTS.putri[0]}'`)).rows[0].email, putriEmail);

  await as(ACCOUNTS.syahirah[0], `UPDATE users SET id = 'MC0111' WHERE id = 'KP0111'`);
  check('a supervisor cannot change a number — editing a person stays admin\'s',
    (await db.query(`SELECT count(*)::int AS n FROM users WHERE id = 'KP0111'`)).rows[0].n, 1);

  check('a number the login could never use is refused at the table',
    await tryWrite(ACCOUNTS.admin[0], `UPDATE users SET id = 'MC 93' WHERE id = 'MC0093'`), 'blocked');
  check('...but any run of letters and digits payroll issues is fine (20260919010000)',
    await tryWrite(ACCOUNTS.admin[0], `UPDATE users SET id = 'TPG001' WHERE id = 'MC0093'`), 'allowed');
  await as(ACCOUNTS.admin[0], `UPDATE users SET id = 'MC0093' WHERE id = 'TPG001'`);
  check('...and so is one somebody else already holds',
    await tryWrite(ACCOUNTS.admin[0], `UPDATE users SET id = 'KP0111' WHERE id = 'MC0093'`), 'blocked');

  // Put the fixture back for anything that runs after.
  await as(ACCOUNTS.admin[0], `UPDATE users SET id = 'KP0093' WHERE id = 'MC0093'`);
  await as(ACCOUNTS.admin[0], `UPDATE users SET id = 'KP0103' WHERE id = 'MC0103'`);
}

console.log('\n=== a person keeps their own e-mail current, and nothing else ===');
{
  const loginEmail = async (payroll) =>
    (await db.query(`SELECT a.email FROM users u JOIN auth.users a ON a.id = u.auth_user_id WHERE u.id = '${payroll}'`)).rows[0]?.email ?? null;

  check('a pekerja may set their own e-mail through set_my_email',
    await tryWrite(ACCOUNTS.putri[0], `SELECT set_my_email('  Putri.W@Example.com ')`), 'allowed');
  check('...trimmed and lower-cased on the directory row',
    (await as(ACCOUNTS.admin[0], `SELECT email FROM users WHERE id='KP0103'`)).rows[0].email, 'putri.w@example.com');
  check('...and the login address followed it', await loginEmail('KP0103'), 'putri.w@example.com');

  check('blank clears it',
    await tryWrite(ACCOUNTS.putri[0], `SELECT set_my_email('')`), 'allowed');
  check('...and the login falls back to the synthetic address', await loginEmail('KP0103'), 'kp0103@checklist.local');

  check('a malformed address is refused',
    await tryWrite(ACCOUNTS.putri[0], `SELECT set_my_email('not-an-address')`), 'blocked');

  await as(ACCOUNTS.admin[0], `UPDATE users SET email = 'taken@example.com' WHERE id = 'KP0093'`);
  check('an address already on someone else is refused',
    await tryWrite(ACCOUNTS.putri[0], `SELECT set_my_email('TAKEN@example.com')`), 'blocked');

  // The function has no "whose" parameter — it can only ever land on the
  // caller's own row — but the point is worth pinning down.
  await as(ACCOUNTS.putri[0], `SELECT set_my_email('mine@example.com')`);
  check('...it never touches anyone else\'s row',
    (await as(ACCOUNTS.admin[0], `SELECT email FROM users WHERE id='KP0093'`)).rows[0].email, 'taken@example.com');

  await as(ACCOUNTS.putri[0], `UPDATE users SET email = 'direct@example.com', role = 'admin' WHERE id = 'KP0103'`);
  const row = (await as(ACCOUNTS.admin[0], `SELECT email, role FROM users WHERE id='KP0103'`)).rows[0];
  check('a direct UPDATE on their own row still changes nothing — not the e-mail, not the role',
    [row.email, row.role], ['mine@example.com', 'staff']);

  check('anon cannot call it at all',
    await tryWrite('00000000-0000-0000-0000-000000000000', `SELECT set_my_email('x@example.com')`), 'blocked');
}

console.log('\n=== SV and Asisten Penyelia — a label, not a permission ===');
{
  check('a person who does not exist is refused',
    await tryWrite(ACCOUNTS.admin[0], `SELECT set_supervisor_title('ZZ0000', 'sv')`), 'blocked');

  check('tagging someone who is not an SV/AS is refused, even for admin',
    await tryWrite(ACCOUNTS.admin[0], `SELECT set_supervisor_title('KP0093', 'sv')`), 'blocked');

  check('admin may tag an SV/AS anywhere',
    await tryWrite(ACCOUNTS.admin[0], `SELECT set_supervisor_title('WS0001', 'sv')`), 'allowed');
  check('...and it reads back',
    (await as(ACCOUNTS.admin[0], `SELECT supervisor_title FROM users WHERE id='WS0001'`)).rows[0].supervisor_title, 'sv');

  check('the Area Manager who covers that outlet may tag their own SV/AS',
    await tryWrite(ACCOUNTS.herdi[0], `SELECT set_supervisor_title('WS0001', 'asisten')`), 'allowed');
  check('an Area Manager who does not cover the outlet may not',
    await tryWrite(ACCOUNTS.farah[0], `SELECT set_supervisor_title('WS0001', 'sv')`), 'blocked');

  check('the SV/AS may not tag themselves',
    await tryWrite(ACCOUNTS.syahirah[0], `SELECT set_supervisor_title('WS0001', 'sv')`), 'blocked');

  check('a blank clears it',
    await tryWrite(ACCOUNTS.admin[0], `SELECT set_supervisor_title('WS0001', '')`), 'allowed');
  check('...to NULL, not the word null',
    (await as(ACCOUNTS.admin[0], `SELECT supervisor_title FROM users WHERE id='WS0001'`)).rows[0].supervisor_title, null);

  check('an unknown word is refused by the enum itself',
    await tryWrite(ACCOUNTS.admin[0], `SELECT set_supervisor_title('WS0001', 'senior')`), 'blocked');

  // The safety net a demotion could otherwise trip over silently: the CHECK
  // is what stops a role change from leaving a title on a row that is no
  // longer a supervisor's.
  await as(ACCOUNTS.admin[0], `SELECT set_supervisor_title('WS0001', 'sv')`);
  check('changing role away from supervisor without clearing the title is refused',
    await tryWrite(ACCOUNTS.admin[0], `UPDATE users SET role = 'staff' WHERE id = 'WS0001'`), 'blocked');
  check('clearing it in the same statement is fine',
    await tryWrite(ACCOUNTS.admin[0], `UPDATE users SET role = 'staff', supervisor_title = NULL WHERE id = 'WS0001'`), 'allowed');

  // Put the fixture back for anything that runs after.
  await as(ACCOUNTS.admin[0], `UPDATE users SET role = 'supervisor' WHERE id = 'WS0001'`);
  await as(ACCOUNTS.admin[0], `SELECT set_supervisor_title('WS0001', 'sv')`);

  const staffMonthly = await as(ACCOUNTS.gm[0],
    `SELECT supervisor_title FROM report_staff_monthly WHERE user_id = 'WS0001' AND period_year = 2026 AND period_month = 9`);
  check('report_staff_monthly carries the column through for GM/HR to read',
    staffMonthly.rows[0]?.supervisor_title, 'sv');

  await as(ACCOUNTS.admin[0], `SELECT set_supervisor_title('WS0001', '')`);
}

// --- the service role, which payroll-auth reads the directory under.
// Supabase's default privileges were assumed to cover this and did not on the
// live database; 20260917030000 grants it explicitly, so it is held to here.
{
  console.log('\nservice_role — the view payroll-auth reads the directory through');
  await db.exec(`SET ROLE service_role;`);
  try {
    const row = (await db.query(`SELECT email, auth_user_id IS NOT NULL AS linked, active FROM users WHERE id = 'KP0103'`)).rows[0];
    check('service_role reads any row of users, e-mail included, past RLS',
      [row.email, row.linked, row.active], ['mine@example.com', true, true]);
  } finally {
    await db.exec(`RESET ROLE;`);
  }
}

console.log(`\n${fail === 0 ? 'ALL GREEN' : 'FAILURES'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
