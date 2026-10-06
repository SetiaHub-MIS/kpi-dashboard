-- Human Resources does Admin's job, and only Admin's job.
--
-- HR was a reports-only role: turned away from the phone app, reading the
-- company through the reporting web app, and — left over from the first
-- schema — reading and writing returns. From 6 Oct 2026 HR works the phone
-- app's administration console beside Admin: accounts, roles, outlets. No
-- returns, no reporting duties.
--
-- "Same as Admin" is taken literally, so every role predicate now answers the
-- same for both:
--
--   * app_is_admin() — the gate on users, user_branches, branches, the
--     change logs, checklist reference data and set_supervisor_title() —
--     is true for HR too. That one change is what lets HR manage people and
--     outlets; every policy written against it follows without being touched.
--   * app_can_see_returns() / app_is_returns_writer() drop HR, exactly as
--     20260909030100 dropped Admin.
--   * app_is_exec(), app_is_cross_branch() and app_can_see_store_ops()
--     already treated the two alike and are unchanged.
--
-- The General Manager keeps everything it had.

CREATE OR REPLACE FUNCTION app_is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'human_resources')
       FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION app_is_admin() IS
  'The administration console: Admin and, since 20261006010000, Human Resources. Accounts, roles, outlets, reference data.';

CREATE OR REPLACE FUNCTION app_can_see_returns()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role NOT IN ('manager', 'admin', 'human_resources')
       FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION app_is_returns_writer()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role IN ('store', 'clerk', 'general_manager')
       FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1),
    false
  );
$$;
