-- Row-level security: branch scoping enforced by the database.
--
-- Until now this lived in the client (staffOfBranch), which meant a supervisor
-- could read another outlet by querying directly. These policies move that
-- boundary server-side.
--
-- Shape of the rules:
--   * admin            — cross-branch, reads and writes everything
--   * general_manager, human_resources
--                      — cross-branch, read and write operational data (marks,
--                        tugasan, assets, returns); not the administration tables
--   * manager          — cross-branch, but blind to the stor operation: no
--                        returns, no 17-perkara marks
--   * area_manager     — their home outlet plus every outlet in user_branches
--   * everyone else    — confined to their own branch_id
--   * reference tables — readable by any signed-in user, written by admin
--
-- Marks keep their own branch_id snapshot, so a person transferring branches
-- does not drag their history into the new outlet's visibility.

ALTER TABLE branches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_branches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_changes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_changes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_forms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_lines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE mark_lines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mark_verifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tugasan_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tugasan_checks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tugasan_signoffs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns              ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_events        ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------ reference tables ----
-- Forms, kategori, perkara, suppliers and the tugasan item list carry no branch
-- data. Any signed-in user reads them; only admin changes them.

CREATE POLICY ref_read_forms      ON checklist_forms      FOR SELECT TO authenticated USING (true);
CREATE POLICY ref_read_categories ON checklist_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY ref_read_lines      ON checklist_lines      FOR SELECT TO authenticated USING (true);
CREATE POLICY ref_read_tugasan    ON tugasan_items        FOR SELECT TO authenticated USING (true);
CREATE POLICY ref_read_suppliers  ON suppliers            FOR SELECT TO authenticated USING (true);

CREATE POLICY ref_write_forms      ON checklist_forms      FOR ALL TO authenticated USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY ref_write_categories ON checklist_categories FOR ALL TO authenticated USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY ref_write_lines      ON checklist_lines      FOR ALL TO authenticated USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY ref_write_tugasan    ON tugasan_items        FOR ALL TO authenticated USING (app_is_admin()) WITH CHECK (app_is_admin());

-- Store staff name suppliers while logging a return, so they may add rows.
CREATE POLICY suppliers_write ON suppliers FOR INSERT TO authenticated
  WITH CHECK (app_role() IN ('store', 'clerk') OR app_is_exec());

-- ------------------------------------------------------------- branches ----
-- The branch list is readable by everyone: the app needs names for labels and
-- the sign-in switcher. Only admin creates or closes an outlet.

CREATE POLICY branches_read  ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY branches_write ON branches FOR ALL TO authenticated
  USING (app_is_admin()) WITH CHECK (app_is_admin());

-- ---------------------------------------------------------------- users ----
-- Note this policy calls app_* helpers rather than selecting from users, which
-- is what keeps it from re-entering itself.

CREATE POLICY users_read ON users FOR SELECT TO authenticated
  USING (
    app_is_admin()
    OR auth_user_id = auth.uid()          -- always see your own record
    OR app_can_see_branch(branch_id)
  );

CREATE POLICY users_write ON users FOR ALL TO authenticated
  USING (app_is_admin()) WITH CHECK (app_is_admin());

-- An Area Manager must read their own posting list; it is what the app builds
-- their outlet switcher from. Only admin changes who covers what.
CREATE POLICY user_branches_read ON user_branches FOR SELECT TO authenticated
  USING (app_is_cross_branch() OR user_id = app_user_id() OR app_can_see_branch(branch_id));

CREATE POLICY user_branches_write ON user_branches FOR ALL TO authenticated
  USING (app_is_admin()) WITH CHECK (app_is_admin());

CREATE POLICY role_changes_read  ON role_changes   FOR SELECT TO authenticated USING (app_is_admin());
CREATE POLICY role_changes_write ON role_changes   FOR INSERT TO authenticated WITH CHECK (app_is_admin());
CREATE POLICY branch_changes_read  ON branch_changes FOR SELECT TO authenticated USING (app_is_admin());
CREATE POLICY branch_changes_write ON branch_changes FOR INSERT TO authenticated WITH CHECK (app_is_admin());

-- -------------------------------------------------------- scoring rules ----

CREATE POLICY scoring_read  ON scoring_rules FOR SELECT TO authenticated
  USING (app_can_see_branch(branch_id));
CREATE POLICY scoring_write ON scoring_rules FOR ALL TO authenticated
  USING (app_is_admin()) WITH CHECK (app_is_admin());

-- ---------------------------------------------------------------- marks ----

CREATE POLICY marks_read ON marks FOR SELECT TO authenticated
  USING (app_can_see_mark(branch_id, form_key));

-- Supervisors mark their own branch; head office may correct anywhere.
CREATE POLICY marks_insert ON marks FOR INSERT TO authenticated
  WITH CHECK (app_can_see_mark(branch_id, form_key)
              AND (app_role() = 'supervisor' OR app_is_exec()));

CREATE POLICY marks_update ON marks FOR UPDATE TO authenticated
  USING (app_can_see_mark(branch_id, form_key)
         AND (app_role() IN ('supervisor', 'area_manager') OR app_is_exec()))
  WITH CHECK (app_can_see_mark(branch_id, form_key));

-- Line scores inherit the parent mark's branch.
CREATE POLICY mark_lines_read ON mark_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM marks m WHERE m.id = mark_id
                   AND app_can_see_mark(m.branch_id, m.form_key)));

CREATE POLICY mark_lines_write ON mark_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM marks m WHERE m.id = mark_id
                   AND app_can_see_mark(m.branch_id, m.form_key)
                   AND (app_role() = 'supervisor' OR app_is_exec())))
  WITH CHECK (EXISTS (SELECT 1 FROM marks m WHERE m.id = mark_id
                        AND app_can_see_mark(m.branch_id, m.form_key)
                        AND (app_role() = 'supervisor' OR app_is_exec())));

-- Verification is the Area Manager's pass over the outlets they cover, and head
-- office's anywhere.
CREATE POLICY verifications_read ON mark_verifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM marks m WHERE m.id = mark_id
                   AND app_can_see_mark(m.branch_id, m.form_key)));

CREATE POLICY verifications_write ON mark_verifications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM marks m WHERE m.id = mark_id
                   AND app_can_see_mark(m.branch_id, m.form_key))
         AND (app_role() = 'area_manager' OR app_is_exec()))
  WITH CHECK (EXISTS (SELECT 1 FROM marks m WHERE m.id = mark_id
                        AND app_can_see_mark(m.branch_id, m.form_key))
              AND (app_role() = 'area_manager' OR app_is_exec()));

-- -------------------------------------------------------------- tugasan ----
-- The Area Manager's own weekly self-check, over the outlets they cover.
-- Overseeing it is exactly what general_manager and human_resources are for, so
-- they write it too.

CREATE POLICY tugasan_checks_read ON tugasan_checks FOR SELECT TO authenticated
  USING (app_can_see_branch(branch_id));
CREATE POLICY tugasan_checks_write ON tugasan_checks FOR ALL TO authenticated
  USING (app_can_see_branch(branch_id) AND (app_role() = 'area_manager' OR app_is_exec()))
  WITH CHECK (app_can_see_branch(branch_id) AND (app_role() = 'area_manager' OR app_is_exec()));

CREATE POLICY tugasan_signoffs_read ON tugasan_signoffs FOR SELECT TO authenticated
  USING (app_can_see_branch(branch_id));
CREATE POLICY tugasan_signoffs_write ON tugasan_signoffs FOR ALL TO authenticated
  USING (app_can_see_branch(branch_id) AND (app_role() = 'area_manager' OR app_is_exec()))
  WITH CHECK (app_can_see_branch(branch_id) AND (app_role() = 'area_manager' OR app_is_exec()));

-- --------------------------------------------------------------- assets ----

CREATE POLICY assets_read ON assets FOR SELECT TO authenticated
  USING (app_can_see_branch(branch_id));
CREATE POLICY assets_write ON assets FOR ALL TO authenticated
  USING (app_can_see_branch(branch_id)
         AND (app_role() IN ('supervisor', 'area_manager') OR app_is_exec()))
  WITH CHECK (app_can_see_branch(branch_id)
              AND (app_role() IN ('supervisor', 'area_manager') OR app_is_exec()));

-- -------------------------------------------------------------- returns ----
-- The stor operation. An Area Manager reads the returns of every outlet they
-- cover; the cross-branch 'manager' role is shut out of this table entirely.

CREATE POLICY returns_read ON returns FOR SELECT TO authenticated
  USING (app_can_see_branch(branch_id) AND app_can_see_store_ops());

CREATE POLICY returns_write ON returns FOR ALL TO authenticated
  USING (app_can_see_branch(branch_id) AND app_can_see_store_ops()
         AND (app_role() IN ('store', 'clerk') OR app_is_exec()))
  WITH CHECK (app_can_see_branch(branch_id) AND app_can_see_store_ops()
              AND (app_role() IN ('store', 'clerk') OR app_is_exec()));

CREATE POLICY return_events_read ON return_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM returns r WHERE r.id = return_id
                   AND app_can_see_branch(r.branch_id) AND app_can_see_store_ops()));

-- Which of store/clerk owns which stage stays in the app: the rule is a
-- workflow question, not a security boundary. The boundary is branch and role.
CREATE POLICY return_events_write ON return_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM returns r WHERE r.id = return_id
                   AND app_can_see_branch(r.branch_id) AND app_can_see_store_ops())
         AND (app_role() IN ('store', 'clerk') OR app_is_exec()))
  WITH CHECK (EXISTS (SELECT 1 FROM returns r WHERE r.id = return_id
                        AND app_can_see_branch(r.branch_id) AND app_can_see_store_ops())
              AND (app_role() IN ('store', 'clerk') OR app_is_exec()));

-- ----------------------------------------------------------------- views ----
-- Views run with the privileges of their owner by default, which would bypass
-- every policy above. security_invoker makes them respect the caller's.

ALTER VIEW return_turnaround   SET (security_invoker = true);
ALTER VIEW return_stage_gaps   SET (security_invoker = true);
ALTER VIEW mark_coverage       SET (security_invoker = true);
