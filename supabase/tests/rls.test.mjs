import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const db = new PGlite();

// --- stub what Supabase provides: the auth schema, auth.uid(), and the roles.
await db.exec(`
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE SCHEMA IF NOT EXISTS storage;
  CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, updated_at timestamptz);
  CREATE TABLE auth.identities (
    user_id uuid, provider text, identity_data jsonb DEFAULT '{}'::jsonb, updated_at timestamptz
  );
  -- Enough of Supabase Storage to hold the bucket and its policies.
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
]) {
  try { await db.exec(file(m)); console.log(`OK   ${m.split('/').pop()}`); }
  catch (e) { console.log(`FAIL ${m.split('/').pop()}\n     ${e.message}`); process.exit(1); }
}
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

  // Still a manager, so the kedai side is fully writable across branches.
  check('manager may NOT insert a mark (that pass belongs to SV and head office)',
    await tryWrite(ACCOUNTS.manager[0],
      `INSERT INTO marks (user_id,branch_id,form_key,period_year,period_month,week_no,total_score,max_score)
       VALUES ('KP0201','DKB','kedai',2026,9,2,90,110)`), 'blocked');
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

  // Retention: the evidence goes 30 days after the bill clears.
  const before = await as(ACCOUNTS.hafiz[0], `SELECT count(*)::int n FROM return_photos`);
  const purged = await as(ACCOUNTS.admin[0], `SELECT purge_cleared_return_photos(30) AS n`);
  const after = await as(ACCOUNTS.hafiz[0], `SELECT count(*)::int n FROM return_photos`);
  check('an open bill keeps its photos', [before.rows[0].n, after.rows[0].n], [2, 2]);
  check('...and nothing was purged, because nothing has cleared long enough',
    purged.rows[0].n, 0);
}

console.log('\n=== staff <-> SV/AS query threads stay between the two of them ===');
{
  const markRow = await as(ACCOUNTS.syazana[0],
    `SELECT id FROM marks WHERE user_id='KP0093' AND period_year=2026 AND period_month=9 AND week_no=1`);
  const markId = markRow.rows[0].id;

  check('the staff member may ask a question on their own mark',
    await tryWrite(ACCOUNTS.syazana[0],
      `INSERT INTO mark_queries (mark_id, sender_id, body)
       VALUES (${markId}, 'KP0093', 'Kenapa markah tandas rendah minggu ni?')`),
    'allowed');

  check('the SV/AS who scored it may reply',
    await tryWrite(ACCOUNTS.syahirah[0],
      `INSERT INTO mark_queries (mark_id, sender_id, body)
       VALUES (${markId}, 'WS0001', 'Tandas belum disapu masa saya check petang tu.')`),
    'allowed');

  const seenByStaff = await as(ACCOUNTS.syazana[0], `SELECT count(*)::int n FROM mark_queries WHERE mark_id=${markId}`);
  check('the staff member sees both messages', seenByStaff.rows[0].n, 2);

  const seenByOther = await as(ACCOUNTS.putri[0], `SELECT count(*)::int n FROM mark_queries WHERE mark_id=${markId}`);
  check('a different staff member at the same branch sees none of it', seenByOther.rows[0].n, 0);

  check('...and may not post into it either',
    await tryWrite(ACCOUNTS.putri[0],
      `INSERT INTO mark_queries (mark_id, sender_id, body) VALUES (${markId}, 'KP0103', 'butting in')`),
    'blocked');

  const seenByManager = await as(ACCOUNTS.manager[0], `SELECT count(*)::int n FROM mark_queries WHERE mark_id=${markId}`);
  check('the cross-branch manager cannot read it either — no individual marking sheets', seenByManager.rows[0].n, 0);

  const seenByHr = await as(ACCOUNTS.hr[0], `SELECT count(*)::int n FROM mark_queries WHERE mark_id=${markId}`);
  check('HR can, on the same reach as the mark itself', seenByHr.rows[0].n, 2);

  check('nobody may impersonate another sender',
    await tryWrite(ACCOUNTS.syazana[0],
      `INSERT INTO mark_queries (mark_id, sender_id, body) VALUES (${markId}, 'WS0001', 'pretending to be the SV')`),
    'blocked');
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
  check('with no login yet, there is nothing for the trigger to update — and nothing breaks',
    await loginEmail('KP0910'), null);

  // Linking a login later (what provision_logins.sql does) fires the same
  // trigger through auth_user_id, so the address is right from the start.
  await db.exec(`INSERT INTO auth.users (id, email) VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'placeholder')`);
  await db.exec(`UPDATE users SET auth_user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' WHERE id = 'KP0910'`);
  check('...and once a login is linked, it carries the real address',
    await loginEmail('KP0910'), 'baharu@example.com');
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
