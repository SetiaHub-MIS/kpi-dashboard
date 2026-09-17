-- A person may keep their own e-mail address current.
--
-- users_write is admin's, and it has to stay that way: row-level security
-- cannot say "this row, but only this column", so an UPDATE policy for
-- "your own row" would let anyone edit their own role. This function is the
-- narrow door instead — it touches one column, on the caller's row, and
-- nothing else. The trigger from 20260917010000 then carries the address
-- across to the login, so a reset link goes to the new inbox at once.
--
-- No confirmation mail is sent to the new address. Admin sets addresses
-- the same way, and a mistyped one costs the person their self-service
-- reset — not anyone else's account. Admin can correct it.

CREATE FUNCTION set_my_email(new_email text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  me text := app_user_id();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = '42501';
  END IF;
  -- Blank clears it; the table's own CHECK and unique index judge the rest.
  UPDATE users
     SET email = NULLIF(lower(btrim(new_email)), '')
   WHERE id = me;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_my_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_my_email(text) TO authenticated;

COMMENT ON FUNCTION set_my_email(text) IS
  'The one write a non-admin may make to users: their own e-mail. Everything else on the row stays with admin.';
