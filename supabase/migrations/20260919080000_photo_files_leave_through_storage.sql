-- Photo files leave through the Storage API, never through SQL.
--
-- Supabase now guards storage.objects with its own protect_delete() trigger:
-- a plain DELETE on that table is refused ("Direct deletion from storage
-- tables is not allowed. Use the Storage API instead."). Two things here
-- relied on exactly that:
--
--   * return_photos_drop_file, the trigger that took a photo's file with its
--     row. Every delete of a return_photos row went through it — the app's
--     "Buang" button, a return deleted with its photos, and the purge below —
--     so all three were refused whole, the row included.
--   * purge_cleared_return_photos(), which deleted rows and left the files to
--     that trigger.
--
-- Both go. The app now removes the file through the Storage API first and
-- the row second (lib/photos.ts); retention moves to the purge-return-photos
-- Edge Function, which asks the database what is due, removes the files
-- through the Storage API, then deletes the rows. What stays in SQL is the
-- question of what is due, because that is a query over our own tables.

DROP TRIGGER return_photos_drop_file ON return_photos;
DROP FUNCTION return_photos_drop_object();
DROP FUNCTION purge_cleared_return_photos(int);

-- Two kinds of file are due:
--   * evidence for a bill cleared (stock adjusted) more than `after_days`
--     ago — the supplier has accepted it, and it has done its job;
--   * files with no row at all — an upload whose row was refused, a row
--     deleted before this migration, a return deleted with its photos. They
--     are invisible to the app and would otherwise sit in the bucket forever.
--     `orphan_grace` spares a file whose row is still being written: the app
--     uploads the file first and records the row a moment later.
-- photo_id is NULL for the second kind; there is no row to delete.
CREATE FUNCTION return_photos_due_for_purge(
  after_days   int      DEFAULT 30,
  orphan_grace interval DEFAULT '1 day'
)
  RETURNS TABLE (photo_id bigint, storage_path text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.storage_path
    FROM public.return_photos p
   WHERE EXISTS (
     SELECT 1 FROM public.return_events e
      WHERE e.return_id = p.return_id
        AND e.stage = 'adjusted'
        AND e.occurred_on < CURRENT_DATE - after_days
   )
  UNION ALL
  SELECT NULL, o.name
    FROM storage.objects o
   WHERE o.bucket_id = 'return-photos'
     AND o.created_at < now() - orphan_grace
     AND NOT EXISTS (SELECT 1 FROM public.return_photos p WHERE p.storage_path = o.name);
$$;

-- The Edge Function calls this under the service role; nobody signed in to
-- the app needs to, and the orphan half reads across every outlet's folder.
REVOKE EXECUTE ON FUNCTION return_photos_due_for_purge(int, interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION return_photos_due_for_purge(int, interval) TO service_role;

COMMENT ON FUNCTION return_photos_due_for_purge(int, interval) IS
  'What the purge-return-photos Edge Function should remove: evidence for bills cleared more than N days ago, and files in the bucket with no row. Lists only — files must leave through the Storage API.';
