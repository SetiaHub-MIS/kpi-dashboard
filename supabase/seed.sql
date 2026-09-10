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

-- ------------------------------------------------------------- branches ----

-- REAL: uploads/Cawangan.xlsx. HQ Jenjarom is the central store; the rest
-- are the 38 kedai. Codes match the stock system's export.
INSERT INTO branches (id, name, short_name) VALUES
  ('HQ', 'HQ Jenjarom', 'HQ'),
  ('AKK', 'Kedai Kuala Kangsar', 'Kuala Kangsar'),
  ('APR', 'Kedai Pantai Remis', 'Pantai Remis'),
  ('ASP', 'Kedai Sungai Siput', 'Sungai Siput'),
  ('ASU', 'Kedai Sungai Sumun', 'Sungai Sumun'),
  ('BBT', 'Kedai Banting', 'Banting'),
  ('BKP', 'Kedai Kapar', 'Kapar'),
  ('BLB', 'Kedai Kg. Lombong', 'Kg. Lombong'),
  ('BPC', 'Kedai Puchong', 'Puchong'),
  ('BPG', 'Kedai Teluk Panglima Garang', 'Teluk Panglima Garang'),
  ('BRP', 'Kedai Rantau Panjang', 'Rantau Panjang'),
  ('BSK', 'Kedai Sekinchan', 'Sekinchan'),
  ('BSM', 'Kedai Semenyih', 'Semenyih'),
  ('BTS', 'Kedai Taman Sentosa', 'Taman Sentosa'),
  ('CJR', 'Kedai Jerantut', 'Jerantut'),
  ('DKB', 'Kedai Kota Bharu', 'Kota Bharu'),
  ('DKD', 'Kedai Kadok', 'Kadok'),
  ('DKK', 'Kedai Kok Lanas', 'Kok Lanas'),
  ('DMC', 'Kedai Machang', 'Machang'),
  ('DMU', 'Kedai Machang Uptown', 'Machang Uptown'),
  ('DPM', 'Kedai Pasir Mas', 'Pasir Mas'),
  ('DSS', 'Kedai Selising', 'Selising'),
  ('DTD', 'Kedai Tendong', 'Tendong'),
  ('DTP', 'Kedai Tumpat', 'Tumpat'),
  ('DWB', 'Kedai Wakaf Baru', 'Wakaf Baru'),
  ('DWS', 'Kedai Wakaf Siku', 'Wakaf Siku'),
  ('KBL', 'Kedai Baling', 'Baling'),
  ('KKT', 'Kedai Kuala Ketil', 'Kuala Ketil'),
  ('NBH', 'Kedai Bahau', 'Bahau'),
  ('NPD', 'Kedai Port Dickson', 'Port Dickson'),
  ('NS2', 'Kedai Seremban 2', 'Seremban 2'),
  ('NSK', 'Kedai Sikamat', 'Sikamat'),
  ('NTM', 'Kedai Seremban', 'Seremban'),
  ('PMB', 'Kedai Machang Bubok', 'Machang Bubok'),
  ('PSJ', 'Kedai Sungai Jawi', 'Sungai Jawi'),
  ('QPJ', 'Kedai Miri', 'Miri'),
  ('TKM', 'Kedai Kemaman', 'Kemaman'),
  ('VBC', 'Kedai Batu Caves', 'Batu Caves'),
  ('VTR', 'Kedai Tun Razak', 'Tun Razak')
-- 20260909030400_real_branches inserts these too, for databases that already
-- existed when the real list arrived. On a fresh one it runs first, so the seed
-- yields rather than colliding.
ON CONFLICT (id) DO NOTHING;

INSERT INTO scoring_rules (branch_id, pass_threshold, scale_max, verify_by_manager) VALUES
  ('HQ',  80, 5, true),
  ('DMC', 80, 5, true),
  ('DKB', 80, 5, true)
ON CONFLICT (branch_id) DO NOTHING;

-- ---------------------------------------------------------------- users ----

INSERT INTO users (id, name, short_name, initials, role, branch_id) VALUES
  -- REAL: KP-STAFF-2026.xlsx, one sheet per person
  ('KP0093', 'Syazana Izzah Zafirah',        'Syazana',      'SI', 'staff',      'DMC'),
  ('KP0103', 'Putri Wahida Amalin',          'Putri W.',     'PW', 'staff',      'DMC'),
  ('KP0108', 'Nor Asyikin',                  'Nor Asyikin',  'NA', 'staff',      'DMC'),
  ('KP0110', 'Filzah Diyana',                'Filzah',       'FD', 'staff',      'DMC'),
  ('KP0111', 'Puteri Nur Hafiza',            'Puteri N.',    'PN', 'staff',      'DMC'),
  ('MY0544', 'U Tin Tun',                    'U Tin Tun',    'UT', 'staff',      'DMC'),
  ('MY0606', 'Ah San',                       'Ah San',       'AS', 'staff',      'DMC'),
  ('MY0644', 'Pyhi Si Thu',                  'Pyhi Si Thu',  'PS', 'staff',      'DMC'),
  -- REAL: WS-SUPV-2026.xlsx
  ('WS0001', 'Nur Syahirah',                 'Nur Syahirah', 'NS', 'supervisor', 'DMC'),
  ('WS0012', 'Wan Nurul Nabilah Haizum',     'Wan Nurul',    'WN', 'supervisor', 'DKB'),
  -- REAL name, NEW id: Herdi signs the TUGASAN AREA MANAGER block but is never numbered
  ('AM0001', 'Herdi',                        'Herdi',        'H',  'area_manager', 'DMC'),
  -- NEW: pekerja stor. Posted to HQ, not to a kedai — one central store
  -- receives returns from every outlet.
  ('ST0001', 'Hafiz bin Osman',              'Hafiz',        'HO', 'store',      'HQ'),
  ('ST0002', 'Ramesh a/l Kumaran',           'Ramesh',       'RK', 'store',      'HQ'),
  ('ST0003', 'Nurul Huda binti Salleh',      'Nurul H.',     'NH', 'store',      'HQ'),
  ('ST0101', 'Sanjay a/l Muthu',             'Sanjay',       'SM', 'store',      'HQ'),
  -- NEW: kerani stor
  ('KR0001', 'Faridah binti Hassan',         'Faridah',      'FH', 'clerk',      'HQ'),
  ('KR0101', 'Chong Mei Ling',               'Mei Ling',     'CM', 'clerk',      'HQ'),
  -- NEW: Kota Bharu outlet
  ('KP0201', 'Aina Sofea binti Roslan',      'Aina S.',      'AR', 'staff',      'DKB'),
  ('KP0202', 'Muhammad Danial bin Zulkifli', 'Danial',       'MZ', 'staff',      'DKB'),
  ('KP0203', 'Lim Wei Jian',                 'Wei Jian',     'LW', 'staff',      'DKB'),
  ('AM0002', 'Farah Adilah',                 'Farah',        'FA', 'area_manager', 'DKB'),
  -- NEW: head office. No branch_id — these four roles read every outlet.
  ('MG0001', 'Zulkarnain bin Ahmad',         'Zulkarnain',   'ZA', 'manager',         NULL),
  ('GM0001', 'Tan Chee Keong',               'Chee Keong',   'TC', 'general_manager', NULL),
  ('HR0001', 'Siti Norhaliza binti Yusof',   'Siti N.',      'SN', 'human_resources', NULL),
  -- NEW: cross-branch administrator
  ('AD0001', 'Pentadbir Sistem',             'Pentadbir',    'PS', 'admin',           NULL);

-- Herdi covers Kota Bharu on top of his home outlet; Farah covers only her own.
-- INVENTED: no workbook says who covers what, so this is a placeholder that
-- exists to exercise the multi-outlet path.
INSERT INTO user_branches (user_id, branch_id) VALUES
  ('AM0001', 'DKB');

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
  ('KP0093', 'DMC', 'kedai', 2026, 9, 1,  95, 110, 'Kedatangan penuh. Tandas belum disapu masa handover — kali kedua bulan ni.', 'WS0001'),
  ('KP0103', 'DMC', 'kedai', 2026, 9, 1,  89, 110, NULL, 'WS0001'),
  ('KP0103', 'DMC', 'kedai', 2026, 9, 2,  86, 110, 'Rak kaunter kemas. Lebihan barang tak dipulangkan ke stor.', 'WS0001'),
  ('KP0108', 'DMC', 'kedai', 2026, 9, 1,  89, 110, NULL, 'WS0001'),
  ('KP0111', 'DMC', 'kedai', 2026, 9, 1,  81, 110, 'Lewat 3 hari minggu ni. Sawang di bahagian atas rak belum dibersihkan.', 'WS0001'),
  ('KP0111', 'DMC', 'kedai', 2026, 9, 2,  78, 110, NULL, 'WS0001'),
  ('MY0544', 'DMC', 'kedai', 2026, 9, 1,  89, 110, NULL, 'WS0001'),
  ('MY0544', 'DMC', 'kedai', 2026, 9, 2,  88, 110, NULL, 'WS0001'),
  ('MY0606', 'DMC', 'kedai', 2026, 9, 1,  89, 110, NULL, 'WS0001'),
  -- NEW: pekerja stor, scored out of 85
  ('ST0001', 'HQ', 'stor',  2026, 9, 1,  71,  85, NULL, 'WS0001'),
  ('ST0001', 'HQ', 'stor',  2026, 9, 2,  69,  85, NULL, 'WS0001'),
  ('ST0002', 'HQ', 'stor',  2026, 9, 1,  67,  85, NULL, 'WS0001'),
  -- NEW: Kota Bharu
  ('KP0201', 'DKB', 'kedai', 2026, 9, 1,  97, 110, NULL, 'WS0012'),
  ('KP0201', 'DKB', 'kedai', 2026, 9, 2,  94, 110, NULL, 'WS0012'),
  ('KP0202', 'DKB', 'kedai', 2026, 9, 1,  84, 110, NULL, 'WS0012'),
  ('ST0101', 'HQ', 'stor',  2026, 9, 1,  71,  85, NULL, 'WS0012');

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
  ('DMC', 2026, 8, 1, 'peti_cash', true, 'RM4,000',  DATE '2026-08-02'),
  ('DMC', 2026, 8, 2, 'peti_cash', true, 'RM4,000',  DATE '2026-08-09'),
  ('DMC', 2026, 8, 3, 'peti_cash', true, 'RM4,000',  DATE '2026-08-16'),
  -- Week 4 was ticked with an amount but never dated in the workbook.
  ('DMC', 2026, 8, 4, 'peti_cash', true, 'RM4,000',  NULL),
  ('DMC', 2026, 8, 1, 'x_report',  true, 'SALES OK', DATE '2026-08-02'),
  ('DMC', 2026, 8, 2, 'x_report',  true, 'SALES OK', DATE '2026-08-09'),
  ('DMC', 2026, 8, 3, 'x_report',  true, 'SALES OK', DATE '2026-08-16'),
  ('DMC', 2026, 8, 4, 'x_report',  true, 'SALES OK', NULL);

-- checked_by stays NULL: DIPERIKSA OLEH is blank in every workbook block.
INSERT INTO tugasan_signoffs (branch_id, period_year, period_month, week_no, filled_by, checked_by, signed_on) VALUES
  ('DMC', 2026, 8, 1, 'AM0001', NULL, DATE '2026-08-02'),
  ('DMC', 2026, 8, 2, 'AM0001', NULL, DATE '2026-08-09'),
  ('DMC', 2026, 8, 3, 'AM0001', NULL, DATE '2026-08-16'),
  ('DMC', 2026, 8, 4, 'AM0001', NULL, DATE '2026-08-23');

-- --------------------------------------------------------------- assets ----
-- REAL: CHECKLIST KEDAI asset log for Machang.

INSERT INTO assets (branch_id, name, is_open, note, opened_on) VALUES
  ('DMC', 'A) AIR-COND',              true,  '2 unit a/c tak sejuk; 1 unit on 20 minit NCB jatuh. Sdh report dlm group.', DATE '2026-08-05'),
  ('DMC', 'B) AIR COOLER',            false, NULL, NULL),
  ('DMC', 'C) LAMPU',                 false, NULL, NULL),
  ('DMC', 'D) KIPAS',                 false, NULL, NULL),
  ('DMC', 'E) KOMPUTER',              false, NULL, NULL),
  ('DMC', 'F) SALURAN AIR TANDAS',    false, NULL, NULL),
  ('DMC', 'G) KEBOCORAN AIR',         false, NULL, NULL),
  ('DMC', 'H) SIGNBOARD',             false, NULL, NULL),
  ('DMC', 'I) SPOTLIGHT',             false, NULL, NULL),
  ('DMC', 'J) LAIN-LAIN: TILE LANTAI', true, 'Tile lantai kedai ada yg rosak/pecah di beberapa tempat. Sdh report dlm group.', DATE '2026-08-27'),
  -- NEW
  ('DKB', 'A) AIR-COND',              false, NULL, NULL),
  ('DKB', 'B) AIR COOLER',            false, NULL, NULL),
  ('DKB', 'C) LAMPU',                 false, NULL, NULL),
  ('DKB', 'D) KIPAS',                 false, NULL, NULL),
  ('DKB', 'E) KOMPUTER',              false, NULL, NULL),
  ('DKB', 'F) SALURAN AIR TANDAS',    false, NULL, NULL),
  ('DKB', 'G) KEBOCORAN AIR',         true,  'Paip belakang stor bocor sejak minggu lepas. Menunggu tukang paip.', DATE '2026-08-31'),
  ('DKB', 'H) SIGNBOARD',             false, NULL, NULL),
  ('DKB', 'I) SPOTLIGHT',             false, NULL, NULL);

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
  ('PR0001', 'DMC', 'BR-8842', '2026-08-24', 'damage',  'Kotak biskut penyek masa hantar.',     'Munchy Food Industries', 'supplier', 'ST0001'),
  ('PR0002', 'DMC', 'BR-8907', '2026-09-01', 'expired', 'Roti dan susu segar tamat tempoh.',    'Gardenia Bakeries',      'discard',  'ST0001'),
  ('PR0003', 'DMC', 'BR-8931', '2026-09-05', 'damage',  'Tin susu kemek, 6 unit.',              'Dutch Lady Milk',        'supplier', 'ST0002'),
  ('PR0004', 'DMC', 'BR-8944', '2026-09-07', 'expired', 'Sos cili tamat tempoh 2 kotak.',       'Life Food Industries',   NULL,       'ST0001'),
  ('PR0101', 'DKB', 'BR-2210', '2026-09-03', 'damage',  'Beg beras koyak.',                     'Padiberas Nasional',     'supplier', 'ST0101')
) AS v(ref, branch_id, bill_no, bill_date, reason, remark, supplier_name, disposition, created_by)
JOIN suppliers s ON s.name = v.supplier_name;

-- Two aged lists, dated relative to today so the ageing states stay true
-- whenever the seed is run: one inside the one-week grace, one past it.
INSERT INTO returns (ref, branch_id, bill_no, bill_date, reason, remark, supplier_id, disposition, created_by)
SELECT v.ref, v.branch_id, v.bill_no, v.bill_date, v.reason::return_reason, v.remark,
       s.id, v.disposition::return_disposition, v.created_by
FROM (VALUES
  ('PR0005', 'DMC', 'BR-8611', CURRENT_DATE - 65, 'damage',  'Kotak mi segera rosak, belum dipulangkan.', 'Munchy Food Industries', 'supplier', 'ST0001'),
  ('PR0006', 'DMC', 'BR-8502', CURRENT_DATE - 75, 'expired', 'Jus kotak tamat tempoh, masih dalam stor.',  'Life Food Industries',   'supplier', 'ST0002')
) AS v(ref, branch_id, bill_no, bill_date, reason, remark, supplier_name, disposition, created_by)
JOIN suppliers s ON s.name = v.supplier_name;

INSERT INTO return_events (return_id, stage, occurred_on, recorded_by)
SELECT r.id, v.stage::return_stage, v.occurred_on, v.recorded_by
FROM (VALUES
  ('PR0005', 'received',           CURRENT_DATE - 65, 'ST0001'),
  ('PR0005', 'submitted_to_clerk', CURRENT_DATE - 62, 'ST0001'),
  ('PR0005', 'segregated',         CURRENT_DATE - 60, 'ST0001'),
  ('PR0006', 'received',           CURRENT_DATE - 75, 'ST0002'),
  ('PR0006', 'submitted_to_clerk', CURRENT_DATE - 70, 'ST0002')
) AS v(ref, stage, occurred_on, recorded_by)
JOIN returns r ON r.ref = v.ref;

INSERT INTO return_events (return_id, stage, occurred_on, recorded_by)
SELECT r.id, v.stage::return_stage, v.occurred_on::date, v.recorded_by
FROM (VALUES
  ('PR0001', 'received',        '2026-08-24', 'ST0001'),
  -- Received Monday, handed over Tuesday: inside the Friday deadline.
  ('PR0001', 'submitted_to_clerk', '2026-08-25', 'ST0001'),
  ('PR0001', 'segregated',      '2026-08-25', 'ST0001'),
  ('PR0001', 'supplier_called', '2026-08-26', 'KR0001'),
  ('PR0001', 'picked_up',       '2026-09-02', 'KR0001'),
  ('PR0001', 'adjusted',        '2026-09-03', 'ST0001'),

  ('PR0002', 'received',        '2026-09-01', 'ST0001'),
  ('PR0002', 'submitted_to_clerk', '2026-09-03', 'ST0001'),
  ('PR0002', 'segregated',      '2026-09-02', 'ST0001'),
  ('PR0002', 'discarded',       '2026-09-04', 'ST0001'),

  -- Arrived Saturday, so the deadline is the following Friday, not the one
  -- two days earlier. Handed over Monday: on time.
  ('PR0003', 'received',        '2026-09-05', 'ST0002'),
  ('PR0003', 'submitted_to_clerk', '2026-09-07', 'ST0002'),
  ('PR0003', 'segregated',      '2026-09-06', 'ST0002'),

  -- Never handed to the kerani: this is the one that costs the week its 100%.
  ('PR0004', 'received',        '2026-09-07', 'ST0001'),

  ('PR0101', 'received',        '2026-09-03', 'ST0101'),
  ('PR0101', 'segregated',      '2026-09-04', 'ST0101'),
  ('PR0101', 'supplier_called', '2026-09-04', 'KR0101')
) AS v(ref, stage, occurred_on, recorded_by)
JOIN returns r ON r.ref = v.ref;

