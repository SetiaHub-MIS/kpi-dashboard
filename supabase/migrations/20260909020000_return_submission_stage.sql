-- Store staff must hand each return list to the kerani before Friday of the week
-- it arrived. That handover was invisible before: the chain went straight from
-- receiving to segregation, so a list could sit in the store unreported and
-- nothing measured it.
--
-- Alone in its own migration on purpose. Postgres will not let a new enum value
-- be *used* in the same transaction that adds it, so anything referencing
-- 'submitted_to_clerk' lives in the next migration.

ALTER TYPE return_stage ADD VALUE IF NOT EXISTS 'submitted_to_clerk' AFTER 'received';
