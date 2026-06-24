-- Milestone: concepts (RoadmapModule) become the spine.
-- Every Lesson + Quiz now links to a concept, goes through an admin review
-- pipeline, and pre-milestone rows are sealed as legacy (hidden from students).

-- ─── 1. New enum for review pipeline ───
CREATE TYPE "ContentReviewStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- ─── 2. Lesson: add module_id + review pipeline + legacy flag ───
ALTER TABLE "lessons"
  ADD COLUMN "module_id"      UUID,
  ADD COLUMN "review_status"  "ContentReviewStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "reviewer_id"    UUID,
  ADD COLUMN "reviewer_notes" TEXT,
  ADD COLUMN "submitted_at"   TIMESTAMP(3),
  ADD COLUMN "reviewed_at"    TIMESTAMP(3),
  ADD COLUMN "is_legacy"      BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: every existing lesson is legacy (no concept link). Stays visible
-- to teacher as read-only; hidden from students.
UPDATE "lessons" SET "is_legacy" = TRUE;

ALTER TABLE "lessons"
  ADD CONSTRAINT "lessons_module_id_fkey"
    FOREIGN KEY ("module_id") REFERENCES "roadmap_modules"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "lessons_reviewer_id_fkey"
    FOREIGN KEY ("reviewer_id") REFERENCES "profiles"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "lessons_module_id_review_status_idx"
  ON "lessons" ("module_id", "review_status");
CREATE INDEX "lessons_school_id_review_status_idx"
  ON "lessons" ("school_id", "review_status");

-- ─── 3. Quiz: same shape (no separate lesson_id; existing Lesson.linked_quiz_id covers that). ───
ALTER TABLE "quizzes"
  ADD COLUMN "module_id"      UUID,
  ADD COLUMN "review_status"  "ContentReviewStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "reviewer_id"    UUID,
  ADD COLUMN "reviewer_notes" TEXT,
  ADD COLUMN "submitted_at"   TIMESTAMP(3),
  ADD COLUMN "reviewed_at"    TIMESTAMP(3),
  ADD COLUMN "is_legacy"      BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "quizzes" SET "is_legacy" = TRUE;

ALTER TABLE "quizzes"
  ADD CONSTRAINT "quizzes_module_id_fkey"
    FOREIGN KEY ("module_id") REFERENCES "roadmap_modules"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "quizzes_reviewer_id_fkey"
    FOREIGN KEY ("reviewer_id") REFERENCES "profiles"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "quizzes_module_id_review_status_idx"
  ON "quizzes" ("module_id", "review_status");
CREATE INDEX "quizzes_school_id_review_status_idx"
  ON "quizzes" ("school_id", "review_status");
