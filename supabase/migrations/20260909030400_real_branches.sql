-- Bring a live database's branch list up to date.
--
-- The 39 real branches arrived in seed.sql, which only ever runs on a fresh
-- database. Anything already deployed still holds the two invented placeholders
-- MCG and KBR — so this migrates the data rather than re-seeding, because by
-- now there are auth accounts linked to those staff rows and re-seeding would
-- orphan every one of them.
--
-- Three things happen here, in this order because of the foreign keys:
--   1. the real branches are inserted
--   2. everything pointing at MCG/KBR is repointed to DMC/DKB, the real codes
--      for Machang and Kota Bharu — and the same codes the stock system's
--      returns export uses
--   3. the stor team moves to HQ, where the central store actually is
--
-- Safe to re-run: every step is conditional on the old rows still existing.

-- ------------------------------------------------------------ 1. branches ---
-- REAL: uploads/Cawangan.xlsx. HQ Jenjarom is the central store.
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
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------- 2. repoint the old two ---
-- Machang and Kota Bharu already carry history, so their rows move rather than
-- being recreated. Marks keep their branch snapshot, which is the point of it.
DO $$
DECLARE
  moves CONSTANT text[][] := ARRAY[['MCG','DMC'], ['KBR','DKB']];
  m     text[];
BEGIN
  FOREACH m SLICE 1 IN ARRAY moves LOOP
    CONTINUE WHEN NOT EXISTS (SELECT 1 FROM branches WHERE id = m[1]);

    UPDATE users            SET branch_id      = m[2] WHERE branch_id      = m[1];
    UPDATE marks            SET branch_id      = m[2] WHERE branch_id      = m[1];
    UPDATE assets           SET branch_id      = m[2] WHERE branch_id      = m[1];
    UPDATE returns          SET branch_id      = m[2] WHERE branch_id      = m[1];
    UPDATE tugasan_checks   SET branch_id      = m[2] WHERE branch_id      = m[1];
    UPDATE tugasan_signoffs SET branch_id      = m[2] WHERE branch_id      = m[1];
    UPDATE branch_changes   SET from_branch_id = m[2] WHERE from_branch_id = m[1];
    UPDATE branch_changes   SET to_branch_id   = m[2] WHERE to_branch_id   = m[1];

    -- user_branches is keyed (user_id, branch_id), so a row that would collide
    -- with one already pointing at the new code is dropped rather than updated.
    DELETE FROM user_branches ub
     WHERE ub.branch_id = m[1]
       AND EXISTS (SELECT 1 FROM user_branches x
                    WHERE x.user_id = ub.user_id AND x.branch_id = m[2]);
    UPDATE user_branches SET branch_id = m[2] WHERE branch_id = m[1];

    -- scoring_rules is keyed by branch, so the new row may already exist.
    DELETE FROM scoring_rules WHERE branch_id = m[1]
       AND EXISTS (SELECT 1 FROM scoring_rules WHERE branch_id = m[2]);
    UPDATE scoring_rules SET branch_id = m[2] WHERE branch_id = m[1];

    DELETE FROM branches WHERE id = m[1];
  END LOOP;
END $$;

-- --------------------------------------------- 3. the stor team sits at HQ ---
-- Pekerja stor and kerani stor are not posted to a kedai: one central store
-- receives returns from every outlet. Their 17-perkara marks move with them,
-- because a mark's branch is where the person was scored.
UPDATE users SET branch_id = 'HQ' WHERE role IN ('store', 'clerk');

UPDATE marks SET branch_id = 'HQ'
 WHERE form_key = 'stor'
   AND user_id IN (SELECT id FROM users WHERE role IN ('store', 'clerk'));

-- Stor marks are scored against HQ's rules, so HQ needs a row of its own.
INSERT INTO scoring_rules (branch_id, pass_threshold, scale_max, verify_by_manager)
SELECT 'HQ', 80, 5, true
 WHERE NOT EXISTS (SELECT 1 FROM scoring_rules WHERE branch_id = 'HQ');

-- What the database now holds. Expect 39 branches and no MCG or KBR.
SELECT (SELECT count(*) FROM branches)                                AS branches,
       (SELECT count(*) FROM branches WHERE id IN ('MCG','KBR'))      AS leftovers,
       (SELECT count(*) FROM users WHERE role IN ('store','clerk')
                                     AND branch_id IS DISTINCT FROM 'HQ') AS stor_not_at_hq;
