-- SV and Asisten Penyelia, tagged apart for management even though they act
-- identically everywhere else in the app.
--
-- 'supervisor' stays one role on purpose: RLS, the marking queue, the
-- checklist form and every policy that scores or verifies would otherwise
-- have to name two roles wherever they name one, for a distinction that
-- changes nothing about what the person may do. What management asked for is
-- a label, not a permission — so it lives as a nullable column on the
-- existing role, not a new entry in user_role.
--
-- Writing it is narrower than reading it: RLS cannot say "this column only"
-- on a table-wide UPDATE policy (the same reasoning behind set_my_email()),
-- and it should be admin, or the Area Manager who covers the outlet — not
-- every Area Manager, and not the supervisor themselves. A SECURITY DEFINER
-- function is the narrow door, exactly like set_my_email().

CREATE TYPE supervisor_title AS ENUM ('sv', 'asisten');

ALTER TABLE users ADD COLUMN supervisor_title supervisor_title;

ALTER TABLE users ADD CONSTRAINT users_supervisor_title_role_check
  CHECK (supervisor_title IS NULL OR role = 'supervisor');

COMMENT ON COLUMN users.supervisor_title IS
  'SV or Asisten Penyelia — a label for management. Both act identically under every policy; NULL for every role but supervisor, and for a supervisor not yet tagged. Set only through set_supervisor_title().';

CREATE FUNCTION set_supervisor_title(target_id text, new_title text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  target record;
BEGIN
  SELECT id, role, branch_id INTO target FROM users WHERE id = target_id;
  IF target.id IS NULL THEN
    RAISE EXCEPTION 'no such person: %', target_id;
  END IF;
  IF target.role <> 'supervisor' THEN
    RAISE EXCEPTION 'only an SV/AS carries a title';
  END IF;

  IF NOT (app_is_admin() OR (app_role() = 'area_manager' AND app_can_see_branch(target.branch_id))) THEN
    RAISE EXCEPTION 'not allowed to tag this person' USING ERRCODE = '42501';
  END IF;

  -- A blank clears it; an invalid word is refused by the cast itself.
  UPDATE users SET supervisor_title = NULLIF(btrim(new_title), '')::supervisor_title
   WHERE id = target_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_supervisor_title(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_supervisor_title(text, text) TO authenticated;

COMMENT ON FUNCTION set_supervisor_title(text, text) IS
  'Admin, or the Area Manager over that outlet, tags an SV/AS as sv or asisten. Everything else about the row, and how the person is treated everywhere else, is untouched.';

-- ---------------------------------------------------------- reporting ----
-- Appended at the end of the select list: CREATE OR REPLACE VIEW may not
-- reorder or insert among existing columns, only add new ones after them.

CREATE OR REPLACE VIEW report_staff_monthly AS
WITH people AS (
  SELECT user_id, period_year, period_month FROM report_due
  UNION
  SELECT m.user_id, m.period_year, m.period_month
  FROM marks m
  JOIN report_periods p ON p.period_year = m.period_year AND p.period_month = m.period_month
),
weeks AS (
  SELECT pp.user_id, pp.period_year, pp.period_month,
         max(rm.final_pct) FILTER (WHERE rm.week_no = 1)   AS w1_pct,
         max(rm.final_pct) FILTER (WHERE rm.week_no = 2)   AS w2_pct,
         max(rm.final_pct) FILTER (WHERE rm.week_no = 3)   AS w3_pct,
         max(rm.final_pct) FILTER (WHERE rm.week_no = 4)   AS w4_pct,
         round(avg(rm.final_pct))::int                     AS avg_pct,
         count(rm.mark_id)::int                            AS marked_weeks,
         count(*) FILTER (WHERE rm.is_pass)::int           AS passed_weeks,
         count(*) FILTER (WHERE rm.is_verified)::int       AS verified_weeks,
         -- Where the marks were scored, if anywhere else than the current posting.
         max(rm.branch_id)                                 AS marked_at
  FROM people pp
  LEFT JOIN report_marks rm ON rm.user_id = pp.user_id
                           AND rm.period_year = pp.period_year
                           AND rm.period_month = pp.period_month
  GROUP BY 1, 2, 3
)
SELECT w.user_id,
       u.name,
       u.short_name,
       u.role,
       f.key                AS form_key,
       u.branch_id,
       b.name               AS branch_name,
       b.short_name         AS branch_short,
       u.active,
       w.period_year,
       w.period_month,
       p.due_weeks,
       w.w1_pct, w.w2_pct, w.w3_pct, w.w4_pct,
       w.avg_pct,
       w.marked_weeks,
       w.passed_weeks,
       w.verified_weeks,
       r.pass_threshold,
       w.marked_at,
       -- Equal averages share a rank; more marked weeks breaks a tie before that.
       rank() OVER (PARTITION BY w.period_year, w.period_month, u.branch_id, f.key
                    ORDER BY w.avg_pct DESC NULLS LAST, w.marked_weeks DESC) AS rank_in_branch,
       u.supervisor_title
FROM weeks w
JOIN users u                 ON u.id = w.user_id
JOIN report_periods p        ON p.period_year = w.period_year AND p.period_month = w.period_month
LEFT JOIN checklist_forms f  ON f.applies_to = u.role
LEFT JOIN branches b         ON b.id = u.branch_id
LEFT JOIN scoring_rules r    ON r.branch_id = u.branch_id;

ALTER VIEW report_staff_monthly SET (security_invoker = true);

COMMENT ON VIEW report_staff_monthly IS
  'One row per person × month: the four weekly percentages (NULL = unmarked), their average, and the pass/verified counts. Outlet and role are the person''s current ones; marked_at is where the marks were scored. supervisor_title is sv/asisten/NULL, meaningful for role = supervisor only.';
