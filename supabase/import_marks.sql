-- Enter weekly marks with the score for every perkara, by SQL.
--
-- One row per person × week. The scores are a list in the form's own order;
-- the total, the maximum and the percentage are worked out from them, the
-- same way the app does it, so they can never disagree with the detail.
--
--   * NULL  = perkara not applicable / left blank — left out of the maximum
--   * 0     = scored zero — counts against the person
--   * 1..5  = the score
--
-- The form follows the person's role: staff → kedai (22), store → stor (17),
-- supervisor → sv (19). The list must be exactly that long.
--
-- scored_by is the scorer's payroll number, or their name as written on the
-- sheet's NAMA row ('Hanif'), matched against the SV/AS, Area Managers and
-- managers posted to the person's outlet. A name that fits nobody, or more
-- than one person, stops the run and is listed — use the payroll number there.
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
-- Safe to re-run: a week that already has a mark is replaced, lines and all —
-- unless the Area Manager has confirmed it, which stops the whole run.
-- Paste into the Supabase SQL editor, edit the rows, run.

BEGIN;

CREATE TEMP TABLE import_marks (
  user_id      text,
  period_year  int,
  period_month int,
  week_no      int,
  scored_by    text,
  note         text,
  scores       int[],
  scorer_ids   text[]   -- filled below: who scored_by turned out to mean
) ON COMMIT DROP;

INSERT INTO import_marks (user_id, period_year, period_month, week_no, scored_by, note, scores) VALUES
  --          person    year  month week  scored by  catatan  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22
  ('KP0093', 2026, 9, 2, 'WS0001', NULL, ARRAY[5, 4, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, NULL])
  -- , ('KP0103', 2026, 9, 2, 'Hanif',  'Tandas belum disapu', ARRAY[5, 4, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 4])
;

-- Who scored: a payroll number as it stands, otherwise every scorer at the
-- person's outlet (home posting or covered) whose short name is that name or
-- whose full name has it as a word. Exactly one match is needed; the check
-- below lists the rest.
UPDATE import_marks i
   SET scorer_ids = coalesce(
         (SELECT ARRAY[s.id] FROM users s WHERE s.id = upper(btrim(i.scored_by))),
         (SELECT array_agg(s.id ORDER BY s.id)
            FROM users s
            JOIN users p ON p.id = upper(btrim(i.user_id))
           WHERE s.id <> p.id
             AND s.role IN ('supervisor', 'area_manager', 'manager', 'admin')
             AND (s.branch_id = p.branch_id
                  OR EXISTS (SELECT 1 FROM user_branches ub
                              WHERE ub.user_id = s.id AND ub.branch_id = p.branch_id))
             AND (lower(s.short_name) = lower(btrim(i.scored_by))
                  OR ' ' || lower(s.name) || ' ' LIKE '% ' || lower(btrim(i.scored_by)) || ' %')),
         '{}');

-- Everything wrong with the rows, in one list, before anything is written.
DO $$
DECLARE
  problems text;
BEGIN
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
  ),
  judged AS (
    SELECT *, CASE
        -- the first that applies; the rest of the checks assume it passed
        WHEN person_id IS NULL THEN 'no such person'
        WHEN form_key IS NULL THEN 'this role is not marked on a checklist'
        WHEN branch_id IS NULL THEN 'person has no outlet'
        WHEN cardinality(scorer_ids) = 0
          THEN format('scored_by %L is not a payroll number, nor the name of a scorer at %s', scored_by, branch_id)
        WHEN cardinality(scorer_ids) > 1
          THEN format('scored_by %L could be %s — use the payroll number', scored_by, array_to_string(scorer_ids, ' or '))
        WHEN week_no NOT BETWEEN 1 AND 4 THEN 'week must be 1 to 4'
        WHEN copies > 1 THEN 'appears more than once in the rows'
        WHEN coalesce(array_length(scores, 1), 0) <> form_lines
          THEN format('%s scores given, the %s form has %s', coalesce(array_length(scores, 1), 0), form_key, form_lines)
        WHEN EXISTS (SELECT 1 FROM unnest(scores) v WHERE v < 0 OR v > scale_max)
          THEN 'a score is outside 0 to ' || scale_max
        WHEN NOT EXISTS (SELECT 1 FROM unnest(scores) v WHERE v IS NOT NULL)
          THEN 'every perkara is blank — nothing to score'
        WHEN confirmed THEN 'already confirmed by the Area Manager — delete its verification first'
      END AS why
      FROM checked
  )
  -- One entry per problem, not per row: a misspelt scorer on a whole outlet's
  -- sheets would otherwise repeat the same line for every person and week.
  SELECT string_agg(format(E'%s\n    %s%s', why, array_to_string(rows[1:6], ', '),
                           CASE WHEN cardinality(rows) > 6 THEN format(' and %s more', cardinality(rows) - 6) ELSE '' END),
                    E'\n' ORDER BY why)
    INTO problems
    FROM (SELECT why, array_agg(format('%s %s/%s week %s', user_id, period_month, period_year, week_no)
                                ORDER BY user_id, period_year, period_month, week_no) AS rows
            FROM judged
           WHERE why IS NOT NULL
           GROUP BY why) g;

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
 WHERE ml.mark_id = m.id
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
 WHERE s.score IS NOT NULL;

-- What was saved.
SELECT m.user_id, m.period_month, m.week_no, m.total_score, m.max_score, m.pct,
       (SELECT count(*) FROM mark_lines ml WHERE ml.mark_id = m.id) AS perkara_scored
  FROM marks m JOIN import_marks i
    ON m.user_id = upper(btrim(i.user_id)) AND m.period_year = i.period_year
   AND m.period_month = i.period_month AND m.week_no = i.week_no
 ORDER BY m.user_id, m.period_year, m.period_month, m.week_no;

COMMIT;
