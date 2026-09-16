-- Supervisors and Area Managers add their own crew.
--
-- Until now only admin could write a users row, so a new pekerja starting at
-- Machang meant a call to head office before anyone could mark them. The
-- people who actually know a hire has started are the SV/AS and the Area
-- Manager at that outlet, so they may now create the row themselves — and
-- nothing more. The check is deliberately narrow:
--
--   * pekerja kedai only. A supervisor cannot mint another supervisor, an
--     Area Manager, or an admin for themselves.
--   * posted to an outlet the caller already covers, through the same
--     app_can_see_branch() every scoped policy uses. A branch they cannot
--     read is a branch they cannot hire into.
--   * no login attached. auth_user_id stays NULL; the login is still issued
--     by admin through provision_logins.sql, because RLS cannot reach
--     auth.users and a client-side service role is out of the question.
--
-- Everything else about a person — promotion, transfer, deactivation — stays
-- with admin under users_write. This is INSERT only, on purpose.

CREATE POLICY users_insert_branch_staff ON users FOR INSERT TO authenticated
  WITH CHECK (
    app_role() IN ('supervisor', 'area_manager')
    AND role = 'staff'
    AND branch_id IS NOT NULL
    AND app_can_see_branch(branch_id)
    AND auth_user_id IS NULL
  );

COMMENT ON POLICY users_insert_branch_staff ON users IS
  'SV/AS and Area Managers may add pekerja kedai to an outlet they cover. Role, branch and login are all pinned; admin does the rest.';
