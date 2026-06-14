-- The original multi-attempt migration (20260610000000_rowad_attempts) tried to
-- remove the one-row-per-(teacher,stage) restriction with DROP CONSTRAINT, but
-- Prisma had created `@@unique([teacher_id, stage])` as a unique INDEX, not a
-- table constraint. DROP CONSTRAINT silently found nothing, so the index
-- survived and blocked every retry submission after the first.
--
-- Drop it as an index. Idempotent — safe on a DB where it's already gone.
DROP INDEX IF EXISTS "rowad_submissions_teacher_id_stage_key";
