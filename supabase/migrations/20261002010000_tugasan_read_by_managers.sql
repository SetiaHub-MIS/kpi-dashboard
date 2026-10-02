-- Tugasan is read by the people who fill it in and the people who oversee
-- it — not by the outlet it is about.
--
-- Until now the read policies asked only app_can_see_branch(), the outlet
-- check every scoped table uses. That is true for anyone posted to the
-- outlet, so a pekerja or SV/AS at Machang could read Machang's Tugasan —
-- petty-cash amounts, X-report status, the Area Manager's sign-offs — and the
-- app fetched it for them on every sign-in. Writing was always restricted;
-- reading never was.
--
-- Readers now: the Area Manager and Manager (app_manages_outlets()), and
-- GM, HR and admin (app_is_exec()), who check whether it was done. Reach is
-- still app_can_see_branch()'s question. One predicate for both tables, so
-- the two policies cannot drift apart.

CREATE FUNCTION app_can_read_tugasan(target text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT app_can_see_branch(target)
     AND (app_manages_outlets() OR app_is_exec());
$$;

COMMENT ON FUNCTION app_can_read_tugasan(text) IS
  'Tugasan read access: outlet reach plus an outlet-managing or head-office role. Staff, store and SV/AS at the outlet are not readers.';

DROP POLICY tugasan_checks_read ON tugasan_checks;
CREATE POLICY tugasan_checks_read ON tugasan_checks FOR SELECT TO authenticated
  USING (app_can_read_tugasan(branch_id));

DROP POLICY tugasan_signoffs_read ON tugasan_signoffs;
CREATE POLICY tugasan_signoffs_read ON tugasan_signoffs FOR SELECT TO authenticated
  USING (app_can_read_tugasan(branch_id));
