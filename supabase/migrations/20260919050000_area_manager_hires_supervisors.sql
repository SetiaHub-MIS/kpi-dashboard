-- An Area Manager may add an SV/AS, not only pekerja kedai.
--
-- 20260916010000 let SV/AS and Area Managers create their own crew, pinned
-- to pekerja kedai. An Area Manager is the one who appoints an outlet's
-- supervisor, so pinning them to staff meant a new SV/AS still needed a
-- call to head office. The reach is now one rung up the marking relation
-- for each: a supervisor adds the people they mark (staff), an Area Manager
-- adds the people they mark (SV/AS) and their crew. Everything else holds —
-- an outlet the caller covers, no login attached, INSERT only.

DROP POLICY users_insert_branch_staff ON users;
CREATE POLICY users_insert_branch_staff ON users FOR INSERT TO authenticated
  WITH CHECK (
    (
      (app_role() = 'supervisor' AND role = 'staff')
      OR (app_role() = 'area_manager' AND role IN ('staff', 'supervisor'))
    )
    AND branch_id IS NOT NULL
    AND app_can_see_branch(branch_id)
    AND auth_user_id IS NULL
  );

COMMENT ON POLICY users_insert_branch_staff ON users IS
  'SV/AS add pekerja kedai; Area Managers add pekerja kedai and SV/AS — at an outlet they cover, with no login attached. Admin does the rest.';
