-- A new person is due a mark from the week they were added, not the whole month.
--
-- report_due decided "due" by the month: anyone who had joined by the month's
-- end was due a mark in every week of it that had started. Someone added on
-- 20 May therefore showed two unmarked weeks — 1–7 and 8–14 May, before
-- they existed — and every new hire's first month read as a gap they could
-- not have filled, pulling the outlet's coverage down with it.
--
-- users.joined_on is the day the person was added in the app, and that is
-- taken as their start. From the month they were added, they are due from
-- the checklist week holding that date: added on 20 May, due from week 3
-- (15–21 May). Every later month, all four weeks.
--
-- Months before joined_on are left as they were. A person appears in one only
-- because they were marked in it — the 2026 workbook history, imported for
-- people whose rows were created later (docs/marks-import-2026.md §3.3) — and
-- is due all of that month's weeks, so a week they were not marked in still
-- counts as a gap.
--
-- Coverage changes with it. headcount × weeks started is no longer the number
-- of person-weeks due once people start partway through, so:
--
--   * report_branch_weekly.headcount is per week: the people due THAT week.
--   * report_branch_monthly and report_company_monthly gain due_slots — the
--     person-weeks due over the weeks that have started — and coverage_pct is
--     (due_slots − gaps) / due_slots. For anyone due the whole month that is
--     exactly headcount × due_weeks, as before.
--   * report_due and report_staff_monthly gain the week each person is due
--     from (first_week / due_from_week), so the staff table and the unmarked-
--     weeks list can leave the weeks before it out.
--
-- New columns are added at the end of each view; every existing column keeps
-- its name, type and place.

-- The checklist week (1–4) of the given month a person is due from: the week
-- holding joined_on in the month they were added, week 1 in any other month.
CREATE FUNCTION report_first_week(joined date, y int, m int) RETURNS int
  LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
           WHEN joined >= make_date(y, m, 1)
            AND joined <  (make_date(y, m, 1) + interval '1 month')::date
           THEN report_week_of(joined)
           ELSE 1
         END
$$;

COMMENT ON FUNCTION report_first_week(date, int, int) IS
  'Checklist week (1–4) of month y-m a person is due from: the week holding their joined_on in the month they were added, 1 otherwise.';

CREATE OR REPLACE VIEW report_due AS
WITH last_mark AS (
  -- marks is unique per person × week, so the latest week is one mark.
  SELECT DISTINCT ON (m.user_id, m.period_year, m.period_month)
         m.user_id, m.period_year, m.period_month, m.form_key
  FROM marks m
  ORDER BY m.user_id, m.period_year, m.period_month, m.week_no DESC
)
SELECT u.id                          AS user_id,
       u.branch_id,
       u.role,
       COALESCE(lm.form_key, f.key)  AS form_key,
       p.period_year,
       p.period_month,
       p.due_weeks,
       report_first_week(u.joined_on, p.period_year, p.period_month) AS first_week
FROM users u
CROSS JOIN report_periods p
LEFT JOIN checklist_forms f ON f.applies_to = u.role
LEFT JOIN last_mark lm      ON lm.user_id = u.id
                           AND lm.period_year = p.period_year
                           AND lm.period_month = p.period_month
WHERE u.active
  AND u.branch_id IS NOT NULL
  AND (lm.user_id IS NOT NULL                                -- marked that month
       OR (f.key IS NOT NULL AND u.joined_on <= p.period_end)); -- else due once joined, on today's form

COMMENT ON VIEW report_due IS
  'One row per active person × month in which they are due a weekly mark, at the outlet they are posted to now, under the form they were last marked on that month (their current role''s form when unmarked). first_week = the checklist week they are due from: the week they were added, in the month they were added.';

CREATE OR REPLACE VIEW report_branch_weekly AS
WITH cells AS (
  SELECT b.id AS branch_id, b.name AS branch_name, b.short_name AS branch_short,
         p.period_year, p.period_month, w.week_no, f.key AS form_key,
         (w.week_no <= p.due_weeks) AS week_due
  FROM branches b
  CROSS JOIN report_periods p
  CROSS JOIN generate_series(1, 4) AS w(week_no)
  CROSS JOIN checklist_forms f
  WHERE b.active
),
head AS (
  -- The people due THAT week: nobody before the week they were added.
  SELECT d.branch_id, d.period_year, d.period_month, d.form_key, w.week_no, count(*)::int AS headcount
  FROM report_due d
  CROSS JOIN generate_series(1, 4) AS w(week_no)
  WHERE w.week_no >= d.first_week
  GROUP BY 1, 2, 3, 4, 5
),
gap AS (
  SELECT d.branch_id, d.period_year, d.period_month, d.form_key, w.week_no, count(*)::int AS gaps
  FROM report_due d
  CROSS JOIN generate_series(1, 4) AS w(week_no)
  WHERE w.week_no >= d.first_week
    AND NOT EXISTS (SELECT 1 FROM marks m
                     WHERE m.user_id = d.user_id
                       AND m.period_year = d.period_year
                       AND m.period_month = d.period_month
                       AND m.week_no = w.week_no)
  GROUP BY 1, 2, 3, 4, 5
),
scored AS (
  SELECT branch_id, period_year, period_month, week_no, form_key,
         count(*)::int                              AS marked,
         count(*) FILTER (WHERE is_pass)::int       AS passed,
         round(avg(final_pct))::int                 AS avg_pct,
         sum(final_pct)::int                        AS pct_sum,
         count(*) FILTER (WHERE is_verified)::int   AS verified
  FROM report_marks
  GROUP BY 1, 2, 3, 4, 5
)
SELECT c.branch_id, c.branch_name, c.branch_short,
       c.period_year, c.period_month, c.week_no, c.form_key, c.week_due,
       COALESCE(h.headcount, 0) AS headcount,
       COALESCE(s.marked, 0)    AS marked,
       COALESCE(g.gaps, 0)      AS gaps,
       COALESCE(s.passed, 0)    AS passed,
       s.avg_pct,
       -- Sum of the percentages behind avg_pct, so the monthly and company
       -- views average the marks themselves rather than rounded averages.
       COALESCE(s.pct_sum, 0)   AS pct_sum,
       COALESCE(s.verified, 0)  AS verified,
       r.pass_threshold
FROM cells c
LEFT JOIN head h   ON h.branch_id = c.branch_id AND h.period_year = c.period_year
                  AND h.period_month = c.period_month AND h.form_key = c.form_key
                  AND h.week_no = c.week_no
LEFT JOIN gap g    ON g.branch_id = c.branch_id AND g.period_year = c.period_year
                  AND g.period_month = c.period_month AND g.form_key = c.form_key
                  AND g.week_no = c.week_no
LEFT JOIN scored s ON s.branch_id = c.branch_id AND s.period_year = c.period_year
                  AND s.period_month = c.period_month AND s.form_key = c.form_key
                  AND s.week_no = c.week_no
JOIN scoring_rules r ON r.branch_id = c.branch_id;

COMMENT ON VIEW report_branch_weekly IS
  'Outlet × month × week × form. headcount = people due that week (from the week they were added), marked = marks scored there, gaps = due people with no mark, passed/verified out of marked. avg_pct NULL when nothing was marked; pct_sum is there for re-aggregation only.';

CREATE OR REPLACE VIEW report_branch_monthly AS
SELECT branch_id, branch_name, branch_short, period_year, period_month, form_key,
       max(headcount)                                       AS headcount,
       sum(marked)::int                                     AS marked,
       sum(gaps)   FILTER (WHERE week_due)::int             AS gaps,
       sum(passed)::int                                     AS passed,
       CASE WHEN sum(marked) > 0
            THEN round(sum(pct_sum) * 1.0 / sum(marked))::int END AS avg_pct,
       sum(pct_sum)::int                                    AS pct_sum,
       sum(verified)::int                                   AS verified,
       pass_threshold,
       count(*) FILTER (WHERE week_due)::int                AS due_weeks,
       CASE WHEN sum(marked) > 0
            THEN round(sum(passed) * 100.0 / sum(marked))::int END AS pass_rate_pct,
       CASE WHEN sum(marked) > 0
            THEN round(sum(verified) * 100.0 / sum(marked))::int END AS verified_pct,
       CASE WHEN sum(headcount) FILTER (WHERE week_due) > 0
            THEN round((sum(headcount) FILTER (WHERE week_due)
                        - sum(gaps) FILTER (WHERE week_due)) * 100.0
                       / sum(headcount) FILTER (WHERE week_due))::int END AS coverage_pct,
       COALESCE(sum(headcount) FILTER (WHERE week_due), 0)::int AS due_slots
FROM report_branch_weekly
GROUP BY branch_id, branch_name, branch_short, period_year, period_month, form_key, pass_threshold;

COMMENT ON VIEW report_branch_monthly IS
  'Outlet × month × form. headcount = people due at any point in the month; due_slots = person-weeks due over the weeks started (each person from the week they were added); coverage_pct = (due_slots − gaps) / due_slots; pass_rate_pct and verified_pct are out of marked.';

CREATE OR REPLACE VIEW report_company_monthly AS
SELECT period_year, period_month, form_key,
       sum(headcount)::int AS headcount,
       sum(marked)::int    AS marked,
       sum(gaps)::int      AS gaps,
       sum(passed)::int    AS passed,
       CASE WHEN sum(marked) > 0
            THEN round(sum(pct_sum) * 1.0 / sum(marked))::int END AS avg_pct,
       sum(pct_sum)::int   AS pct_sum,
       sum(verified)::int  AS verified,
       max(due_weeks)      AS due_weeks,
       CASE WHEN sum(marked) > 0
            THEN round(sum(passed) * 100.0 / sum(marked))::int END AS pass_rate_pct,
       CASE WHEN sum(marked) > 0
            THEN round(sum(verified) * 100.0 / sum(marked))::int END AS verified_pct,
       CASE WHEN sum(due_slots) > 0
            THEN round((sum(due_slots) - sum(gaps)) * 100.0
                       / sum(due_slots))::int END AS coverage_pct,
       sum(due_slots)::int AS due_slots
FROM report_branch_monthly
GROUP BY period_year, period_month, form_key;

COMMENT ON VIEW report_company_monthly IS
  'The whole company, one row per month × form. Sums of the outlet rows; the ratios are re-derived from those sums, never averaged across outlets. coverage_pct = (due_slots − gaps) / due_slots.';

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
       report_first_week(u.joined_on, w.period_year, w.period_month) AS due_from_week
FROM weeks w
JOIN users u                 ON u.id = w.user_id
JOIN report_periods p        ON p.period_year = w.period_year AND p.period_month = w.period_month
LEFT JOIN branches b         ON b.id = u.branch_id
LEFT JOIN scoring_rules r    ON r.branch_id = u.branch_id;

COMMENT ON VIEW report_staff_monthly IS
  'One row per person × month × form: the four weekly percentages on that form (NULL = unmarked), their average, and the pass/verified counts. form_key is the checklist the marks were on — someone promoted mid-month has a row per form. due_from_week = the week they are due a mark from (the week they were added, in that month). Outlet and role are the person''s current ones; marked_at is where the marks were scored. supervisor_title is sv/asisten/NULL, meaningful for role = supervisor only.';

-- Same rule as every other report view: run as the caller, not the owner.
ALTER VIEW report_due             SET (security_invoker = true);
ALTER VIEW report_branch_weekly   SET (security_invoker = true);
ALTER VIEW report_branch_monthly  SET (security_invoker = true);
ALTER VIEW report_company_monthly SET (security_invoker = true);
ALTER VIEW report_staff_monthly   SET (security_invoker = true);
