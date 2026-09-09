-- Returns are an operational record, and admin is for administration.
--
-- Admin was carried through the returns policies as a general escape hatch, the
-- way it is on marks and assets. That is no longer wanted: the pulangan
-- workflow belongs to the people who run it — pekerja stor and kerani stor at
-- the outlet, general manager and human resources over all of them — and the
-- system administrator has no business in it.
--
-- The stor *marks* are untouched: this is about returns, not about the
-- 17-perkara checklist, so app_can_see_store_ops() keeps its meaning.

-- Two roles are now shut out of returns entirely: 'manager', whose remit stops
-- at the kedai side, and 'admin', whose remit is the staff directory.
CREATE OR REPLACE FUNCTION app_can_see_returns()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role NOT IN ('manager', 'admin')
       FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION app_can_see_returns() IS
  'The returns predicate. Narrower than app_can_see_store_ops(), which still lets admin see stor marks.';

-- Head office on the returns side is the general manager and HR, not admin.
CREATE OR REPLACE FUNCTION app_is_returns_writer()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role IN ('store', 'clerk', 'general_manager', 'human_resources')
       FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1),
    false
  );
$$;

DROP POLICY IF EXISTS returns_read        ON returns;
DROP POLICY IF EXISTS returns_write       ON returns;
DROP POLICY IF EXISTS return_events_read  ON return_events;
DROP POLICY IF EXISTS return_events_write ON return_events;
DROP POLICY IF EXISTS suppliers_write     ON suppliers;

CREATE POLICY returns_read ON returns FOR SELECT TO authenticated
  USING (app_can_see_branch(branch_id) AND app_can_see_returns());

CREATE POLICY returns_write ON returns FOR ALL TO authenticated
  USING (app_can_see_branch(branch_id) AND app_is_returns_writer())
  WITH CHECK (app_can_see_branch(branch_id) AND app_is_returns_writer());

CREATE POLICY return_events_read ON return_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM returns r WHERE r.id = return_id
                   AND app_can_see_branch(r.branch_id) AND app_can_see_returns()));

CREATE POLICY return_events_write ON return_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM returns r WHERE r.id = return_id
                   AND app_can_see_branch(r.branch_id))
         AND app_is_returns_writer())
  WITH CHECK (EXISTS (SELECT 1 FROM returns r WHERE r.id = return_id
                        AND app_can_see_branch(r.branch_id))
              AND app_is_returns_writer());

-- Suppliers are named while logging a return, so the same set writes them.
CREATE POLICY suppliers_write ON suppliers FOR INSERT TO authenticated
  WITH CHECK (app_is_returns_writer());
