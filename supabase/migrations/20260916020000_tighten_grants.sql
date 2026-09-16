-- Bring the live grants back to what grants.sql said.
--
-- grants.sql gives the signed-in role four verbs — SELECT, INSERT, UPDATE,
-- DELETE — and gives anon nothing. The live database disagreed on both
-- counts, and had since Sprint 1: running verify_policies.sql against it
-- showed authenticated holding seven privileges on every table, the extra
-- three being TRUNCATE, REFERENCES and TRIGGER.
--
-- Nobody wrote that. Supabase's platform sets default privileges so that any
-- table the postgres role creates in public is granted ALL to anon,
-- authenticated and service_role — and every migration here was applied by
-- pasting it into the dashboard as postgres. The PGlite harness has no such
-- default, which is why the test suite never noticed.
--
-- The extras are unreachable through PostgREST, which exposes no TRUNCATE and
-- no DDL, so nothing in the app could use them. They still should not sit on
-- a role that ships in the anon key on every phone: TRUNCATE is not subject to
-- row-level security at all. This takes them back, on the tables that exist
-- and on the ones not written yet. service_role is untouched.

REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Default privileges are per granting role. Migrations run as postgres in the
-- dashboard, so this is the set that governs the next CREATE TABLE.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
