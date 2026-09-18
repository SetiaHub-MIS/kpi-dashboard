-- The Manager acts the way an Area Manager does — over every outlet.
--
-- 'manager' was introduced as a cross-branch reader of the kedai side. In
-- practice the Manager marks the SV/AS checklist and fills the weekly
-- Tugasan exactly as an Area Manager does; the only difference is reach:
-- an Area Manager has the outlets assigned to them, the Manager has all.
-- Until now every write policy named 'area_manager' alone (or head office
-- via app_is_exec(), which the Manager is not), so the app's Manager could
-- read everything and change nothing — and the refusals were silent.
--
-- One predicate, app_manages_outlets(), now says "acts as an outlet
-- manager" and every policy that meant that uses it. Two roles spelled out
-- in six places is how app_can_score() came to disagree with marks_update.
--
-- What does NOT change: the Manager stays blind to the stor operation.
-- app_can_see_mark() already refuses the stor form to that role, so a
-- Manager cannot score, verify or read a pekerja stor mark, and returns
-- remain out of reach through app_can_see_store_ops(). Tugasan and assets
-- are outlet-level, so those open up.

CREATE FUNCTION app_manages_outlets()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT role IN ('area_manager', 'manager')
       FROM users WHERE auth_user_id = auth.uid() AND active LIMIT 1),
    false
  );
$$;

COMMENT ON FUNCTION app_manages_outlets() IS
  'Area Manager or Manager: the roles that score SV/AS, verify, fill Tugasan, track assets and send reminders. Reach is app_can_see_branch()''s question, not this one''s.';

-- ------------------------------------------------------------- scoring ----

CREATE OR REPLACE FUNCTION app_can_score()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT app_role() = 'supervisor' OR app_manages_outlets() OR app_is_exec();
$$;

DROP POLICY marks_update ON marks;
CREATE POLICY marks_update ON marks FOR UPDATE TO authenticated
  USING (app_can_see_mark(branch_id, form_key) AND app_can_score())
  WITH CHECK (app_can_see_mark(branch_id, form_key));

-- -------------------------------------------------------- verification ----

DROP POLICY verifications_write ON mark_verifications;
CREATE POLICY verifications_write ON mark_verifications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM marks m WHERE m.id = mark_id
                   AND app_can_see_mark(m.branch_id, m.form_key))
         AND (app_manages_outlets() OR app_is_exec()))
  WITH CHECK (EXISTS (SELECT 1 FROM marks m WHERE m.id = mark_id
                        AND app_can_see_mark(m.branch_id, m.form_key))
              AND (app_manages_outlets() OR app_is_exec()));

-- -------------------------------------------------------------- tugasan ----
-- Stays with the outlet managers and admin (20260909030000); head office
-- reads whether it was done and never fills it in.

DROP POLICY tugasan_checks_write ON tugasan_checks;
CREATE POLICY tugasan_checks_write ON tugasan_checks FOR ALL TO authenticated
  USING (app_can_see_branch(branch_id) AND (app_manages_outlets() OR app_is_admin()))
  WITH CHECK (app_can_see_branch(branch_id) AND (app_manages_outlets() OR app_is_admin()));

DROP POLICY tugasan_signoffs_write ON tugasan_signoffs;
CREATE POLICY tugasan_signoffs_write ON tugasan_signoffs FOR ALL TO authenticated
  USING (app_can_see_branch(branch_id) AND (app_manages_outlets() OR app_is_admin()))
  WITH CHECK (app_can_see_branch(branch_id) AND (app_manages_outlets() OR app_is_admin()));

-- --------------------------------------------------------------- assets ----

DROP POLICY assets_write ON assets;
CREATE POLICY assets_write ON assets FOR ALL TO authenticated
  USING (app_can_see_branch(branch_id)
         AND (app_role() = 'supervisor' OR app_manages_outlets() OR app_is_exec()))
  WITH CHECK (app_can_see_branch(branch_id)
              AND (app_role() = 'supervisor' OR app_manages_outlets() OR app_is_exec()));

-- ------------------------------------------------------------ reminders ----

DROP POLICY reminders_insert ON reminders;
CREATE POLICY reminders_insert ON reminders FOR INSERT TO authenticated
  WITH CHECK (
    sent_by = app_user_id()
    AND app_can_see_branch(branch_id)
    AND (app_manages_outlets() OR app_is_exec())
  );
