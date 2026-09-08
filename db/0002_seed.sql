-- Checklist Mingguan — seed data
--
-- Provenance:
--   REAL  — carried from KP-STAFF-2026.xlsx / WS-SUPV-2026.xlsx
--   NEW   — invented while prototyping, replace before going live
--
-- Marks below are seeded from the weekly percentages the workbooks recorded.
-- The schema stores total_score as the truth and generates pct, so a couple of
-- seeded percentages land one point off the spreadsheet where the total cannot
-- express that exact percentage (e.g. 83% of 85 is not reachable).

BEGIN;

-- ------------------------------------------------------------- branches ----

INSERT INTO branches (id, name, short_name, active) VALUES
  ('MCG', 'Kedai Machang',    'Machang',    true),   -- REAL: the workbook branch
  ('KBR', 'Kedai Kota Bharu', 'Kota Bharu', true);   -- NEW

INSERT INTO scoring_rules (branch_id, pass_threshold, scale_max, verify_by_manager) VALUES
  ('MCG', 80, 5, true),
  ('KBR', 80, 5, true);

-- ---------------------------------------------------------------- users ----

INSERT INTO users (id, name, short_name, initials, role, branch_id) VALUES
  -- REAL: KP-STAFF-2026.xlsx, one sheet per person
  ('KP0093', 'Syazana Izzah Zafirah',        'Syazana',      'SI', 'staff',      'MCG'),
  ('KP0103', 'Putri Wahida Amalin',          'Putri W.',     'PW', 'staff',      'MCG'),
  ('KP0108', 'Nor Asyikin',                  'Nor Asyikin',  'NA', 'staff',      'MCG'),
  ('KP0110', 'Filzah Diyana',                'Filzah',       'FD', 'staff',      'MCG'),
  ('KP0111', 'Puteri Nur Hafiza',            'Puteri N.',    'PN', 'staff',      'MCG'),
  ('MY0544', 'U Tin Tun',                    'U Tin Tun',    'UT', 'staff',      'MCG'),
  ('MY0606', 'Ah San',                       'Ah San',       'AS', 'staff',      'MCG'),
  ('MY0644', 'Pyhi Si Thu',                  'Pyhi Si Thu',  'PS', 'staff',      'MCG'),
  -- REAL: WS-SUPV-2026.xlsx
  ('WS0001', 'Nur Syahirah',                 'Nur Syahirah', 'NS', 'supervisor', 'MCG'),
  ('WS0012', 'Wan Nurul Nabilah Haizum',     'Wan Nurul',    'WN', 'supervisor', 'KBR'),
  -- REAL name, NEW id: Herdi signs the TUGASAN AREA MANAGER block but is never numbered
  ('AM0001', 'Herdi',                        'Herdi',        'H',  'manager',    'MCG'),
  -- NEW: pekerja stor
  ('ST0001', 'Hafiz bin Osman',              'Hafiz',        'HO', 'store',      'MCG'),
  ('ST0002', 'Ramesh a/l Kumaran',           'Ramesh',       'RK', 'store',      'MCG'),
  ('ST0003', 'Nurul Huda binti Salleh',      'Nurul H.',     'NH', 'store',      'MCG'),
  ('ST0101', 'Sanjay a/l Muthu',             'Sanjay',       'SM', 'store',      'KBR'),
  -- NEW: kerani stor
  ('KR0001', 'Faridah binti Hassan',         'Faridah',      'FH', 'clerk',      'MCG'),
  ('KR0101', 'Chong Mei Ling',               'Mei Ling',     'CM', 'clerk',      'KBR'),
  -- NEW: Kota Bharu outlet
  ('KP0201', 'Aina Sofea binti Roslan',      'Aina S.',      'AR', 'staff',      'KBR'),
  ('KP0202', 'Muhammad Danial bin Zulkifli', 'Danial',       'MZ', 'staff',      'KBR'),
  ('KP0203', 'Lim Wei Jian',                 'Wei Jian',     'LW', 'staff',      'KBR'),
  ('AM0002', 'Farah Adilah',                 'Farah',        'FA', 'manager',    'KBR'),
  -- NEW: cross-branch administrator
  ('AD0001', 'Pentadbir Sistem',             'Pentadbir',    'PS', 'admin',      NULL);

-- ----------------------------------------------------- checklist: kedai ----
-- REAL: CHECKLIST STAFF, 7 kategori / 22 perkara, labels verbatim.

INSERT INTO checklist_forms (key, name, applies_to) VALUES
  ('kedai', 'Checklist Pekerja Kedai', 'staff'),
  ('stor',  'Checklist Pekerja Stor',  'store');

INSERT INTO checklist_categories (form_key, position, name) VALUES
  ('kedai', 1, 'KEDATANGAN'),
  ('kedai', 2, 'DISPLIN'),
  ('kedai', 3, 'KEBERSIHAN BAHAGIAN'),
  ('kedai', 4, 'KEKEMASAN BAHAGIAN'),
  ('kedai', 5, 'KEBERSIHAN & KEKEMASAN STOR'),
  ('kedai', 6, 'PENYUSUAN BARANG'),
  ('kedai', 7, 'KEBERSIHAN KEDAI'),
  -- NEW: no store checklist exists in the workbooks; replace with the real form.
  ('stor',  1, 'PENERIMAAN BARANG'),
  ('stor',  2, 'SUSUNAN STOK'),
  ('stor',  3, 'KAWALAN TARIKH LUPUT'),
  ('stor',  4, 'KEBERSIHAN STOR'),
  ('stor',  5, 'KESELAMATAN'),
  ('stor',  6, 'REKOD & STOK');

INSERT INTO checklist_lines (category_id, position, label)
SELECT c.id, v.position, v.label
FROM (VALUES
  ('kedai', 1, 1, 'KEDATANGAN'),
  ('kedai', 2, 1, 'DISPLIN'),
  ('kedai', 3, 1, 'A) LANTAI'),
  ('kedai', 3, 2, 'B) RAK / TEMPAT KAUNTER'),
  ('kedai', 3, 3, 'C) BARANG DISPLAY'),
  ('kedai', 4, 1, 'A) BARANG DISPLAY'),
  ('kedai', 4, 2, 'B) LEBIHAN BARANG'),
  ('kedai', 5, 1, 'KEBERSIHAN & KEKEMASAN STOR'),
  ('kedai', 6, 1, 'A) PASTIKAN SETIAP BARANG SUSUN DI ATAS RAK'),
  ('kedai', 6, 2, 'B) ''FIRST IN FIRST OUT'''),
  ('kedai', 6, 3, 'C) TURUN & TAMBAH STOK'),
  ('kedai', 6, 4, 'D) PERIKSA BARANG TARIKH LUPUT'),
  ('kedai', 6, 5, 'E) REPACKING'),
  ('kedai', 7, 1, 'A) TANDAS'),
  ('kedai', 7, 2, 'B) KIPAS'),
  ('kedai', 7, 3, 'C) AIR-COND'),
  ('kedai', 7, 4, 'D) AIR COOLER'),
  ('kedai', 7, 5, 'E) SAWANG'),
  ('kedai', 7, 6, 'F) KAKI LIMA / PARKING LOT'),
  ('kedai', 7, 7, 'G) LONGKANG'),
  ('kedai', 7, 8, 'H) POTONG POKOK / RUMPUT'),
  ('kedai', 7, 9, 'I) PETI SEJUK'),

  ('stor', 1, 1, 'A) SEMAK INVOIS & DELIVERY ORDER'),
  ('stor', 1, 2, 'B) SEMAK KUANTITI & KEADAAN BARANG'),
  ('stor', 1, 3, 'C) REKOD TERIMA DALAM SISTEM'),
  ('stor', 2, 1, 'A) SUSUN IKUT KATEGORI'),
  ('stor', 2, 2, 'B) ''FIRST IN FIRST OUT'''),
  ('stor', 2, 3, 'C) LABEL RAK JELAS'),
  ('stor', 3, 1, 'A) SEMAK TARIKH LUPUT MINGGUAN'),
  ('stor', 3, 2, 'B) ASINGKAN BARANG HAMPIR LUPUT'),
  ('stor', 4, 1, 'A) LANTAI STOR'),
  ('stor', 4, 2, 'B) RAK & PALET'),
  ('stor', 4, 3, 'C) SAMPAH & KADBOD'),
  ('stor', 5, 1, 'A) LALUAN KELUAR TIDAK DIHALANG'),
  ('stor', 5, 2, 'B) ALAT PEMADAM API'),
  ('stor', 5, 3, 'C) SUSUNAN TINGGI SELAMAT'),
  ('stor', 6, 1, 'A) STOK TAKE MINGGUAN'),
  ('stor', 6, 2, 'B) REKOD BARANG ROSAK / PULANGAN'),
  ('stor', 6, 3, 'C) LAPOR STOK RENDAH')
) AS v(form_key, cat_position, position, label)
JOIN checklist_categories c
  ON c.form_key = v.form_key AND c.position = v.cat_position;

-- ---------------------------------------------------------------- marks ----
-- REAL: the weekly percentages recorded for SEPTEMBER 2026. Every other cell in
-- the workbook was blank, which is exactly what mark_coverage reports as a gap.

INSERT INTO marks (user_id, branch_id, form_key, period_year, period_month, week_no, total_score, max_score, note, scored_by)
VALUES
  ('KP0093', 'MCG', 'kedai', 2026, 9, 1,  95, 110, 'Kedatangan penuh. Tandas belum disapu masa handover — kali kedua bulan ni.', 'WS0001'),
  ('KP0103', 'MCG', 'kedai', 2026, 9, 1,  89, 110, NULL, 'WS0001'),
  ('KP0103', 'MCG', 'kedai', 2026, 9, 2,  86, 110, 'Rak kaunter kemas. Lebihan barang tak dipulangkan ke stor.', 'WS0001'),
  ('KP0108', 'MCG', 'kedai', 2026, 9, 1,  89, 110, NULL, 'WS0001'),
  ('KP0111', 'MCG', 'kedai', 2026, 9, 1,  81, 110, 'Lewat 3 hari minggu ni. Sawang di bahagian atas rak belum dibersihkan.', 'WS0001'),
  ('KP0111', 'MCG', 'kedai', 2026, 9, 2,  78, 110, NULL, 'WS0001'),
  ('MY0544', 'MCG', 'kedai', 2026, 9, 1,  89, 110, NULL, 'WS0001'),
  ('MY0544', 'MCG', 'kedai', 2026, 9, 2,  88, 110, NULL, 'WS0001'),
  ('MY0606', 'MCG', 'kedai', 2026, 9, 1,  89, 110, NULL, 'WS0001'),
  -- NEW: pekerja stor, scored out of 85
  ('ST0001', 'MCG', 'stor',  2026, 9, 1,  71,  85, NULL, 'WS0001'),
  ('ST0001', 'MCG', 'stor',  2026, 9, 2,  69,  85, NULL, 'WS0001'),
  ('ST0002', 'MCG', 'stor',  2026, 9, 1,  67,  85, NULL, 'WS0001'),
  -- NEW: Kota Bharu
  ('KP0201', 'KBR', 'kedai', 2026, 9, 1,  97, 110, NULL, 'WS0012'),
  ('KP0201', 'KBR', 'kedai', 2026, 9, 2,  94, 110, NULL, 'WS0012'),
  ('KP0202', 'KBR', 'kedai', 2026, 9, 1,  84, 110, NULL, 'WS0012'),
  ('ST0101', 'KBR', 'stor',  2026, 9, 1,  71,  85, NULL, 'WS0012');

-- REAL: the only three cells the manager ever signed off.
INSERT INTO mark_verifications (mark_id, verified_by)
SELECT m.id, 'AM0001'
FROM marks m
WHERE (m.user_id, m.week_no) IN (('KP0093', 1), ('KP0103', 1), ('MY0544', 1))
  AND m.period_year = 2026 AND m.period_month = 9;

-- -------------------------------------------------------------- tugasan ----
-- REAL: TUGASAN AREA MANAGER, OGOS 2026 block — the one month Herdi filled.

INSERT INTO tugasan_items (key, label, note_kind, position) VALUES
  ('peti_cash', 'A) PETI CASH', 'amount', 1),
  ('x_report',  'B) X REPORT',  'status', 2);

INSERT INTO tugasan_checks (branch_id, period_year, period_month, week_no, item_key, done, note, inspected_on) VALUES
  ('MCG', 2026, 8, 1, 'peti_cash', true, 'RM4,000',  DATE '2026-08-02'),
  ('MCG', 2026, 8, 2, 'peti_cash', true, 'RM4,000',  DATE '2026-08-09'),
  ('MCG', 2026, 8, 3, 'peti_cash', true, 'RM4,000',  DATE '2026-08-16'),
  -- Week 4 was ticked with an amount but never dated in the workbook.
  ('MCG', 2026, 8, 4, 'peti_cash', true, 'RM4,000',  NULL),
  ('MCG', 2026, 8, 1, 'x_report',  true, 'SALES OK', DATE '2026-08-02'),
  ('MCG', 2026, 8, 2, 'x_report',  true, 'SALES OK', DATE '2026-08-09'),
  ('MCG', 2026, 8, 3, 'x_report',  true, 'SALES OK', DATE '2026-08-16'),
  ('MCG', 2026, 8, 4, 'x_report',  true, 'SALES OK', NULL);

-- checked_by stays NULL: DIPERIKSA OLEH is blank in every workbook block.
INSERT INTO tugasan_signoffs (branch_id, period_year, period_month, week_no, filled_by, checked_by, signed_on) VALUES
  ('MCG', 2026, 8, 1, 'AM0001', NULL, DATE '2026-08-02'),
  ('MCG', 2026, 8, 2, 'AM0001', NULL, DATE '2026-08-09'),
  ('MCG', 2026, 8, 3, 'AM0001', NULL, DATE '2026-08-16'),
  ('MCG', 2026, 8, 4, 'AM0001', NULL, DATE '2026-08-23');

-- --------------------------------------------------------------- assets ----
-- REAL: CHECKLIST KEDAI asset log for Machang.

INSERT INTO assets (branch_id, name, is_open, note, opened_on) VALUES
  ('MCG', 'A) AIR-COND',              true,  '2 unit a/c tak sejuk; 1 unit on 20 minit NCB jatuh. Sdh report dlm group.', DATE '2026-08-05'),
  ('MCG', 'B) AIR COOLER',            false, NULL, NULL),
  ('MCG', 'C) LAMPU',                 false, NULL, NULL),
  ('MCG', 'D) KIPAS',                 false, NULL, NULL),
  ('MCG', 'E) KOMPUTER',              false, NULL, NULL),
  ('MCG', 'F) SALURAN AIR TANDAS',    false, NULL, NULL),
  ('MCG', 'G) KEBOCORAN AIR',         false, NULL, NULL),
  ('MCG', 'H) SIGNBOARD',             false, NULL, NULL),
  ('MCG', 'I) SPOTLIGHT',             false, NULL, NULL),
  ('MCG', 'J) LAIN-LAIN: TILE LANTAI', true, 'Tile lantai kedai ada yg rosak/pecah di beberapa tempat. Sdh report dlm group.', DATE '2026-08-27'),
  -- NEW
  ('KBR', 'A) AIR-COND',              false, NULL, NULL),
  ('KBR', 'B) AIR COOLER',            false, NULL, NULL),
  ('KBR', 'C) LAMPU',                 false, NULL, NULL),
  ('KBR', 'D) KIPAS',                 false, NULL, NULL),
  ('KBR', 'E) KOMPUTER',              false, NULL, NULL),
  ('KBR', 'F) SALURAN AIR TANDAS',    false, NULL, NULL),
  ('KBR', 'G) KEBOCORAN AIR',         true,  'Paip belakang stor bocor sejak minggu lepas. Menunggu tukang paip.', DATE '2026-08-31'),
  ('KBR', 'H) SIGNBOARD',             false, NULL, NULL),
  ('KBR', 'I) SPOTLIGHT',             false, NULL, NULL);

-- -------------------------------------------------------------- returns ----
-- NEW: the returns workflow has no workbook equivalent.

INSERT INTO suppliers (name) VALUES
  ('Munchy Food Industries'),
  ('Gardenia Bakeries'),
  ('Dutch Lady Milk'),
  ('Life Food Industries'),
  ('Padiberas Nasional');

INSERT INTO returns (ref, branch_id, bill_no, bill_date, reason, remark, supplier_id, disposition, created_by)
SELECT v.ref, v.branch_id, v.bill_no, v.bill_date::date, v.reason::return_reason, v.remark,
       s.id, v.disposition::return_disposition, v.created_by
FROM (VALUES
  ('PR0001', 'MCG', 'BR-8842', '2026-08-24', 'damage',  'Kotak biskut penyek masa hantar.',     'Munchy Food Industries', 'supplier', 'ST0001'),
  ('PR0002', 'MCG', 'BR-8907', '2026-09-01', 'expired', 'Roti dan susu segar tamat tempoh.',    'Gardenia Bakeries',      'discard',  'ST0001'),
  ('PR0003', 'MCG', 'BR-8931', '2026-09-05', 'damage',  'Tin susu kemek, 6 unit.',              'Dutch Lady Milk',        'supplier', 'ST0002'),
  ('PR0004', 'MCG', 'BR-8944', '2026-09-07', 'expired', 'Sos cili tamat tempoh 2 kotak.',       'Life Food Industries',   NULL,       'ST0001'),
  ('PR0101', 'KBR', 'BR-2210', '2026-09-03', 'damage',  'Beg beras koyak.',                     'Padiberas Nasional',     'supplier', 'ST0101')
) AS v(ref, branch_id, bill_no, bill_date, reason, remark, supplier_name, disposition, created_by)
JOIN suppliers s ON s.name = v.supplier_name;

INSERT INTO return_events (return_id, stage, occurred_on, recorded_by)
SELECT r.id, v.stage::return_stage, v.occurred_on::date, v.recorded_by
FROM (VALUES
  ('PR0001', 'received',        '2026-08-24', 'ST0001'),
  ('PR0001', 'segregated',      '2026-08-25', 'ST0001'),
  ('PR0001', 'supplier_called', '2026-08-26', 'KR0001'),
  ('PR0001', 'picked_up',       '2026-09-02', 'KR0001'),
  ('PR0001', 'adjusted',        '2026-09-03', 'ST0001'),

  ('PR0002', 'received',        '2026-09-01', 'ST0001'),
  ('PR0002', 'segregated',      '2026-09-02', 'ST0001'),
  ('PR0002', 'discarded',       '2026-09-04', 'ST0001'),

  ('PR0003', 'received',        '2026-09-05', 'ST0002'),
  ('PR0003', 'segregated',      '2026-09-06', 'ST0002'),

  ('PR0004', 'received',        '2026-09-07', 'ST0001'),

  ('PR0101', 'received',        '2026-09-03', 'ST0101'),
  ('PR0101', 'segregated',      '2026-09-04', 'ST0101'),
  ('PR0101', 'supplier_called', '2026-09-04', 'KR0101')
) AS v(ref, stage, occurred_on, recorded_by)
JOIN returns r ON r.ref = v.ref;

COMMIT;
