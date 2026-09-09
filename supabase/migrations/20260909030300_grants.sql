-- Table privileges for the signed-in role.
--
-- These are separate from RLS and both are required. A policy narrows *which
-- rows* a caller may touch; it grants no access to the table itself. Without
-- the GRANTs below, PostgREST answers every request with
-- `42501 permission denied for table users` no matter how correct the policies
-- are — which is exactly what happened the first time anyone signed in.
--
-- `anon` is deliberately given nothing. Every policy in this schema is written
-- `TO authenticated`, so an unauthenticated caller has no business reaching any
-- table, and the absence of a grant is the outer wall in front of that.

GRANT USAGE ON SCHEMA public TO authenticated;

-- Row filtering is the policies' job, so the verbs are granted broadly and the
-- policies decide what actually happens. A table with RLS enabled and no
-- matching policy still refuses everything.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- bigserial primary keys need their sequence to be usable by whoever inserts.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Anything added later inherits the same treatment, so a future migration that
-- creates a table does not silently arrive unreachable.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
