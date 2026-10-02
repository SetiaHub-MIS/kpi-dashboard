-- A return list whose Friday has not come yet is not a missed handover.
--
-- report_returns_branch_monthly counted every list not yet sent to the clerk
-- as not_submitted, and scored submission_pct as on time over everything
-- received. A list that arrived on Monday and is still in the store on
-- Wednesday was therefore "never handed over" and pulled the outlet's on-time
-- rate down, though its deadline (return_due_on, the first Friday on or after
-- arrival) was two days away. Every current week read worse than it was.
--
-- Now, measured on Malaysia's date:
--
--   * not_submitted       = not sent to the clerk, and the deadline has passed.
--   * awaiting_handover   = not sent to the clerk, deadline today or later.
--                           New, at the end of the view.
--   * submission_pct      = on time over the lists that are decided: sent to
--                           the clerk (on time or late) or past their deadline.
--                           NULL while every list received is still awaiting.
--
-- received = on time + late + not_submitted + awaiting_handover. Months whose
-- Fridays have all passed read exactly as before.

CREATE OR REPLACE VIEW report_returns_branch_monthly AS
SELECT s.branch_id,
       b.name                                                     AS branch_name,
       b.short_name                                               AS branch_short,
       extract(year  FROM s.received_on)::int                     AS year,
       extract(month FROM s.received_on)::int                     AS month,
       count(*)::int                                              AS received,
       count(*) FILTER (WHERE s.is_on_time)::int                  AS submitted_on_time,
       count(*) FILTER (WHERE NOT s.is_submitted
                          AND s.due_on < report_today())::int     AS not_submitted,
       CASE WHEN count(*) FILTER (WHERE s.is_submitted OR s.due_on < report_today()) > 0
            THEN round(count(*) FILTER (WHERE s.is_on_time) * 100.0
                       / count(*) FILTER (WHERE s.is_submitted OR s.due_on < report_today()))::int
       END                                                        AS submission_pct,
       count(*) FILTER (WHERE NOT a.is_cleared)::int              AS open,
       count(*) FILTER (WHERE a.status = 'breach')::int           AS breach,
       count(*) FILTER (WHERE a.status = 'overdue')::int          AS overdue,
       round(avg(t.turnaround_days) FILTER (WHERE t.is_cleared), 1) AS avg_turnaround_days,
       count(*) FILTER (WHERE NOT s.is_submitted
                          AND s.due_on >= report_today())::int    AS awaiting_handover
FROM return_submission s
JOIN return_ageing a     ON a.id = s.id
JOIN return_turnaround t ON t.id = s.id
JOIN branches b          ON b.id = s.branch_id
GROUP BY s.branch_id, b.name, b.short_name,
         extract(year FROM s.received_on), extract(month FROM s.received_on);

COMMENT ON VIEW report_returns_branch_monthly IS
  'Returns by outlet and the calendar month they were received in. not_submitted = not handed to the clerk and past the Friday deadline; awaiting_handover = not handed over, deadline today or later; submission_pct = on time over the lists handed over or past their deadline (NULL while all are awaiting). open/breach/overdue are as of today for the lists received that month; avg_turnaround_days over the cleared ones.';

-- CREATE OR REPLACE resets a view's options; run as the caller, as before.
ALTER VIEW report_returns_branch_monthly SET (security_invoker = true);
