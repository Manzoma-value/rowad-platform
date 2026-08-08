-- Trait methodology v2: bilingual definitions, many-to-many concept targets,
-- exact multi-educator readings, and immutable revision history.

ALTER TABLE "stage_traits"
  ADD COLUMN "name_sq" TEXT,
  ADD COLUMN "definition_sq" TEXT;

ALTER TABLE "roadmap_stages"
  ADD COLUMN "qualification_ar" TEXT,
  ADD COLUMN "qualification_sq" TEXT;

ALTER TABLE "stage_traits"
  ALTER COLUMN "definition" DROP NOT NULL;

ALTER TABLE "trait_elements"
  ADD COLUMN "text_sq" TEXT;

ALTER TABLE "trait_assessments"
  ADD COLUMN "observed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "trait_assessments"
  DROP CONSTRAINT IF EXISTS "trait_assessments_module_id_student_id_key";

CREATE UNIQUE INDEX "trait_assessments_module_id_student_id_teacher_id_key"
  ON "trait_assessments"("module_id", "student_id", "teacher_id");
CREATE INDEX "trait_assessments_module_id_student_id_idx"
  ON "trait_assessments"("module_id", "student_id");

CREATE TABLE "trait_assessment_snapshots" (
  "id" UUID NOT NULL,
  "assessment_id" UUID NOT NULL,
  "scores" JSONB NOT NULL,
  "general_note" TEXT,
  "observed_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trait_assessment_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "trait_assessment_snapshots_assessment_id_created_at_idx"
  ON "trait_assessment_snapshots"("assessment_id", "created_at" DESC);
ALTER TABLE "trait_assessment_snapshots"
  ADD CONSTRAINT "trait_assessment_snapshots_assessment_id_fkey"
  FOREIGN KEY ("assessment_id") REFERENCES "trait_assessments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "module_trait_links" (
  "module_id" UUID NOT NULL,
  "trait_id" UUID NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "guidance_ar" TEXT,
  "guidance_sq" TEXT,
  CONSTRAINT "module_trait_links_pkey" PRIMARY KEY ("module_id", "trait_id")
);
CREATE INDEX "module_trait_links_trait_id_idx" ON "module_trait_links"("trait_id");
ALTER TABLE "module_trait_links"
  ADD CONSTRAINT "module_trait_links_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "roadmap_modules"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "module_trait_links"
  ADD CONSTRAINT "module_trait_links_trait_id_fkey"
  FOREIGN KEY ("trait_id") REFERENCES "stage_traits"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve every existing concept-to-trait selection as the first target.
INSERT INTO "module_trait_links" ("module_id", "trait_id", "position")
SELECT "id", "main_trait_id", 0
FROM "roadmap_modules"
WHERE "main_trait_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Canonical Albanian wording from the Rowad educational references.
UPDATE "rowad_concepts"
SET "name_sq" = 'Nijeti frytdhënës'
WHERE "name_ar" = 'النية المثمرة';

UPDATE "assessment_traits"
SET "label_sq" = 'Drajah'
WHERE "label_ar" = 'الدراية';
