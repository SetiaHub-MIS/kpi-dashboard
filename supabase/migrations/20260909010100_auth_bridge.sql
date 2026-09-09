-- Bridge Supabase Auth to the staff directory.
--
-- Sign-in issues a UUID, but users.id is the payroll number (KP0093) and every
-- mark, return and audit row hangs off it. Renumbering people to UUIDs would
-- orphan that history, so the two identities are linked rather than merged.

ALTER TABLE users
  ADD COLUMN auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.auth_user_id IS
  'Supabase Auth account for this staff member. NULL = no login issued yet; the person still appears in listings and can still be marked.';

CREATE INDEX users_auth_user_idx ON users (auth_user_id) WHERE auth_user_id IS NOT NULL;

-- ----------------------------------------------------------- rls helpers ----
--
-- These exist to break a circular dependency. Branch scoping needs the caller's
-- branch_id, which lives in users — the very table the policy guards. A policy
-- that queries users directly re-enters its own policy and the table locks up
-- under itself.
--
-- SECURITY DEFINER runs the lookup as the function owner, outside RLS, which
-- cuts the loop. search_path is pinned because a SECURITY DEFINER function that
-- resolves names against the caller's search_path is a privilege-escalation
-- vector.

CREATE FUNCTION app_branch_id()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT branch_id FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1;
$$;

CREATE FUNCTION app_role()
  RETURNS user_role
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT role FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1;
$$;

CREATE FUNCTION app_user_id()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1;
$$;

-- Four roles carry no branch of their own (branch_id IS NULL) and see every
-- outlet, so each branch predicate needs an explicit escape for them.
CREATE FUNCTION app_is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1),
    false
  );
$$;

CREATE FUNCTION app_is_cross_branch()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role IN ('manager', 'general_manager', 'human_resources', 'admin')
       FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION app_is_cross_branch() IS
  'Reads every outlet. Says nothing about writing, and nothing about the stor side — see app_can_see_store_ops().';

-- The head-office roles that may change operational data anywhere: marks,
-- verifications, tugasan and assets. Admin keeps its own reach for the
-- administration tables (users, branches, forms).
CREATE FUNCTION app_is_exec()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role IN ('general_manager', 'human_resources', 'admin')
       FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1),
    false
  );
$$;

-- 'manager' is cross-branch on the kedai side only. Returns and the 17-perkara
-- stor marks are the stor operation, and that role does not see them at all.
CREATE FUNCTION app_can_see_store_ops()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role <> 'manager' FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1),
    false
  );
$$;

-- True when the caller may act on this branch: a cross-branch role sees all, an
-- Area Manager sees every outlet assigned to them, everyone else sees their own.
CREATE FUNCTION app_can_see_branch(target text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT app_is_cross_branch()
     OR (target IS NOT NULL AND target = app_branch_id())
     OR (target IS NOT NULL AND EXISTS (
           SELECT 1 FROM user_branches ub
            WHERE ub.branch_id = target
              AND ub.user_id = app_user_id()));
$$;

COMMENT ON FUNCTION app_can_see_branch(text) IS
  'The single branch predicate every scoped policy calls. Change scoping rules here, not in twenty policies.';

-- Marks carry the form they were scored under, so the stor exclusion rides
-- along with the branch check rather than being repeated at each call site.
CREATE FUNCTION app_can_see_mark(target_branch text, target_form text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT app_can_see_branch(target_branch)
     AND (target_form <> 'stor' OR app_can_see_store_ops());
$$;

COMMENT ON FUNCTION app_can_see_mark(text, text) IS
  'Branch scoping plus the stor exclusion. A 17-perkara mark is invisible to the cross-branch manager role.';
