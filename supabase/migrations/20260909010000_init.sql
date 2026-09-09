-- Checklist Mingguan — PostgreSQL schema
-- Target: PostgreSQL 14+
--
-- Design notes that are easy to miss:
--   * marks.branch_id and marks.form_key are denormalised on purpose. People
--     transfer branches and change roles, and a past mark must stay attached to
--     the branch and form it was actually scored under.
--   * Percentages are never stored as input. total_score/max_score are the
--     truth and pct is generated, so a score can never disagree with its lines.
--   * Branch scoping is NOT enforced here. See ERD.md — it belongs in RLS or in
--     the API layer, not in the client.

-- ---------------------------------------------------------------- enums ----

-- Six of these are posted to an outlet; four see every branch. The split that
-- matters most is 'area_manager' vs 'manager': the first is the outlet role
-- that was called 'manager' up to this point, the second is a new cross-branch
-- role that never touches the stor operation.
CREATE TYPE user_role AS ENUM (
  'staff',            -- pekerja kedai, marked on the 22-perkara form
  'store',            -- pekerja stor, marked on the 17-perkara form
  'clerk',            -- kerani stor, owns the supplier steps of a return
  'supervisor',       -- SV/AS, marks staff at one branch
  'area_manager',     -- Area Manager, one or more assigned outlets
  'manager',          -- cross-branch, but blind to returns and stor marks
  'general_manager',  -- cross-branch, marks analytics, KPI and tugasan
  'human_resources',  -- cross-branch, marks analytics, KPI and tugasan
  'admin'             -- cross-branch, administration
);

CREATE TYPE return_reason AS ENUM ('damage', 'expired');
CREATE TYPE return_disposition AS ENUM ('supplier', 'discard');

CREATE TYPE return_stage AS ENUM (
  'received',
  'segregated',
  'supplier_called',
  'picked_up',
  'discarded',
  'adjusted'
);

CREATE TYPE tugasan_note_kind AS ENUM ('amount', 'status');

-- ------------------------------------------------------------- branches ----

CREATE TABLE branches (
  id          text PRIMARY KEY CHECK (id ~ '^[A-Z0-9]{2,5}$'),
  name        text NOT NULL,
  short_name  text NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN branches.id IS 'Short code shown beside staff numbers, e.g. MCG. Permanent once issued.';

-- ---------------------------------------------------------------- users ----

CREATE TABLE users (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  short_name  text NOT NULL,
  initials    text NOT NULL,
  role        user_role NOT NULL,
  -- NULL = not posted to any branch. Admin is cross-branch by design; a NULL on
  -- any other role means the account is unassigned and invisible to supervisors.
  branch_id   text REFERENCES branches(id) ON DELETE SET NULL,
  active      boolean NOT NULL DEFAULT true,
  joined_on   date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN users.id IS 'Payroll number (KP/MY/ST/KR/WS/AM/AD series). Permanent — keeps mark history attached across role and branch changes.';

CREATE INDEX users_branch_role_idx ON users (branch_id, role) WHERE active;

-- An Area Manager covers one or more outlets, which a single branch_id cannot
-- express. users.branch_id stays their home posting; this table lists the rest.
-- Rows for any other role are meaningless and are rejected by the trigger below.
CREATE TABLE user_branches (
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id    text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  assigned_on  date NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (user_id, branch_id)
);

CREATE INDEX user_branches_branch_idx ON user_branches (branch_id);

COMMENT ON TABLE user_branches IS
  'Extra outlets an Area Manager covers, beyond users.branch_id. Empty for every other role.';

CREATE FUNCTION user_branches_area_manager_only()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF (SELECT role FROM users WHERE id = NEW.user_id) <> 'area_manager' THEN
    RAISE EXCEPTION 'user_branches is for area_manager only (% is not)', NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_branches_role_check
  BEFORE INSERT OR UPDATE ON user_branches
  FOR EACH ROW EXECUTE FUNCTION user_branches_area_manager_only();

-- Audit of promotions, demotions and lateral transfers.
CREATE TABLE role_changes (
  id          bigserial PRIMARY KEY,
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_role   user_role NOT NULL,
  to_role     user_role NOT NULL,
  changed_by  text REFERENCES users(id) ON DELETE SET NULL,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (from_role <> to_role)
);

CREATE INDEX role_changes_user_idx ON role_changes (user_id, changed_at DESC);

CREATE TABLE branch_changes (
  id             bigserial PRIMARY KEY,
  user_id        text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_branch_id text REFERENCES branches(id) ON DELETE SET NULL,
  to_branch_id   text REFERENCES branches(id) ON DELETE SET NULL,
  changed_by     text REFERENCES users(id) ON DELETE SET NULL,
  changed_at     timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------- checklist reference ----

CREATE TABLE checklist_forms (
  key         text PRIMARY KEY,   -- 'kedai' | 'stor'
  name        text NOT NULL,
  applies_to  user_role NOT NULL UNIQUE
);

CREATE TABLE checklist_categories (
  id        bigserial PRIMARY KEY,
  form_key  text NOT NULL REFERENCES checklist_forms(key) ON DELETE CASCADE,
  position  int NOT NULL,
  name      text NOT NULL,
  UNIQUE (form_key, position)
);

CREATE TABLE checklist_lines (
  id           bigserial PRIMARY KEY,
  category_id  bigint NOT NULL REFERENCES checklist_categories(id) ON DELETE CASCADE,
  position     int NOT NULL,
  label        text NOT NULL,
  UNIQUE (category_id, position)
);

COMMENT ON TABLE checklist_lines IS 'One scorable perkara. 22 rows for the kedai form, 17 for stor.';

-- --------------------------------------------------------- scoring rules ----

CREATE TABLE scoring_rules (
  branch_id          text PRIMARY KEY REFERENCES branches(id) ON DELETE CASCADE,
  pass_threshold     int NOT NULL DEFAULT 80 CHECK (pass_threshold BETWEEN 1 AND 100),
  scale_max          int NOT NULL DEFAULT 5 CHECK (scale_max IN (5, 10)),
  verify_by_manager  boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE scoring_rules IS 'Per branch so outlets can carry different KPI targets. Seeded identically today.';

-- ---------------------------------------------------------------- marks ----

CREATE TABLE marks (
  id            bigserial PRIMARY KEY,
  user_id       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Snapshot of where and how this person was scored at the time.
  branch_id     text NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  form_key      text NOT NULL REFERENCES checklist_forms(key) ON DELETE RESTRICT,

  period_year   int NOT NULL CHECK (period_year BETWEEN 2000 AND 2999),
  period_month  int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  week_no       int NOT NULL CHECK (week_no BETWEEN 1 AND 4),

  total_score   int NOT NULL CHECK (total_score >= 0),
  max_score     int NOT NULL CHECK (max_score > 0),
  pct           int GENERATED ALWAYS AS (round(total_score * 100.0 / max_score)) STORED,

  note          text,
  scored_by     text REFERENCES users(id) ON DELETE SET NULL,
  scored_at     timestamptz NOT NULL DEFAULT now(),

  CHECK (total_score <= max_score),
  UNIQUE (user_id, period_year, period_month, week_no)
);

COMMENT ON COLUMN marks.pct IS 'Generated. A score can never disagree with its own total.';

CREATE INDEX marks_branch_period_idx ON marks (branch_id, period_year, period_month);
CREATE INDEX marks_user_idx ON marks (user_id, period_year DESC, period_month DESC);

-- Per-perkara detail. Absent for marks imported from the spreadsheets, which
-- only ever recorded a weekly total.
CREATE TABLE mark_lines (
  mark_id  bigint NOT NULL REFERENCES marks(id) ON DELETE CASCADE,
  line_id  bigint NOT NULL REFERENCES checklist_lines(id) ON DELETE RESTRICT,
  score    int NOT NULL CHECK (score >= 1),
  PRIMARY KEY (mark_id, line_id)
);

-- The MANAGER pass. Its absence is meaningful — the workbooks show this column
-- empty all year, which is what the coverage reporting surfaces.
CREATE TABLE mark_verifications (
  mark_id      bigint PRIMARY KEY REFERENCES marks(id) ON DELETE CASCADE,
  verified_by  text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  verified_at  timestamptz NOT NULL DEFAULT now(),
  adjusted_to  int CHECK (adjusted_to >= 0)
);

COMMENT ON COLUMN mark_verifications.adjusted_to IS 'Set only when the manager overrides the SV/AS total rather than agreeing with it.';

-- -------------------------------------------------------------- tugasan ----

CREATE TABLE tugasan_items (
  key        text PRIMARY KEY,     -- 'peti_cash' | 'x_report'
  label      text NOT NULL,
  note_kind  tugasan_note_kind NOT NULL,
  position   int NOT NULL UNIQUE
);

CREATE TABLE tugasan_checks (
  branch_id     text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  period_year   int NOT NULL,
  period_month  int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  week_no       int NOT NULL CHECK (week_no BETWEEN 1 AND 4),
  item_key      text NOT NULL REFERENCES tugasan_items(key) ON DELETE CASCADE,

  done          boolean NOT NULL DEFAULT false,
  note          text,
  inspected_on  date,

  PRIMARY KEY (branch_id, period_year, period_month, week_no, item_key)
);

CREATE TABLE tugasan_signoffs (
  branch_id     text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  period_year   int NOT NULL,
  period_month  int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  week_no       int NOT NULL CHECK (week_no BETWEEN 1 AND 4),

  filled_by     text REFERENCES users(id) ON DELETE SET NULL,
  checked_by    text REFERENCES users(id) ON DELETE SET NULL,
  signed_on     date,

  PRIMARY KEY (branch_id, period_year, period_month, week_no)
);

COMMENT ON COLUMN tugasan_signoffs.checked_by IS 'DIPERIKSA OLEH. Empty in every source workbook block — the same verification gap as mark_verifications.';

-- --------------------------------------------------------------- assets ----

CREATE TABLE assets (
  id          bigserial PRIMARY KEY,
  branch_id   text NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name        text NOT NULL,
  is_open     boolean NOT NULL DEFAULT false,
  note        text,
  opened_on   date,
  resolved_on date,
  UNIQUE (branch_id, name),
  CHECK (NOT is_open OR opened_on IS NOT NULL)
);

COMMENT ON COLUMN assets.opened_on IS 'Age in the UI is now() - opened_on rather than a stored "34 hari" string.';

-- -------------------------------------------------------------- returns ----

CREATE TABLE suppliers (
  id         bigserial PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  phone      text,
  active     boolean NOT NULL DEFAULT true
);

CREATE TABLE returns (
  id           bigserial PRIMARY KEY,
  ref          text NOT NULL UNIQUE,          -- PR0001, shown in the UI
  branch_id    text NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  bill_no      text NOT NULL,
  bill_date    date NOT NULL,
  reason       return_reason NOT NULL,
  remark       text,
  supplier_id  bigint REFERENCES suppliers(id) ON DELETE SET NULL,
  -- NULL until segregation decides the route.
  disposition  return_disposition,
  created_by   text REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, bill_no)
);

CREATE INDEX returns_branch_idx ON returns (branch_id, bill_date DESC);

-- One row per stage reached. Ageing is derived from these, never stored.
CREATE TABLE return_events (
  id           bigserial PRIMARY KEY,
  return_id    bigint NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  stage        return_stage NOT NULL,
  occurred_on  date NOT NULL,
  recorded_by  text REFERENCES users(id) ON DELETE SET NULL,
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (return_id, stage)
);

CREATE INDEX return_events_return_idx ON return_events (return_id);

-- ----------------------------------------------------------------- views ----

-- Receive -> clear turnaround. Open records age against today, so the number
-- keeps climbing until the stock adjustment lands.
CREATE VIEW return_turnaround AS
SELECT
  r.id,
  r.ref,
  r.branch_id,
  r.bill_no,
  r.bill_date,
  r.reason,
  r.disposition,
  recv.occurred_on                                  AS received_on,
  adj.occurred_on                                   AS cleared_on,
  (adj.occurred_on IS NOT NULL)                     AS is_cleared,
  COALESCE(adj.occurred_on, CURRENT_DATE)
    - COALESCE(recv.occurred_on, r.bill_date)       AS turnaround_days
FROM returns r
LEFT JOIN return_events recv ON recv.return_id = r.id AND recv.stage = 'received'
LEFT JOIN return_events adj  ON adj.return_id  = r.id AND adj.stage  = 'adjusted';

-- Position of each stage in the chain. supplier_called and discarded share a
-- rank because they are alternative routes out of segregation.
CREATE FUNCTION stage_rank(s return_stage) RETURNS int
  LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE s
    WHEN 'received'        THEN 1
    WHEN 'segregated'      THEN 2
    WHEN 'supplier_called' THEN 3
    WHEN 'discarded'       THEN 3
    WHEN 'picked_up'       THEN 4
    WHEN 'adjusted'        THEN 5
  END $$;

-- Days spent on each hop, for the admin ageing report's bottleneck breakdown.
-- Ordered by chain position, not by date: stages recorded on the same day must
-- still read forwards.
CREATE VIEW return_stage_gaps AS
SELECT
  e.return_id,
  r.branch_id,
  prev.stage                        AS from_stage,
  e.stage                           AS to_stage,
  e.occurred_on - prev.occurred_on  AS gap_days
FROM return_events e
JOIN returns r ON r.id = e.return_id
JOIN LATERAL (
  SELECT p.stage, p.occurred_on
  FROM return_events p
  WHERE p.return_id = e.return_id
    AND stage_rank(p.stage) < stage_rank(e.stage)
  ORDER BY stage_rank(p.stage) DESC
  LIMIT 1
) prev ON true;

-- Coverage: which person x week cells have no mark. This is the #DIV/0! problem
-- the workbooks had, expressed as a query.
CREATE VIEW mark_coverage AS
SELECT
  u.id          AS user_id,
  u.branch_id,
  p.period_year,
  p.period_month,
  w.week_no,
  m.id          AS mark_id,
  (m.id IS NULL) AS is_gap
FROM users u
CROSS JOIN LATERAL (SELECT generate_series(1, 4) AS week_no) w
CROSS JOIN LATERAL (
  SELECT DISTINCT period_year, period_month FROM marks
) p
LEFT JOIN marks m
  ON m.user_id = u.id
 AND m.period_year = p.period_year
 AND m.period_month = p.period_month
 AND m.week_no = w.week_no
WHERE u.active AND u.role IN ('staff', 'store');

