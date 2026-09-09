-- Pekerja stor and kerani stor work at HQ Jenjarom, not at a kedai.
--
-- One central store receives returns from all 38 outlets, so the two stor roles
-- are posted to the HQ branch. That breaks the branch predicate for them:
-- returns.branch_id is the outlet the goods came *from*, so scoping the store
-- team to their own branch_id would show them only returns raised by HQ itself,
-- which is none of them.
--
-- Their 17-perkara marks stay branch-scoped in the ordinary way — those belong
-- to HQ, which is where they are posted. It is only returns that reach across.

CREATE OR REPLACE FUNCTION app_is_central_store()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role IN ('store', 'clerk')
       FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION app_is_central_store() IS
  'The HQ stor team. They handle every outlet''s returns, so returns policies let them past the branch predicate.';

-- Branch scoping for returns specifically: the central store and head office
-- see every outlet, an Area Manager sees the ones assigned to them.
CREATE OR REPLACE FUNCTION app_can_see_branch_returns(target text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT app_is_central_store() OR app_can_see_branch(target);
$$;

DROP POLICY IF EXISTS returns_read        ON returns;
DROP POLICY IF EXISTS returns_write       ON returns;
DROP POLICY IF EXISTS return_events_read  ON return_events;
DROP POLICY IF EXISTS return_events_write ON return_events;

CREATE POLICY returns_read ON returns FOR SELECT TO authenticated
  USING (app_can_see_branch_returns(branch_id) AND app_can_see_returns());

CREATE POLICY returns_write ON returns FOR ALL TO authenticated
  USING (app_can_see_branch_returns(branch_id) AND app_is_returns_writer())
  WITH CHECK (app_can_see_branch_returns(branch_id) AND app_is_returns_writer());

CREATE POLICY return_events_read ON return_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM returns r WHERE r.id = return_id
                   AND app_can_see_branch_returns(r.branch_id) AND app_can_see_returns()));

CREATE POLICY return_events_write ON return_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM returns r WHERE r.id = return_id
                   AND app_can_see_branch_returns(r.branch_id))
         AND app_is_returns_writer())
  WITH CHECK (EXISTS (SELECT 1 FROM returns r WHERE r.id = return_id
                        AND app_can_see_branch_returns(r.branch_id))
              AND app_is_returns_writer());
