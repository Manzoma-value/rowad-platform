-- Rowad First-Stage peer assessment for teacher groups.
-- Each rater distributes 100 points across 5 fixed trait statements for every
-- target (incl. self). Score constraint enforced in DB to keep results clean.

CREATE TYPE "GroupAssessmentStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "group_assessments" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "group_id"   UUID NOT NULL,
  "school_id"  UUID NOT NULL,
  "created_by" UUID NOT NULL,
  "title"      TEXT NOT NULL,
  "status"     "GroupAssessmentStatus" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "closed_at"  TIMESTAMP(3),
  CONSTRAINT "group_assessments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "group_assessments_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "teacher_groups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "group_assessments_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "group_assessments_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "group_assessments_group_id_created_at_idx"
  ON "group_assessments" ("group_id", "created_at" DESC);
CREATE INDEX "group_assessments_school_id_idx"
  ON "group_assessments" ("school_id");

CREATE TABLE "assessment_ratings" (
  "assessment_id"     UUID NOT NULL,
  "rater_teacher_id"  UUID NOT NULL,
  "target_teacher_id" UUID NOT NULL,
  "s_lineage"   INT NOT NULL,
  "s_atonement" INT NOT NULL,
  "s_awareness" INT NOT NULL,
  "s_zeal"      INT NOT NULL,
  "s_distinct"  INT NOT NULL,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assessment_ratings_pkey"
    PRIMARY KEY ("assessment_id", "rater_teacher_id", "target_teacher_id"),
  CONSTRAINT "assessment_ratings_assessment_id_fkey"
    FOREIGN KEY ("assessment_id") REFERENCES "group_assessments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "assessment_ratings_rater_teacher_id_fkey"
    FOREIGN KEY ("rater_teacher_id") REFERENCES "teachers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "assessment_ratings_target_teacher_id_fkey"
    FOREIGN KEY ("target_teacher_id") REFERENCES "teachers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  -- Rowad rule of 100 + non-negative scores enforced at the DB level.
  CONSTRAINT "assessment_ratings_sum_100_chk" CHECK (
    "s_lineage" + "s_atonement" + "s_awareness" + "s_zeal" + "s_distinct" = 100
  ),
  CONSTRAINT "assessment_ratings_nonneg_chk" CHECK (
    "s_lineage" >= 0 AND "s_atonement" >= 0 AND "s_awareness" >= 0
    AND "s_zeal" >= 0 AND "s_distinct" >= 0
  )
);
CREATE INDEX "assessment_ratings_target_idx"
  ON "assessment_ratings" ("assessment_id", "target_teacher_id");
CREATE INDEX "assessment_ratings_rater_idx"
  ON "assessment_ratings" ("assessment_id", "rater_teacher_id");
