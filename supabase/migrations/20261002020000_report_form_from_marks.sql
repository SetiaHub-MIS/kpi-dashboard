-- A person-month is filed under the form the person was marked on.
--
-- report_due and report_staff_monthly filed every month under the form of
-- the person's CURRENT role. Three pekerja kedai were promoted to SV/AS
-- during 2026 (KK0005, KM0010, PM0029 — docs/marks-import-2026.md §3.6), and
-- their months as pekerja came out under SV/AS: the reports app's staff
-- table showed kedai weeks as SV/AS weeks and ranked them among the
-- supervisors, and report_due counted them as due an SV/AS mark in months
-- they were pekerja — in the outlet's SV/AS headcount, out of its kedai one.
--
-- The form someone was on in a month is the form they were marked on:
--
--   * report_due files a month under the form of the person's LAST mark in
--     it, and falls back to the current role's form only for a month with no
--     mark at all. Nothing else records a past role that GM/HR may read —
--     role_changes is admin-only, and the paper-era promotions predate it —
--     so an unmarked month before a role change still lands on the new form.
--     A person marked in a month is due in it whatever their role is now.
--   * report_staff_monthly gives one row per person × month × form, each row
--     holding only that form's marks. Someone promoted mid-month has two rows
--     for that month — their last kedai weeks and their first SV/AS weeks —
--     instead of one row averaging two different checklists together.
--
-- Outlet and role stay the person's current ones, as before; report_marks and
-- the branch/company views already grouped marks by marks.form_key. Nothing
-- changes for anyone who has only ever been on one form.

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
       p.due_weeks
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
  'One row per active person × month in which they are due a weekly mark, at the outlet they are posted to now, under the form they were last marked on that month (their current role''s form when unmarked).';

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
       u.supervisor_title
FROM weeks w
JOIN users u                 ON u.id = w.user_id
JOIN report_periods p        ON p.period_year = w.period_year AND p.period_month = w.period_month
LEFT JOIN branches b         ON b.id = u.branch_id
LEFT JOIN scoring_rules r    ON r.branch_id = u.branch_id;

COMMENT ON VIEW report_staff_monthly IS
  'One row per person × month × form: the four weekly percentages on that form (NULL = unmarked), their average, and the pass/verified counts. form_key is the checklist the marks were on — someone promoted mid-month has a row per form. Outlet and role are the person''s current ones; marked_at is where the marks were scored. supervisor_title is sv/asisten/NULL, meaningful for role = supervisor only.';

-- Same rule as every other report view: run as the caller, not the owner.
ALTER VIEW report_due            SET (security_invoker = true);
ALTER VIEW report_staff_monthly  SET (security_invoker = true);
