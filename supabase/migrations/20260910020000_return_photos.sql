-- Photo evidence on damage returns, kept small enough to stay affordable.
--
-- The sizing came from the one real month we have: 3 damage bills at Machang in
-- August. Across 38 outlets that is ~114 damage bills a month, and at two
-- straight-off-the-phone photos each it would be ~670 MB a month — more than
-- any cheap tier holds, and growing forever.
--
-- Three limits keep it bounded instead:
--   * the app resizes to 1280px and compresses before upload (~200 KB)
--   * the bucket refuses anything over 1 MB, so that discipline is enforced
--     server-side rather than trusted to the client
--   * photos are deleted 30 days after the bill clears — the evidence has done
--     its job once the supplier has accepted it
--
-- Steady state lands around 134 MB rather than climbing without limit.

-- ------------------------------------------------------------- the bucket ---
-- Private. A damage photo can show a branch, a person, or a supplier's goods,
-- and none of that belongs behind a guessable public URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('return-photos', 'return-photos', false, 1048576,
        ARRAY['image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types,
      public = false;

-- -------------------------------------------------------------- the rows ---
CREATE TABLE IF NOT EXISTS return_photos (
  id            bigserial PRIMARY KEY,
  return_id     bigint NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  -- `${branch_id}/${ref}/${uuid}.jpg`. The leading folder is the branch, which
  -- is how the storage policies scope a file without joining anything.
  storage_path  text NOT NULL UNIQUE,
  uploaded_by   text REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS return_photos_return_idx ON return_photos (return_id);

COMMENT ON TABLE return_photos IS
  'Evidence on damage returns. The file lives in storage; this row is what RLS governs and what retention reads.';

-- Two per bill. A dented tin needs one angle and maybe a second; a dozen is
-- someone using the app as a camera roll, and it is the storage bill that pays.
CREATE OR REPLACE FUNCTION return_photos_cap()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF (SELECT count(*) FROM return_photos WHERE return_id = NEW.return_id) >= 2 THEN
    RAISE EXCEPTION 'a return may carry at most 2 photos';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS return_photos_cap_check ON return_photos;
CREATE TRIGGER return_photos_cap_check
  BEFORE INSERT ON return_photos
  FOR EACH ROW EXECUTE FUNCTION return_photos_cap();

-- Deleting the row takes the file with it, so retention only has to work in one
-- place and an orphaned object cannot quietly accumulate.
CREATE OR REPLACE FUNCTION return_photos_drop_object()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, storage, pg_temp
AS $$
BEGIN
  DELETE FROM storage.objects
   WHERE bucket_id = 'return-photos' AND name = OLD.storage_path;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS return_photos_drop_file ON return_photos;
CREATE TRIGGER return_photos_drop_file
  AFTER DELETE ON return_photos
  FOR EACH ROW EXECUTE FUNCTION return_photos_drop_object();

-- --------------------------------------------------------------- the rules ---
ALTER TABLE return_photos ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON return_photos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE return_photos_id_seq TO authenticated;

CREATE POLICY return_photos_read ON return_photos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM returns r WHERE r.id = return_id
                   AND app_can_see_branch_returns(r.branch_id)
                   AND app_can_see_returns()));

CREATE POLICY return_photos_write ON return_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM returns r WHERE r.id = return_id
                   AND app_can_see_branch_returns(r.branch_id))
         AND app_is_returns_writer())
  WITH CHECK (EXISTS (SELECT 1 FROM returns r WHERE r.id = return_id
                        AND app_can_see_branch_returns(r.branch_id))
              AND app_is_returns_writer());

-- ----------------------------------------------------- the files themselves ---
-- Same predicates as the rows, read off the first folder in the path. Without
-- these the bucket would be governed by nothing, and the whole point of the
-- last three sprints is that access is the database's decision.
DROP POLICY IF EXISTS return_photos_object_read ON storage.objects;
DROP POLICY IF EXISTS return_photos_object_write ON storage.objects;
DROP POLICY IF EXISTS return_photos_object_delete ON storage.objects;

CREATE POLICY return_photos_object_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'return-photos'
         AND app_can_see_returns()
         AND app_can_see_branch_returns((storage.foldername(name))[1]));

CREATE POLICY return_photos_object_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'return-photos'
              AND app_is_returns_writer()
              AND app_can_see_branch_returns((storage.foldername(name))[1]));

CREATE POLICY return_photos_object_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'return-photos'
         AND app_is_returns_writer()
         AND app_can_see_branch_returns((storage.foldername(name))[1]));

-- ------------------------------------------------------------- retention ---
-- Run on a schedule if pg_cron is available, by hand otherwise. Deleting the
-- row fires the trigger above, so the file goes with it.
CREATE OR REPLACE FUNCTION purge_cleared_return_photos(after_days int DEFAULT 30)
  RETURNS int
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  removed int;
BEGIN
  WITH gone AS (
    DELETE FROM return_photos p
     USING returns r, return_events e
     WHERE p.return_id = r.id
       AND e.return_id = r.id
       AND e.stage = 'adjusted'
       AND e.occurred_on < CURRENT_DATE - after_days
    RETURNING p.id
  )
  SELECT count(*) INTO removed FROM gone;
  RETURN removed;
END;
$$;

COMMENT ON FUNCTION purge_cleared_return_photos(int) IS
  'Deletes evidence for bills cleared more than N days ago. Returns how many went.';
