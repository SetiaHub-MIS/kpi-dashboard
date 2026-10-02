-- Enter weekly marks with the score for every perkara, by SQL.
--
-- One row per person × week. The scores are a list in the form's own order;
-- the total, the maximum and the percentage are worked out from them, the
-- same way the app does it, so they can never disagree with the detail.
--
--   * NULL  = perkara not applicable / left blank — left out of the maximum
--   * 0     = scored zero — counts against the person
--   * 1..5  = the score — up to the outlet's scoring_rules.scale_max, which
--             is 5 everywhere today (the table also allows 10)
--
-- The form follows the person's role: staff → kedai (22), store → stor (17),
-- supervisor → sv (19). The list must be exactly that long.
--
-- scored_by is the scorer's payroll number, or their name as written on the
-- sheet's NAMA row ('Hanif'). A payroll number is followed first, exactly as
-- given — whatever that person's role or outlet today (people move, get
-- promoted, cover for each other); it only has to be someone on the users
-- table other than the person marked. Only when no number is given is the
-- name matched, and then among those who could have scored that person: an
-- SV/AS or Area Manager posted to or covering their outlet, or a Manager, GM,
-- HR or admin (the roles app_can_score() lets score). A number nobody has, a
-- name that fits nobody, or a name that fits more than one stops the run and
-- is listed. NULL when the sheet names nobody: saved with no scorer.
--
-- For a whole outlet or company at once, supabase/xlsx_to_import_marks.py
-- reads the checklist workbooks and writes a copy of this file with every row
-- filled in.
--
-- Pekerja kedai, 22 perkara, in this order:
--    1 KEDATANGAN
--    2 DISIPLIN
--    3 KEBERSIHAN BAHAGIAN      A) LANTAI  B) RAK / TEMPAT KAUNTER  C) BARANG DISPLAY
--    6 KEKEMASAN BAHAGIAN       A) BARANG DISPLAY  B) LEBIHAN BARANG
--    8 KEBERSIHAN & KEKEMASAN STOR
--    9 PENYUSUNAN BARANG        A) SUSUN DI ATAS RAK  B) FIRST IN FIRST OUT  C) TURUN & TAMBAH STOK
--                               D) PERIKSA TARIKH LUPUT  E) REPACKING
--   14 KEBERSIHAN KEDAI         A) TANDAS  B) KIPAS  C) AIR-COND  D) AIR COOLER  E) SAWANG
--                               F) KAKI LIMA / PARKING LOT  G) LONGKANG  H) POTONG POKOK / RUMPUT
--                               I) PETI SEJUK
--
-- A week the database already has — marked in the app, or by an earlier
-- import — is decided by the setting just below: 'keep' leaves it alone and
-- skips that row (the app's version wins), 'replace' overwrites it, lines and
-- all, unless the Area Manager has confirmed it, which stops the whole run.
-- Nothing is saved unless every row passes. The result is a count per month.
-- Paste into the Supabase SQL editor, edit the rows, run.

BEGIN;

-- 'keep' or 'replace' — see above. 'replace' is for correcting a week that an
-- earlier import got wrong; 'keep' never touches what is already there.
-- check_only true is the _check file the converter writes: every problem is
-- listed in full, weeks already there are checked too, and nothing is saved.
CREATE TEMP TABLE import_settings ON COMMIT DROP AS
  SELECT 'keep'::text AS existing,
         false        AS check_only;

CREATE TEMP TABLE import_marks (
  user_id      text,
  period_year  int,
  period_month int,
  week_no      int,
  scored_by    text,
  note         text,
  scores       int[],
  scorer_ids   text[] DEFAULT '{}',   -- filled below: who scored_by turned out to mean
  kept         boolean DEFAULT false  -- set below: already in the database, left alone
) ON COMMIT DROP;

INSERT INTO import_marks (user_id, period_year, period_month, week_no, scored_by, note, scores) VALUES
  --          person    year  month week  scored by  catatan  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22
  ('KP0093', 2026, 9, 2, 'WS0001', NULL, ARRAY[5, 4, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, NULL])
  -- , ('KP0103', 2026, 9, 2, 'Hanif',  'Tandas belum disapu', ARRAY[5, 4, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 4])
;

-- Weeks already in the database, when the setting is 'keep': set aside here,
-- and nothing below reads or writes them.
UPDATE import_marks i
   SET kept = true
  FROM import_settings st, marks m
 WHERE st.existing = 'keep'
   AND m.user_id = upper(btrim(i.user_id)) AND m.period_year = i.period_year
   AND m.period_month = i.period_month AND m.week_no = i.week_no;

-- Who scored (see the top of the file). A payroll number first, taken as
-- given: it names one person exactly, and the sheet's owner has said who.
-- Otherwise the name, matched only among the people who could have scored
-- here: every short name equal to it and every full name holding it as a
-- word. Exactly one is needed — the check below lists the rest. No name
-- leaves the list empty.
UPDATE import_marks i
   SET scorer_ids = coalesce((
         SELECT array_agg(s.id ORDER BY s.id)
           FROM users s
           JOIN users p ON p.id = upper(btrim(i.user_id))
          WHERE s.id <> p.id
            AND CASE WHEN EXISTS (SELECT 1 FROM users x WHERE x.id = upper(btrim(i.scored_by)))
                     THEN s.id = upper(btrim(i.scored_by))
                     ELSE (s.role IN ('manager', 'general_manager', 'human_resources', 'admin')
                           OR (s.role IN ('supervisor', 'area_manager')
                               AND (s.branch_id = p.branch_id
                                    OR EXISTS (SELECT 1 FROM user_branches ub
                                                WHERE ub.user_id = s.id AND ub.branch_id = p.branch_id))))
                          AND (lower(s.short_name) = lower(btrim(i.scored_by))
                               OR ' ' || lower(s.name) || ' ' LIKE '% ' || lower(btrim(i.scored_by)) || ' %')
                END), '{}')
 WHERE nullif(btrim(i.scored_by), '') IS NOT NULL;

-- Everything wrong with the rows, in one list, before anything is written.
DO $$
DECLARE
  problems text;
BEGIN
  IF (SELECT existing FROM import_settings) NOT IN ('keep', 'replace') THEN
    RAISE EXCEPTION 'Nothing was saved. The setting at the top must be ''keep'' or ''replace''.';
  END IF;

  WITH form_size AS (
    SELECT c.form_key, count(*)::int AS n
      FROM checklist_lines l JOIN checklist_categories c ON c.id = l.category_id
     GROUP BY c.form_key
  ),
  checked AS (
    SELECT i.*, u.id AS person_id, u.branch_id, f.key AS form_key, fs.n AS form_lines,
           coalesce(r.scale_max, 5) AS scale_max,
           EXISTS (SELECT 1 FROM marks m JOIN mark_verifications v ON v.mark_id = m.id
                    WHERE m.user_id = u.id AND m.period_year = i.period_year
                      AND m.period_month = i.period_month AND m.week_no = i.week_no) AS confirmed,
           count(*) OVER (PARTITION BY upper(btrim(i.user_id)), i.period_year,
                                       i.period_month, i.week_no) AS copies
      FROM import_marks i
      LEFT JOIN users u ON u.id = upper(btrim(i.user_id))
      LEFT JOIN checklist_forms f ON f.applies_to = u.role
      LEFT JOIN form_size fs ON fs.form_key = f.key
      LEFT JOIN scoring_rules r ON r.branch_id = u.branch_id
     WHERE NOT i.kept OR (SELECT check_only FROM import_settings)
  ),
  judged AS (
    SELECT *, CASE
        -- the first that applies; the rest of the checks assume it passed
        WHEN person_id IS NULL THEN 'no such person'
        WHEN form_key IS NULL THEN 'this role is not marked on a checklist'
        WHEN branch_id IS NULL THEN 'person has no outlet'
        WHEN cardinality(scorer_ids) = 0 AND nullif(btrim(scored_by), '') IS NOT NULL
          THEN CASE WHEN EXISTS (SELECT 1 FROM users x WHERE x.id = upper(btrim(scored_by)))
                    THEN format('scored_by %L is the person being marked', scored_by)
                    WHEN btrim(scored_by) ~* '^[a-z]+[0-9][a-z0-9]*$'
                    THEN format('scored_by %L: nobody has that payroll number - add them (inactive if they '
                                'have left) or correct the number', scored_by)
                    ELSE format('scored_by %L is not the name of anyone who could have scored at %s (an SV/AS '
                                'or Area Manager there, or a Manager, GM, HR or admin) - give the payroll number',
                                scored_by, branch_id)
               END
        WHEN cardinality(scorer_ids) > 1
          THEN format('scored_by %L could be %s — use the payroll number', scored_by, array_to_string(scorer_ids, ' or '))
        WHEN period_year NOT BETWEEN 2000 AND 2999 OR period_month NOT BETWEEN 1 AND 12
          THEN 'month must be 1 to 12, and the year four digits'
        WHEN week_no NOT BETWEEN 1 AND 4 THEN 'week must be 1 to 4'
        WHEN copies > 1 THEN 'appears more than once in the rows'
        WHEN coalesce(array_length(scores, 1), 0) <> form_lines
          THEN format('%s scores given, the %s form has %s', coalesce(array_length(scores, 1), 0), form_key, form_lines)
        WHEN EXISTS (SELECT 1 FROM unnest(scores) v WHERE v < 0 OR v > scale_max)
          THEN 'a score is outside 0 to ' || scale_max
        WHEN NOT EXISTS (SELECT 1 FROM unnest(scores) v WHERE v IS NOT NULL)
          THEN 'every perkara is blank — nothing to score'
        WHEN confirmed AND NOT kept THEN 'already confirmed by the Area Manager — delete its verification first'
      END AS why
      FROM checked
  )
  -- One entry per problem, not per row: a misspelt scorer on a whole outlet's
  -- sheets would otherwise repeat the same line for every person and week.
  -- An import shows six of each; the check file shows every person affected.
  SELECT string_agg(format(E'%s\n    %s%s', why, array_to_string(rows[1:lim], ', '),
                           CASE WHEN cardinality(rows) > lim THEN format(' and %s more', cardinality(rows) - lim) ELSE '' END),
                    E'\n' ORDER BY why)
    INTO problems
    FROM (SELECT why, array_agg(DISTINCT label ORDER BY label) AS rows,
                 CASE WHEN bool_or(chk) THEN count(*) ELSE 6 END AS lim
            FROM (SELECT why, st.check_only AS chk,
                         CASE WHEN st.check_only THEN upper(btrim(user_id))
                              ELSE format('%s %s-%s week %s', user_id, period_year, lpad(period_month::text, 2, '0'), week_no)
                         END AS label
                    FROM judged, import_settings st
                   WHERE why IS NOT NULL) w
           GROUP BY why) g;

  IF (SELECT check_only FROM import_settings) THEN
    RAISE EXCEPTION E'Check only - nothing was saved.\n%',
      coalesce(E'Fix these before importing:\n' || problems,
               'Every row passes: the import files will go in as they are.');
  END IF;
  IF problems IS NOT NULL THEN
    RAISE EXCEPTION E'Nothing was saved. Fix these rows:\n%', problems;
  END IF;
END $$;

-- The marks: totals from the scores. The outlet is the person's current one,
-- kept on the mark so a later transfer does not move their history.
INSERT INTO marks (user_id, branch_id, form_key, period_year, period_month, week_no,
                   total_score, max_score, note, scored_by)
SELECT u.id, u.branch_id, f.key, i.period_year, i.period_month, i.week_no,
       (SELECT coalesce(sum(v), 0) FROM unnest(i.scores) v),
       (SELECT count(v) FROM unnest(i.scores) v) * coalesce(r.scale_max, 5),
       nullif(btrim(i.note), ''), i.scorer_ids[1]
  FROM import_marks i
  JOIN users u ON u.id = upper(btrim(i.user_id))
  JOIN checklist_forms f ON f.applies_to = u.role
  LEFT JOIN scoring_rules r ON r.branch_id = u.branch_id
 WHERE NOT i.kept
ON CONFLICT (user_id, period_year, period_month, week_no) DO UPDATE
  SET branch_id   = EXCLUDED.branch_id,
      form_key    = EXCLUDED.form_key,
      total_score = EXCLUDED.total_score,
      max_score   = EXCLUDED.max_score,
      note        = EXCLUDED.note,
      scored_by   = EXCLUDED.scored_by,
      scored_at   = now();

-- The per-perkara lines, replaced wholesale so an earlier attempt cannot mix in.
DELETE FROM mark_lines ml
 USING marks m, import_marks i
 WHERE ml.mark_id = m.id AND NOT i.kept
   AND m.user_id = upper(btrim(i.user_id)) AND m.period_year = i.period_year
   AND m.period_month = i.period_month AND m.week_no = i.week_no;

INSERT INTO mark_lines (mark_id, line_id, score)
SELECT m.id, fl.line_id, s.score
  FROM import_marks i
  JOIN marks m ON m.user_id = upper(btrim(i.user_id)) AND m.period_year = i.period_year
              AND m.period_month = i.period_month AND m.week_no = i.week_no
  CROSS JOIN LATERAL unnest(i.scores) WITH ORDINALITY AS s(score, n)
  JOIN (SELECT l.id AS line_id, c.form_key,
               row_number() OVER (PARTITION BY c.form_key ORDER BY c.position, l.position) AS n
          FROM checklist_lines l JOIN checklist_categories c ON c.id = l.category_id) fl
    ON fl.form_key = m.form_key AND fl.n = s.n
 WHERE s.score IS NOT NULL AND NOT i.kept;

-- What happened, month by month.
SELECT i.period_year AS year, i.period_month AS month,
       count(*) FILTER (WHERE NOT i.kept)                                    AS weeks_saved,
       count(*) FILTER (WHERE i.kept)                                        AS already_there_kept,
       count(*) FILTER (WHERE NOT i.kept AND cardinality(i.scorer_ids) = 0) AS saved_without_scorer,
       round(avg(m.pct) FILTER (WHERE NOT i.kept))                           AS avg_pct_saved
  FROM import_marks i
  JOIN marks m ON m.user_id = upper(btrim(i.user_id)) AND m.period_year = i.period_year
              AND m.period_month = i.period_month AND m.week_no = i.week_no
 GROUP BY 1, 2
 ORDER BY 1, 2;

COMMIT;
