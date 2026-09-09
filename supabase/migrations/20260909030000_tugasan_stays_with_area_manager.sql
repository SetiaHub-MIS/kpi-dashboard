-- Tugasan is the Area Manager's own weekly self-check, and it stays theirs.
--
-- The previous migration let general_manager and human_resources write it,
-- reading "cross-branch, managers task" as oversight-with-edit. It is not: head
-- office reads the self-check to see whether it was done, but does not fill it
-- in on someone else's behalf. Signing off your own inspection is the whole
-- point of the record.
--
-- Read access is unchanged — app_can_see_branch() still shows every outlet to a
-- cross-branch role.

DROP POLICY tugasan_checks_write ON tugasan_checks;
DROP POLICY tugasan_signoffs_write ON tugasan_signoffs;

CREATE POLICY tugasan_checks_write ON tugasan_checks FOR ALL TO authenticated
  USING (app_can_see_branch(branch_id) AND (app_role() = 'area_manager' OR app_is_admin()))
  WITH CHECK (app_can_see_branch(branch_id) AND (app_role() = 'area_manager' OR app_is_admin()));

CREATE POLICY tugasan_signoffs_write ON tugasan_signoffs FOR ALL TO authenticated
  USING (app_can_see_branch(branch_id) AND (app_role() = 'area_manager' OR app_is_admin()))
  WITH CHECK (app_can_see_branch(branch_id) AND (app_role() = 'area_manager' OR app_is_admin()));
