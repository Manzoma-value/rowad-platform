-- Multi-attempt Rowad submissions + Stage 2 admin review.

-- 1. Add STAGE2_REVIEW to the onboarding-status enum.
--    (ALTER TYPE ... ADD VALUE must run on its own statement.)
ALTER TYPE "TeacherOnboardingStatus" ADD VALUE IF NOT EXISTS 'STAGE2_REVIEW';

-- 2. Drop the unique constraint that forced one submission per (teacher, stage).
--    With multi-attempt history, every retry is a new row.
ALTER TABLE "rowad_submissions" DROP CONSTRAINT IF EXISTS "rowad_submissions_teacher_id_stage_key";

-- 3. Track which attempt this is for the (teacher, stage) pair.
--    Existing rows default to attempt #1 — they are the only attempt so far.
ALTER TABLE "rowad_submissions" ADD COLUMN IF NOT EXISTS "attempt_number" INTEGER NOT NULL DEFAULT 1;

-- 4. Hot-path indexes:
--    - Listing latest-per-stage per teacher (admin grouped view).
--    - Filtering by school + status (pending review queue).
CREATE INDEX IF NOT EXISTS "rowad_submissions_teacher_stage_created_idx"
  ON "rowad_submissions" ("teacher_id", "stage", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "rowad_submissions_school_status_idx"
  ON "rowad_submissions" ("school_id", "status");
