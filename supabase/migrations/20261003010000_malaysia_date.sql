-- Today is Malaysia's date, not the server's.
--
-- The server runs on UTC and CURRENT_DATE is the UTC date: from midnight to
-- 8am in Malaysia it is still yesterday there. Two things still read it:
--
--   * return_turnaround counted an open return's age to CURRENT_DATE, so for
--     the first eight hours of every Malaysian day each age read one day
--     young — and so did every ok / breach / overdue status built on it
--     (return_ageing, report_returns_open, report_returns_branch_monthly).
--   * users.joined_on defaulted to CURRENT_DATE, so a person added before
--     8am got the day before as their start. Since 20261002040000 a person is
--     due from the checklist week of joined_on; added before 8am on the 1st
--     they started in the previous month and showed up unmarked in its last
--     week.
--
-- Both now use report_today() (20260918040000), the date the rest of the
-- reports already count by. Rows written before this keep their joined_on.

CREATE OR REPLACE VIEW return_turnaround AS
SELECT
  r.id,
  r.ref,
  r.branch_id,
  r.bill_no,
  r.bill_date,
  r.reason,
  r.disposition,
  recv.occurred_on                                  AS received_on,
  adj.occurred_on                                   AS cleared_on,
  (adj.occurred_on IS NOT NULL)                     AS is_cleared,
  COALESCE(adj.occurred_on, report_today())
    - COALESCE(recv.occurred_on, r.bill_date)       AS turnaround_days
FROM returns r
LEFT JOIN return_events recv ON recv.return_id = r.id AND recv.stage = 'received'
LEFT JOIN return_events adj  ON adj.return_id  = r.id AND adj.stage  = 'adjusted';

-- CREATE OR REPLACE resets a view's options; run as the caller, as before.
ALTER VIEW return_turnaround SET (security_invoker = true);

ALTER TABLE users ALTER COLUMN joined_on SET DEFAULT report_today();
