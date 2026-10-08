-- Why won't the app load for one person?
--
-- The app's red "Data tidak dapat dimuatkan" banner means one of its first
-- reads failed. This runs those same reads as that person would — the same
-- role and the same identity, so the same RLS — and lists, for each, how many
-- rows came back and how long it took, or the error.
--
-- Paste into the Supabase SQL editor, set the payroll number on the line
-- marked "who", and run. It only reads: nothing is changed or kept.
--
-- The app's requests give up after 8 seconds (the authenticated role's
-- statement_timeout), so a step slower than that fails in the app even though
-- it finishes here.
--
-- Marks are read for the person's own outlet and this month, as the app does
-- on opening (an Area Manager's home outlet; head office: none).
--
-- These are plain SQL, shaped like the app's reads; the API can still plan a
-- read differently. All "ok" here while the app reports a timeout means the
-- app's read is shaped worse than this one — the banner names which.

CREATE TEMP TABLE diag (ord int, step text, rows_back bigint, ms int, error text) ON COMMIT DROP;
GRANT ALL ON diag TO authenticated;

SELECT set_config('diag.payroll', upper('HQ0130'), true);   -- who

SELECT set_config('request.jwt.claims',
                  json_build_object('sub', u.auth_user_id::text, 'role', 'authenticated')::text, true),
       set_config('diag.outlet', coalesce(u.branch_id, ''), true)
  FROM users u
 WHERE u.id = current_setting('diag.payroll');

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  outlet text := coalesce(current_setting('diag.outlet', true), '');
  y int := extract(year FROM now() AT TIME ZONE 'Asia/Kuala_Lumpur');
  m int := extract(month FROM now() AT TIME ZONE 'Asia/Kuala_Lumpur');
  -- name, query: %1$s year, %2$s month, %3$L outlet
  steps text[] := ARRAY[
    'signed in as',    'SELECT count(*) FROM users WHERE id = app_user_id()',
    'branches',        'SELECT count(*) FROM branches',
    'users',           'SELECT count(*) FROM users',
    'user_branches',   'SELECT count(*) FROM user_branches',
    'marks',           'SELECT count(*) FROM marks mk LEFT JOIN mark_verifications v ON v.mark_id = mk.id
                         WHERE mk.period_year = %1$s AND mk.period_month = %2$s AND mk.branch_id = %3$L',
    -- By mark id, as the app reads them (lib/marks.ts fetchPerkaraAverages).
    'mark_lines',      'SELECT count(*) FROM mark_lines ml
                          JOIN checklist_lines cl ON cl.id = ml.line_id
                          JOIN checklist_categories cc ON cc.id = cl.category_id
                         WHERE ml.mark_id = ANY (ARRAY(SELECT id FROM marks
                                                        WHERE period_year = %1$s AND period_month = %2$s
                                                          AND branch_id = %3$L))',
    'returns',         'SELECT count(*) FROM returns',
    'assets',          'SELECT count(*) FROM assets a LEFT JOIN asset_issues i ON i.asset_id = a.id AND i.resolved_on IS NULL',
    'tugasan_checks',  'SELECT count(*) FROM tugasan_checks WHERE period_year >= %1$s',
    'reminders',       'SELECT count(*) FROM reminders'
  ];
  t0 timestamptz;
  n bigint;
BEGIN
  -- A payroll number with no row, or no login, leaves no identity to act as.
  IF coalesce(current_setting('request.jwt.claims', true), '') NOT LIKE '%"sub" : "%' THEN
    INSERT INTO diag VALUES (0, 'NO LOGIN FOR ' || current_setting('diag.payroll')
                                || ': check the payroll number, or run provision_logins.sql', NULL, NULL, NULL);
    RETURN;
  END IF;
  INSERT INTO diag VALUES (0, 'running as ' || current_user || ' · ' || coalesce(app_role()::text, 'no role')
                              || ' · outlet ' || coalesce(nullif(outlet, ''), '(none)') || ' · ' || y || '-' || m,
                           NULL, NULL, NULL);
  FOR i IN 1 .. array_length(steps, 1) / 2 LOOP
    t0 := clock_timestamp();
    BEGIN
      EXECUTE format(steps[2 * i], y, m, outlet) INTO n;
      INSERT INTO diag VALUES (i, steps[2 * i - 1], n, (extract(epoch FROM clock_timestamp() - t0) * 1000)::int, NULL);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO diag VALUES (i, steps[2 * i - 1], NULL, (extract(epoch FROM clock_timestamp() - t0) * 1000)::int,
                               SQLSTATE || ' ' || SQLERRM);
    END;
  END LOOP;
END $$;

SELECT step, rows_back, ms,
       CASE WHEN ord = 0 THEN ''
            WHEN error IS NOT NULL THEN error
            WHEN ms > 8000 THEN 'TOO SLOW: the app gives up at 8 s'
            ELSE 'ok' END AS result
  FROM diag
 ORDER BY ord;
