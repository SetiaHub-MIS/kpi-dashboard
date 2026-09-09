-- Store staff KPI, three rules:
--
--   1. Every list received from an outlet is submitted to the kerani before
--      Friday of the week it arrived. Scored as on-time / received — miss 2 of
--      10 and the week scores 80%.
--   2. No return sits open longer than two months. Store and kerani share this;
--      neither can hit it alone, since the supplier steps are the kerani's.
--   3. Once a return does pass two months it has one week to clear.
--
-- Thresholds live here as functions so the rule is stated once. Change the
-- number in one place, not across the app and three reports.

CREATE FUNCTION return_age_limit_days() RETURNS int
  LANGUAGE sql IMMUTABLE AS $$ SELECT 60 $$;   -- "not over 2 months"

CREATE FUNCTION return_grace_days() RETURNS int
  LANGUAGE sql IMMUTABLE AS $$ SELECT 7 $$;    -- "clear within 1 week"

COMMENT ON FUNCTION return_age_limit_days() IS
  'Two months expressed in days. Calendar months vary; the KPI needs a fixed number to compare against.';

-- The chain gained a step, so the ranking that orders it has to follow.
CREATE OR REPLACE FUNCTION stage_rank(s return_stage) RETURNS int
  LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE s
    WHEN 'received'           THEN 1
    WHEN 'submitted_to_clerk' THEN 2
    WHEN 'segregated'         THEN 3
    WHEN 'supplier_called'    THEN 4
    WHEN 'discarded'          THEN 4
    WHEN 'picked_up'          THEN 5
    WHEN 'adjusted'           THEN 6
  END $$;

-- ------------------------------------------------- rule 1: submission KPI ----
--
-- The deadline is the first Friday on or after the list arrived — not the Friday
-- of its calendar week, which for a Saturday arrival would already have passed.
-- isodow: Monday 1 ... Friday 5 ... Sunday 7.
CREATE FUNCTION return_due_on(received date) RETURNS date
  LANGUAGE sql IMMUTABLE AS $$
  SELECT received + ((5 - EXTRACT(isodow FROM received)::int + 7) % 7)
$$;

COMMENT ON FUNCTION return_due_on(date) IS
  'Weekend arrivals roll into the following week''s batch rather than starting life already late.';

CREATE VIEW return_submission AS
SELECT
  r.id,
  r.ref,
  r.branch_id,
  recv.occurred_on                      AS received_on,
  sub.occurred_on                       AS submitted_on,
  return_due_on(recv.occurred_on)       AS due_on,
  sub.occurred_on IS NOT NULL           AS is_submitted,
  (sub.occurred_on IS NOT NULL
     AND sub.occurred_on <= return_due_on(recv.occurred_on)) AS is_on_time
FROM returns r
JOIN return_events recv ON recv.return_id = r.id AND recv.stage = 'received'
LEFT JOIN return_events sub ON sub.return_id = r.id AND sub.stage = 'submitted_to_clerk';

COMMENT ON VIEW return_submission IS
  'One row per return with its Friday deadline. A list submitted late counts against the week it arrived in, not the week it was finally handed over.';

CREATE VIEW return_submission_kpi AS
SELECT
  branch_id,
  EXTRACT(isoyear FROM received_on)::int       AS iso_year,
  EXTRACT(week    FROM received_on)::int       AS iso_week,
  count(*)::int                                AS received_count,
  count(*) FILTER (WHERE is_on_time)::int      AS on_time_count,
  count(*) FILTER (WHERE NOT is_submitted)::int AS missing_count,
  round(
    count(*) FILTER (WHERE is_on_time) * 100.0 / NULLIF(count(*), 0)
  )::int                                       AS pct
FROM return_submission
GROUP BY branch_id, iso_year, iso_week;

-- ------------------------------------------ rules 2 and 3: ageing status ----

CREATE VIEW return_ageing AS
SELECT
  t.id,
  t.ref,
  t.branch_id,
  t.received_on,
  t.turnaround_days                                    AS age_days,
  t.is_cleared,
  (t.received_on + return_age_limit_days())            AS limit_on,
  (t.received_on + return_age_limit_days()
                 + return_grace_days())                AS clear_by,
  CASE
    WHEN t.is_cleared THEN 'cleared'
    WHEN t.turnaround_days <= return_age_limit_days() THEN 'ok'
    WHEN t.turnaround_days <= return_age_limit_days() + return_grace_days() THEN 'breach'
    ELSE 'overdue'
  END                                                  AS status
FROM return_turnaround t;

COMMENT ON VIEW return_ageing IS
  'breach = past two months but still inside the one-week window to clear. overdue = that window is gone too.';

ALTER VIEW return_submission     SET (security_invoker = true);
ALTER VIEW return_submission_kpi SET (security_invoker = true);
ALTER VIEW return_ageing         SET (security_invoker = true);
