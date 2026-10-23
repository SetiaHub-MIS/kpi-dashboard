-- Expose the marks-app weekly catatan in the reports app.
--
-- Keep the existing report_staff_monthly columns in order and append notes
-- so CREATE OR REPLACE VIEW remains compatible with existing dependants.

CREATE OR REPLACE VIEW report_staff_monthly AS
WITH people AS (
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
         max(rm.branch_id)                                 AS marked_at,
         max(rm.note) FILTER (WHERE rm.week_no = 1)        AS w1_notes,
         max(rm.note) FILTER (WHERE rm.week_no = 2)        AS w2_notes,
         max(rm.note) FILTER (WHERE rm.week_no = 3)        AS w3_notes,
         max(rm.note) FILTER (WHERE rm.week_no = 4)        AS w4_notes
  FROM people pp
  LEFT JOIN report_marks rm ON rm.user_id = pp.user_id
                           AND rm.period_year = pp.period_year
                           AND rm.period_month = pp.period_month
                           AND rm.form_key = pp.form_key
  GROUP BY 1, 2, 3, 4
),
first_mark AS (
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
       rank() OVER (PARTITION BY w.period_year, w.period_month, u.branch_id, w.form_key
                    ORDER BY w.avg_pct DESC NULLS LAST, w.marked_weeks DESC) AS rank_in_branch,
       u.supervisor_title,
       report_first_week(u.joined_on, w.period_year, w.period_month, fm.week_no) AS due_from_week,
       w.w1_notes, w.w2_notes, w.w3_notes, w.w4_notes
FROM weeks w
JOIN users u                 ON u.id = w.user_id
JOIN report_periods p        ON p.period_year = w.period_year AND p.period_month = w.period_month
LEFT JOIN branches b         ON b.id = u.branch_id
LEFT JOIN scoring_rules r    ON r.branch_id = u.branch_id
LEFT JOIN first_mark fm      ON fm.user_id = w.user_id
                            AND fm.period_year = w.period_year
                            AND fm.period_month = w.period_month;

COMMENT ON VIEW report_staff_monthly IS
  'One row per person × month × form: weekly percentages, notes, average, pass/verified counts, and rank. Notes are the marks-app catatan recorded for each week.';

ALTER VIEW report_staff_monthly SET (security_invoker = true);
