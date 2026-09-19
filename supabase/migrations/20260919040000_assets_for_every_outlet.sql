-- Every outlet gets the Checklist Kedai asset log.
--
-- The asset rows are a fixed catalogue the Area Manager flips between OK and
-- "belum selesai" — nothing in the app adds one. The seed created them for
-- Machang and Kota Bharu only, so an Area Manager posted anywhere else opened
-- an empty Aset kedai tab (reported 19 Sep 2026: Herdi at Machang saw the
-- log, Dailison did not). The same gap scoring_rules had, closed the same
-- way: backfill now, and a trigger for any outlet created later.
--
-- The catalogue is the CHECKLIST KEDAI sheet's own rows, A) to J). J) is the
-- free "lain-lain" slot; Machang already carries it with the issue's name
-- appended, so an outlet is only given a J) row when it has none at all.

CREATE FUNCTION asset_catalogue()
  RETURNS SETOF text
  LANGUAGE sql
  IMMUTABLE
AS $$
  SELECT unnest(ARRAY[
    'A) AIR-COND', 'B) AIR COOLER', 'C) LAMPU', 'D) KIPAS', 'E) KOMPUTER',
    'F) SALURAN AIR TANDAS', 'G) KEBOCORAN AIR', 'H) SIGNBOARD', 'I) SPOTLIGHT',
    'J) LAIN-LAIN'
  ]);
$$;

COMMENT ON FUNCTION asset_catalogue() IS
  'The rows of the CHECKLIST KEDAI asset log, as the sheet names them. Every outlet carries all of them.';

CREATE FUNCTION branches_default_assets(p_branch_id text)
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
  INSERT INTO assets (branch_id, name)
  SELECT p_branch_id, c
    FROM asset_catalogue() c
   WHERE p_branch_id <> 'HQ'
     AND NOT EXISTS (
       SELECT 1 FROM assets a
        WHERE a.branch_id = p_branch_id
          AND (a.name = c OR (c = 'J) LAIN-LAIN' AND a.name LIKE 'J) LAIN-LAIN%'))
     );
$$;

SELECT branches_default_assets(id) FROM branches;

CREATE FUNCTION branches_default_assets_trigger()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM branches_default_assets(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER branches_default_assets
  AFTER INSERT ON branches
  FOR EACH ROW EXECUTE FUNCTION branches_default_assets_trigger();
