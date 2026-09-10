-- The SV/AS checklist, and who is allowed to score it.
--
-- REAL: WS-SUPV-2026.xlsx, sheet `CHECKLIST SV`, titled "Checklist Mingguan
-- (SA/CA/PT/TJH)". 14 kategori, 19 scoreable lines, labels verbatim —
-- including the typo in kategori 7, because changing it would stop matching the
-- paper the branches still have on the wall.
--
-- Only 17 of the 19 are scored in practice: PERIKSA METER SUBLOT and
-- LAIN-LAIN sit blank all year and the workbook's own denominator is 85, which
-- is 17 x 5. A blank there is N/A, not a zero, so `marks.max_score` carries
-- whatever that week's applicable lines came to rather than a fixed maximum.
-- The schema already stores total and max separately, so this needed no change.

INSERT INTO checklist_forms (key, name, applies_to) VALUES
  ('sv', 'Checklist SV/AS', 'supervisor')
ON CONFLICT (key) DO NOTHING;

INSERT INTO checklist_categories (form_key, position, name) VALUES
  ('sv', 1, 'KEDATANGAN'),
  ('sv', 2, 'DISPLIN'),
  ('sv', 3, 'KEBERSIHAN KEDAI'),
  ('sv', 4, 'KEKEMASAN KEDAI'),
  ('sv', 5, 'KEROSAKAN ASET KEDAI'),
  ('sv', 6, 'KEBOCORAN AIR'),
  ('sv', 7, 'KEADAAN KEDAI'),
  ('sv', 8, 'BARANG RETURN & TARIKH LUPUT'),
  ('sv', 9, 'STOK'),
  ('sv', 10, 'JADUAL PEKERJA'),
  ('sv', 11, 'PERIKSA METER SUBLOT'),
  ('sv', 12, 'DISPLAY BARANG PROMOSI DI TEMPAT VVIP'),
  ('sv', 13, 'AMBIL PERHATIAN PESANAN DALAM GROUP'),
  ('sv', 14, 'KETELITIAN & TANGGUNGJAWAB TERHADAP KERJA')
ON CONFLICT (form_key, position) DO NOTHING;

INSERT INTO checklist_lines (category_id, position, label)
SELECT c.id, v.pos, v.label
  FROM checklist_categories c
  JOIN (VALUES
    (1, 1, 'KEDATANGAN'),
    (2, 1, 'DISPLIN'),
    (3, 1, 'KEBERSIHAN KEDAI'),
    (4, 1, 'KEKEMASAN KEDAI'),
    (5, 1, 'KEROSAKAN ASET KEDAI'),
    (6, 1, 'KEBOCORAN AIR'),
    (7, 1, 'KEADAAN KEDAI'),
    (8, 1, 'BARANG RETURN & TARIKH LUPUT'),
    (9, 1, 'A) DISPLAY'),
    (9, 2, 'B) LEBIHAN BARANG'),
    (10, 1, 'A) KEDATANGAN'),
    (10, 2, 'B) JADUAL KEBERSIHAN'),
    (11, 1, 'PERIKSA METER SUBLOT'),
    (12, 1, 'DISPLAY BARANG PROMOSI DI TEMPAT VVIP'),
    (13, 1, 'AMBIL PERHATIAN PESANAN DALAM GROUP'),
    (14, 1, 'A) SALES REPORT'),
    (14, 2, 'B) INVOICE'),
    (14, 3, 'C) BORANG HR'),
    (14, 4, 'D) LAIN-LAIN:')
  ) AS v(kat, pos, label) ON c.position = v.kat
 WHERE c.form_key = 'sv'
ON CONFLICT (category_id, position) DO NOTHING;

-- ------------------------------------------------ who scores a supervisor ---
-- The workbook answers this: the NAMA row above every SV week reads HERDI, the
-- Area Manager. Until now only a supervisor or head office could insert a mark,
-- so the person who actually does this one was refused by the policy.
--
-- The MANAGER column beside it is empty for all twelve months, exactly as it is
-- on the staff form, so it stays a verification pass rather than a second score.

DROP POLICY IF EXISTS marks_insert ON marks;

CREATE POLICY marks_insert ON marks FOR INSERT TO authenticated
  WITH CHECK (app_can_see_mark(branch_id, form_key)
              AND (app_role() IN ('supervisor', 'area_manager') OR app_is_exec()));
