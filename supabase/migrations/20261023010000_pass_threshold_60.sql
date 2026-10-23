-- Pass mark down from 80% to 60%, at every outlet and HQ.
--
-- 80% meant scoring 4 out of 5 on every perkara to pass. The user's ruling
-- (23 Oct 2026): 60% — an average of 3 out of 5 — for every outlet, every
-- form, every month. report_marks.is_pass compares against scoring_rules at
-- query time, so this re-grades the past months too; that was intended, so
-- old and new pass rates stay comparable.

UPDATE scoring_rules SET pass_threshold = 60 WHERE pass_threshold <> 60;

ALTER TABLE scoring_rules ALTER COLUMN pass_threshold SET DEFAULT 60;

-- Expect 39 rows (38 kedai + HQ), all at 60.
SELECT count(*) AS outlets, min(pass_threshold) AS lowest, max(pass_threshold) AS highest
  FROM scoring_rules;
