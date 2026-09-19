-- The report_* views: what the reporting web app (reports-web/) reads.
--
-- Head office reads the company's numbers in a second front end on this same
-- database. So that both apps quote the same figures, every aggregate lives
-- here rather than being assembled in a browser: the pass rule, the coverage
-- denominator, what counts as verified, the ageing states. The reports app
-- displays what these views return and derives nothing of its own beyond
-- adding counts together.
--
-- Every view is security_invoker, so it returns exactly what the caller's own
-- policies let them see: everything for general_manager and human_resources,
-- one outlet for a supervisor. No view here widens anyone's reach.
--
-- Definitions that are easy to get wrong, settled once:
--
--   * A person is DUE a mark in a month when they are active, posted to an
--     outlet, on a role that has a checklist form, and had joined by the end
--     of that month — or were marked in it, whatever joined_on says (people
--     carried in from the workbooks got joined_on = the day they were
--     inserted). Inactive people drop out of every denominator and keep every
--     mark they ever received.
--   * A week is DUE once it has started (Malaysia time). A gap in a week that
--     has not begun is not a finding, so coverage is measured over due weeks.
--   * MARKED is counted where the mark was scored (marks.branch_id, the
--     snapshot); GAPS are counted where the person is posted now. After a
--     transfer the two populations differ slightly, and each column stays
--     true on its own.
--   * The score a report uses is the one the phone app shows: the manager's
--     adjusted total when a verification carries one, the SV/AS total
--     otherwise. Pass is that percentage against the outlet's pass_threshold.
--   * VERIFIED means a mark_verifications row exists. Its absence is the
--     finding the workbooks' empty MANAGER column was.

-- ------------------------------------------------- every outlet has rules ----
-- scoring_rules was seeded for three branches; the other 36 had no row, and
-- the phone app fell back to a constant 80. A view that joins the rule must
-- find one, so every branch gets a row carrying the table's own defaults, and
-- a new branch gets one the moment it is created.

INSERT INTO scoring_rules (branch_id)
SELECT b.id FROM branches b
 WHERE NOT EXISTS (SELECT 1 FROM scoring_rules r WHERE r.branch_id = b.id);

CREATE FUNCTION branches_default_scoring_rule()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO scoring_rules (branch_id) VALUES (NEW.id)
  ON CONFLICT (branch_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER branches_default_scoring_rule
  AFTER INSERT ON branches
  FOR EACH ROW EXECUTE FUNCTION branches_default_scoring_rule();

-- ------------------------------------------------------------ the clock ----

-- Today in Malaysia. The server runs on UTC and a mark entered at 11pm in
-- Kelantan belongs to that day, not the next. Malaysia has no daylight saving,
-- so a fixed offset is exact.
CREATE FUNCTION report_today() RETURNS date
  LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE 'UTC' + interval '8 hours')::date
$$;

-- Which of the four checklist weeks a date falls in. The form gives every
-- month four columns whatever its length, so day 22 onwards is week 4. This
-- mirrors weekOfMonth() in marks-app/src/data/period.ts; change both or
-- neither.
CREATE FUNCTION report_week_of(d date) RETURNS int
  LANGUAGE sql IMMUTABLE AS $$
  SELECT LEAST(4, GREATEST(1, ceil(extract(day FROM d) / 7.0)::int))
$$;

-- The months a report can be asked about: from the first month anything was
-- recorded up to the current one, so the current month exists before anyone
-- has marked in it — a month of nothing is the finding, not an absent row.
-- due_weeks is how many of its four weeks have started.
CREATE VIEW report_periods AS
WITH first_month AS (
  SELECT LEAST(
           date_trunc('month', report_today())::date,
           (SELECT min(make_date(period_year, period_month, 1)) FROM marks),
           (SELECT min(make_date(period_year, period_month, 1)) FROM tugasan_checks),
           (SELECT min(date_trunc('month', occurred_on))::date FROM return_events)
         ) AS m
)
SELECT extract(year  FROM s.m)::int                          AS period_year,
       extract(month FROM s.m)::int                          AS period_month,
       (s.m + interval '1 month' - interval '1 day')::date   AS period_end,
       CASE
         WHEN s.m::date = date_trunc('month', report_today())::date THEN report_week_of(report_today())
         WHEN s.m::date <  date_trunc('month', report_today())::date THEN 4
         ELSE 0
       END                                                   AS due_weeks
FROM first_month f
CROSS JOIN LATERAL generate_series(f.m::timestamp, date_trunc('month', report_today())::timestamp, interval '1 month') AS s(m);

COMMENT ON VIEW report_periods IS
  'The months reports run over, oldest first, ending with the current month. due_weeks = checklist weeks that have started.';

-- ------------------------------------------------------- who is due what ----

CREATE VIEW report_due AS
SELECT u.id            AS user_id,
       u.branch_id,
       u.role,
       f.key           AS form_key,
       p.period_year,
       p.period_month,
       p.due_weeks
FROM users u
JOIN checklist_forms f ON f.applies_to = u.role
CROSS JOIN report_periods p
WHERE u.active
  AND u.branch_id IS NOT NULL
  AND (u.joined_on <= p.period_end
       OR EXISTS (SELECT 1 FROM marks m
                   WHERE m.user_id = u.id
                     AND m.period_year = p.period_year
                     AND m.period_month = p.period_month));

COMMENT ON VIEW report_due IS
  'One row per active person × month in which they are due a weekly mark, at the outlet they are posted to now.';

-- ------------------------------------------------ one row per mark, judged ----

CREATE VIEW report_marks AS
SELECT m.id              AS mark_id,
       m.user_id,
       m.branch_id,
       m.form_key,
       m.period_year,
       m.period_month,
       m.week_no,
       m.total_score,
       m.max_score,
       m.pct,
       v.adjusted_to,
       -- What the phone app shows once a manager has adjusted the total.
       CASE WHEN v.adjusted_to IS NULL THEN m.pct
            ELSE round(v.adjusted_to * 100.0 / m.max_score)::int END AS final_pct,
       r.pass_threshold,
       (CASE WHEN v.adjusted_to IS NULL THEN m.pct
             ELSE round(v.adjusted_to * 100.0 / m.max_score)::int END) >= r.pass_threshold AS is_pass,
       (v.mark_id IS NOT NULL) AS is_verified,
       v.verified_by,
       v.verified_at,
       m.scored_by,
       m.scored_at,
       m.note
FROM marks m
JOIN scoring_rules r ON r.branch_id = m.branch_id
LEFT JOIN mark_verifications v ON v.mark_id = m.id;

COMMENT ON VIEW report_marks IS
  'Every mark with the pass rule already applied. final_pct is the figure the phone app shows; pct is the SV/AS score before any adjustment.';

-- -------------------------------------------------- outlet × week × form ----

CREATE VIEW report_branch_weekly AS
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
  SELECT branch_id, period_year, period_month, form_key, count(*)::int AS headcount
  FROM report_due
  GROUP BY 1, 2, 3, 4
),
gap AS (
  SELECT d.branch_id, d.period_year, d.period_month, d.form_key, w.week_no, count(*)::int AS gaps
  FROM report_due d
  CROSS JOIN generate_series(1, 4) AS w(week_no)
  WHERE NOT EXISTS (SELECT 1 FROM marks m
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
LEFT JOIN gap g    ON g.branch_id = c.branch_id AND g.period_year = c.period_year
                  AND g.period_month = c.period_month AND g.form_key = c.form_key
                  AND g.week_no = c.week_no
LEFT JOIN scored s ON s.branch_id = c.branch_id AND s.period_year = c.period_year
                  AND s.period_month = c.period_month AND s.form_key = c.form_key
                  AND s.week_no = c.week_no
JOIN scoring_rules r ON r.branch_id = c.branch_id;

COMMENT ON VIEW report_branch_weekly IS
  'Outlet × month × week × form. headcount = people due, marked = marks scored there, gaps = due people with no mark, passed/verified out of marked. avg_pct NULL when nothing was marked; pct_sum is there for re-aggregation only.';

-- --------------------------------------------------------- outlet × month ----

CREATE VIEW report_branch_monthly AS
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
       CASE WHEN max(headcount) * count(*) FILTER (WHERE week_due) > 0
            THEN round((max(headcount) * count(*) FILTER (WHERE week_due)
                        - sum(gaps) FILTER (WHERE week_due)) * 100.0
                       / (max(headcount) * count(*) FILTER (WHERE week_due)))::int END AS coverage_pct
FROM report_branch_weekly
GROUP BY branch_id, branch_name, branch_short, period_year, period_month, form_key, pass_threshold;

COMMENT ON VIEW report_branch_monthly IS
  'Outlet × month × form. coverage_pct = share of due person-weeks (headcount × weeks started) that were marked; pass_rate_pct and verified_pct are out of marked.';

-- ---------------------------------------------------------- company-wide ----

CREATE VIEW report_company_weekly AS
SELECT period_year, period_month, week_no, form_key, bool_and(week_due) AS week_due,
       sum(headcount)::int AS headcount,
       sum(marked)::int    AS marked,
       sum(gaps)::int      AS gaps,
       sum(passed)::int    AS passed,
       CASE WHEN sum(marked) > 0
            THEN round(sum(pct_sum) * 1.0 / sum(marked))::int END AS avg_pct,
       sum(pct_sum)::int   AS pct_sum,
       sum(verified)::int  AS verified,
       CASE WHEN sum(marked) > 0
            THEN round(sum(passed) * 100.0 / sum(marked))::int END AS pass_rate_pct,
       CASE WHEN sum(marked) > 0
            THEN round(sum(verified) * 100.0 / sum(marked))::int END AS verified_pct,
       CASE WHEN bool_and(week_due) AND sum(headcount) > 0
            THEN round((sum(headcount) - sum(gaps)) * 100.0 / sum(headcount))::int END AS coverage_pct
FROM report_branch_weekly
GROUP BY period_year, period_month, week_no, form_key;

CREATE VIEW report_company_monthly AS
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
       CASE WHEN sum(headcount * due_weeks) > 0
            THEN round((sum(headcount * due_weeks) - sum(gaps)) * 100.0
                       / sum(headcount * due_weeks))::int END AS coverage_pct
FROM report_branch_monthly
GROUP BY period_year, period_month, form_key;

COMMENT ON VIEW report_company_monthly IS
  'The whole company, one row per month × form. Sums of the outlet rows; the ratios are re-derived from those sums, never averaged across outlets.';

-- ------------------------------------------------------- person × month ----

CREATE VIEW report_staff_monthly AS
WITH people AS (
  SELECT user_id, period_year, period_month FROM report_due
  UNION
  SELECT m.user_id, m.period_year, m.period_month
  FROM marks m
  JOIN report_periods p ON p.period_year = m.period_year AND p.period_month = m.period_month
),
weeks AS (
  SELECT pp.user_id, pp.period_year, pp.period_month,
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
  GROUP BY 1, 2, 3
)
SELECT w.user_id,
       u.name,
       u.short_name,
       u.role,
       f.key                AS form_key,
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
       rank() OVER (PARTITION BY w.period_year, w.period_month, u.branch_id, f.key
                    ORDER BY w.avg_pct DESC NULLS LAST, w.marked_weeks DESC) AS rank_in_branch
FROM weeks w
JOIN users u                 ON u.id = w.user_id
JOIN report_periods p        ON p.period_year = w.period_year AND p.period_month = w.period_month
LEFT JOIN checklist_forms f  ON f.applies_to = u.role
LEFT JOIN branches b         ON b.id = u.branch_id
LEFT JOIN scoring_rules r    ON r.branch_id = u.branch_id;

COMMENT ON VIEW report_staff_monthly IS
  'One row per person × month: the four weekly percentages (NULL = unmarked), their average, and the pass/verified counts. Outlet and role are the person''s current ones; marked_at is where the marks were scored.';

-- ---------------------------------------------------------------- returns ----

CREATE VIEW report_returns_branch_monthly AS
SELECT s.branch_id,
       b.name                                                     AS branch_name,
       b.short_name                                               AS branch_short,
       extract(year  FROM s.received_on)::int                     AS year,
       extract(month FROM s.received_on)::int                     AS month,
       count(*)::int                                              AS received,
       count(*) FILTER (WHERE s.is_on_time)::int                  AS submitted_on_time,
       count(*) FILTER (WHERE NOT s.is_submitted)::int            AS not_submitted,
       round(count(*) FILTER (WHERE s.is_on_time) * 100.0 / count(*))::int AS submission_pct,
       count(*) FILTER (WHERE NOT a.is_cleared)::int              AS open,
       count(*) FILTER (WHERE a.status = 'breach')::int           AS breach,
       count(*) FILTER (WHERE a.status = 'overdue')::int          AS overdue,
       round(avg(t.turnaround_days) FILTER (WHERE t.is_cleared), 1) AS avg_turnaround_days
FROM return_submission s
JOIN return_ageing a     ON a.id = s.id
JOIN return_turnaround t ON t.id = s.id
JOIN branches b          ON b.id = s.branch_id
GROUP BY s.branch_id, b.name, b.short_name,
         extract(year FROM s.received_on), extract(month FROM s.received_on);

COMMENT ON VIEW report_returns_branch_monthly IS
  'Returns by outlet and the calendar month they were received in. open/breach/overdue are as of today for the lists received that month; avg_turnaround_days over the cleared ones.';

CREATE VIEW report_returns_open AS
SELECT a.id,
       a.ref,
       a.branch_id,
       b.name                     AS branch_name,
       b.short_name               AS branch_short,
       r.bill_no,
       r.bill_date,
       r.reason,
       r.disposition,
       sp.name                    AS supplier_name,
       a.received_on,
       a.age_days,
       a.limit_on,
       a.clear_by,
       a.status,
       last.stage                 AS last_stage,
       last.occurred_on           AS last_stage_on
FROM return_ageing a
JOIN returns r          ON r.id = a.id
JOIN branches b         ON b.id = a.branch_id
LEFT JOIN suppliers sp  ON sp.id = r.supplier_id
LEFT JOIN LATERAL (
  SELECT e.stage, e.occurred_on
  FROM return_events e
  WHERE e.return_id = a.id
  ORDER BY stage_rank(e.stage) DESC
  LIMIT 1
) last ON true
WHERE NOT a.is_cleared;

COMMENT ON VIEW report_returns_open IS
  'Every return not yet adjusted, with its ageing status, supplier and the last stage it reached. The breach/overdue list is a filter on status.';

-- ---------------------------------------------------------------- tugasan ----

CREATE VIEW report_tugasan_branch_monthly AS
SELECT b.id           AS branch_id,
       b.name         AS branch_name,
       b.short_name   AS branch_short,
       p.period_year,
       p.period_month,
       p.due_weeks,
       (SELECT count(DISTINCT s.week_no)::int FROM tugasan_signoffs s
         WHERE s.branch_id = b.id AND s.period_year = p.period_year
           AND s.period_month = p.period_month AND s.filled_by IS NOT NULL)  AS weeks_filled,
       (SELECT count(DISTINCT s.week_no)::int FROM tugasan_signoffs s
         WHERE s.branch_id = b.id AND s.period_year = p.period_year
           AND s.period_month = p.period_month AND s.checked_by IS NOT NULL) AS weeks_checked,
       (SELECT count(*)::int FROM tugasan_checks c
         WHERE c.branch_id = b.id AND c.period_year = p.period_year
           AND c.period_month = p.period_month AND c.done)                   AS items_done,
       (SELECT count(*)::int FROM tugasan_items)                            AS items_per_week,
       4 * (SELECT count(*)::int FROM tugasan_items)                        AS items_total
FROM branches b
CROSS JOIN report_periods p
WHERE b.active;

COMMENT ON VIEW report_tugasan_branch_monthly IS
  'The Area Manager''s weekly self-check, per outlet and month: weeks stamped as filled and as checked (of 4), and items ticked. HQ Jenjarom has no Area Manager, so its row is always empty.';

-- ----------------------------------------------------------------- scope ----
-- Same rule as every other view here: run as the caller, not the owner.

ALTER VIEW report_periods                 SET (security_invoker = true);
ALTER VIEW report_due                     SET (security_invoker = true);
ALTER VIEW report_marks                   SET (security_invoker = true);
ALTER VIEW report_branch_weekly           SET (security_invoker = true);
ALTER VIEW report_branch_monthly          SET (security_invoker = true);
ALTER VIEW report_company_weekly          SET (security_invoker = true);
ALTER VIEW report_company_monthly         SET (security_invoker = true);
ALTER VIEW report_staff_monthly           SET (security_invoker = true);
ALTER VIEW report_returns_branch_monthly  SET (security_invoker = true);
ALTER VIEW report_returns_open            SET (security_invoker = true);
ALTER VIEW report_tugasan_branch_monthly  SET (security_invoker = true);
