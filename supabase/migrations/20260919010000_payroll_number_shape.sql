-- Payroll numbers are whatever payroll issues.
--
-- 20260918020000 held users.id to "two letters and four digits" — the shape
-- of every number in the source workbooks. Payroll's real series are wider
-- than that (TPG001, for one), so the rule was refusing genuine numbers.
--
-- What has to stay true is narrower: the number is the login's synthetic
-- address (kp0093@checklist.local) and part of a URL, so it must be letters
-- and digits with nothing else — no spaces, no punctuation — and short.
-- The app upper-cases on the way in; the check insists on it here too, so
-- one person cannot exist twice as KP0093 and kp0093.

ALTER TABLE users DROP CONSTRAINT users_id_format;
ALTER TABLE users ADD CONSTRAINT users_id_format
  CHECK (id ~ '^[A-Z0-9]{2,12}$') NOT VALID;

COMMENT ON COLUMN users.id IS
  'Payroll number as issued by payroll: upper-case letters and digits, 2–12 characters. The identity and the key; may be changed by admin, and every reference follows it.';
