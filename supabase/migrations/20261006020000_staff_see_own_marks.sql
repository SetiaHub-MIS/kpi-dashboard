-- Shop and store staff read their own marks, and nobody else's.
--
-- Until now marks_read let anyone at an outlet read every mark there: the
-- phone app showed pekerja only their own, but a signed-in pekerja calling
-- the API with their own session could read a colleague's weekly scores.
-- Found while documenting the database (docs/database.md, 6 Oct 2026); the
-- user's ruling: staff see only their own marks.
--
-- The roles that are marked and mark nobody — staff, store, clerk — now pass
-- marks_read only on their own rows. Everyone else keeps exactly the reach
-- they had: SV/AS and Area Managers still read their outlets (they score and
-- verify there), head office still reads everything it did.
--
-- mark_lines and mark_verifications need no change of their own: their read
-- policies look the mark up in marks, and that lookup runs under this policy,
-- so a colleague's per-perkara lines and verification disappear with the
-- mark. The report_* views are security_invoker and narrow the same way.
--
-- The role test is wrapped in (SELECT …) so it is evaluated once per query,
-- as 20261002030000 does for the head-office test.

ALTER POLICY marks_read ON marks
  USING (
    ((SELECT app_is_cross_branch()) AND (form_key <> 'stor' OR (SELECT app_can_see_store_ops())))
    OR user_id = (SELECT app_user_id())
    OR ((SELECT app_role()) NOT IN ('staff', 'store', 'clerk')
        AND app_can_see_mark(branch_id, form_key))
  );
