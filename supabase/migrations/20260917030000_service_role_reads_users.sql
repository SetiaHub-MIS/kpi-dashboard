-- The service role may read the directory.
--
-- payroll-auth resolves a payroll number to its login address under the
-- service role — the one place that lookup is allowed to happen, so that
-- no phone ever learns an address. Supabase grants service_role ALL on
-- every table by default privilege, and this database was assumed to have
-- that. It did not: the function's read came back 42501 (17 Sep 2026) and,
-- because the function treats "no row" and "cannot read" alike, every
-- account with a real e-mail silently fell back to its synthetic address
-- and could neither sign in nor be sent a reset.
--
-- Granted narrowly, in the spirit of grants.sql: SELECT on users is all the
-- function needs. service_role bypasses row-level security, so this is a
-- full read of the directory — which is the point, and why it is confined
-- to code that runs on Supabase's side. verify_policies.sql now checks it.

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON users TO service_role;
