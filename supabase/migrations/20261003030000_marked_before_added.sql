-- Someone marked before the week they were added was there all along.
--
-- 20261002040000 made a person due from the checklist week of joined_on, in
-- the month they were added, and kept the whole month due only for months
-- BEFORE that one — the imported workbook history. But 303 people were added
-- on 29 September 2026, the day the directory was loaded, and the September
-- workbook marks them in weeks 1–3. September counted them from week 4 only:
-- their marks fell outside the weeks "due", one person-week each was all the
-- outlet owed, and company coverage for September read 41% where every
-- workbook week had been filled in far more often than that.
--
-- The rule now: in the month a person was added, they are due from the week
-- of joined_on — unless they were marked in an earlier week of that month, in
-- which case they were evidently working and are due all of it, exactly as
-- for any month before it. A mark on any form counts.
--
-- No column changes; report_due.first_week and report_staff_monthly.
-- due_from_week are worked out the new way.

CREATE FUNCTION report_first_week(joined date, y int, m int, first_marked int) RETURNS int
  LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
           WHEN first_marked IS NOT NULL AND first_marked < report_first_week(joined, y, m) THEN 1
           ELSE report_first_week(joined, y, m)
         END
$$;

COMMENT ON FUNCTION report_first_week(date, int, int, int) IS
  'Checklist week (1–4) of month y-m a person is due from: the week holding joined_on in the month they were added, 1 otherwise — and 1 when they were marked that month in a week before the one they were added in.';

CREATE OR REPLACE VIEW report_due AS
WITH last_mark AS (
  -- marks is unique per person × week, so the latest week is one mark.
  SELECT DISTINCT ON (m.user_id, m.period_year, m.period_month)
         m.user_id, m.period_year, m.period_month, m.form_key
  FROM marks m
  ORDER BY m.user_id, m.period_year, m.period_month, m.week_no DESC
),
first_mark AS (
  SELECT m.user_id, m.period_year, m.period_month, min(m.week_no) AS week_no
  FROM marks m
  GROUP BY 1, 2, 3
)
SELECT u.id                          AS user_id,
       u.branch_id,
       u.role,
       COALESCE(lm.form_key, f.key)  AS form_key,
       p.period_year,
       p.period_month,
       p.due_weeks,
       report_first_week(u.joined_on, p.period_year, p.period_month, fm.week_no) AS first_week
FROM users u
CROSS JOIN report_periods p
LEFT JOIN checklist_forms f ON f.applies_to = u.role
LEFT JOIN last_mark lm      ON lm.user_id = u.id
                           AND lm.period_year = p.period_year
                           AND lm.period_month = p.period_month
LEFT JOIN first_mark fm     ON fm.user_id = u.id
                           AND fm.period_year = p.period_year
                           AND fm.period_month = p.period_month
WHERE u.active
  AND u.branch_id IS NOT NULL
  AND (lm.user_id IS NOT NULL                                -- marked that month
       OR (f.key IS NOT NULL AND u.joined_on <= p.period_end)); -- else due once joined, on today's form

COMMENT ON VIEW report_due IS
  'One row per active person × month in which they are due a weekly mark, at the outlet they are posted to now, under the form they were last marked on that month (their current role''s form when unmarked). first_week = the checklist week they are due from: the week they were added, in the month they were added — or week 1 if they were marked earlier that month.';

CREATE OR REPLACE VIEW report_staff_monthly AS
WITH people AS (
  -- Every form a person was marked on that month, plus the form they were
  -- due on (report_due) when they were not marked at all.
  SELECT user_id, period_year, period_month, form_key FROM report_due
  UNION
  SELECT m.user_id, m.period_year, m.period_month, m.form_key
  FROM marks m
  JOIN report_periods p ON p.period_year = m.period_year AND p.period_month = m.period_month
),
weeks AS (
  SELECT pp.user_id, pp.period_year, pp.period_month, pp.form_key,
         max(rm.final_pct) FILTER (WHERE rm.week_no = 1)   AS w1_pct,
         max(rm.final_pct) FILTER (WHERE rm.week_no = 2)   AS w2_pct,
         max(rm.final_pct) FILTER (WHERE rm.week_no = 3)   AS w3_pct,
         max(rm.final_pct) FILTER (WHERE rm.week_no = 4)   AS w4_pct,
         round(avg(rm.final_pct))::int                     AS avg_pct,
         count(rm.mark_id)::int                            AS marked_weeks,
         count(*) FILTER (WHERE rm.is_pass)::int           AS passed_weeks,
         count(*) FILTER (WHERE rm.is_verified)::int       AS verified_weeks,
         -- Where the marks were scored, if anywhere else than the current posting.
         max(rm.branch_id)                                 AS marked_at
  FROM people pp
  LEFT JOIN report_marks rm ON rm.user_id = pp.user_id
                           AND rm.period_year = pp.period_year
                           AND rm.period_month = pp.period_month
                           AND rm.form_key = pp.form_key
  GROUP BY 1, 2, 3, 4
),
first_mark AS (
  -- Across every form: a mark on any of them shows the person was there.
  SELECT m.user_id, m.period_year, m.period_month, min(m.week_no) AS week_no
  FROM marks m
  GROUP BY 1, 2, 3
)
SELECT w.user_id,
       u.name,
       u.short_name,
       u.role,
       w.form_key,
       u.branch_id,
       b.name               AS branch_name,
       b.short_name         AS branch_short,
       u.active,
       w.period_year,
       w.period_month,
       p.due_weeks,
       w.w1_pct, w.w2_pct, w.w3_pct, w.w4_pct,
       w.avg_pct,
       w.marked_weeks,
       w.passed_weeks,
       w.verified_weeks,
       r.pass_threshold,
       w.marked_at,
       -- Equal averages share a rank; more marked weeks breaks a tie before that.
       rank() OVER (PARTITION BY w.period_year, w.period_month, u.branch_id, w.form_key
                    ORDER BY w.avg_pct DESC NULLS LAST, w.marked_weeks DESC) AS rank_in_branch,
       u.supervisor_title,
       report_first_week(u.joined_on, w.period_year, w.period_month, fm.week_no) AS due_from_week
FROM weeks w
JOIN users u                 ON u.id = w.user_id
JOIN report_periods p        ON p.period_year = w.period_year AND p.period_month = w.period_month
LEFT JOIN branches b         ON b.id = u.branch_id
LEFT JOIN scoring_rules r    ON r.branch_id = u.branch_id
LEFT JOIN first_mark fm      ON fm.user_id = w.user_id
                            AND fm.period_year = w.period_year
                            AND fm.period_month = w.period_month;

COMMENT ON VIEW report_staff_monthly IS
  'One row per person × month × form: the four weekly percentages on that form (NULL = unmarked), their average, and the pass/verified counts. form_key is the checklist the marks were on — someone promoted mid-month has a row per form. due_from_week = the week they are due a mark from (the week they were added, in that month — week 1 if marked earlier that month). Outlet and role are the person''s current ones; marked_at is where the marks were scored. supervisor_title is sv/asisten/NULL, meaningful for role = supervisor only.';

-- CREATE OR REPLACE resets a view's options; run as the caller, as before.
ALTER VIEW report_due           SET (security_invoker = true);
ALTER VIEW report_staff_monthly SET (security_invoker = true);
