ALTER TABLE "workshops"
  ADD COLUMN "audience" TEXT[] NOT NULL DEFAULT ARRAY['TEACHERS']::TEXT[],
  ADD COLUMN "audience_other" TEXT,
  ADD COLUMN "schedule" JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "materials" JSONB NOT NULL DEFAULT '[]'::JSONB;

CREATE INDEX "workshops_school_id_start_date_idx"
  ON "workshops"("school_id", "start_date");
