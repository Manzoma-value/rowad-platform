-- Supervisor points — the "أفضل 10 مشرفين" competition ledger.
--
-- Scores themselves are NOT stored: they are recomputed from live platform
-- activity on every read. Only the school's point distribution and the
-- admin's manual corrections are persisted here.

CREATE TABLE "points_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "rules" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "points_adjustments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "metric_key" TEXT NOT NULL,
    "override_points" DOUBLE PRECISION,
    "bonus_points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "points_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "points_configs_school_id_key" ON "points_configs"("school_id");
CREATE UNIQUE INDEX "points_adjustments_teacher_id_metric_key_key" ON "points_adjustments"("teacher_id", "metric_key");
CREATE INDEX "points_adjustments_school_id_idx" ON "points_adjustments"("school_id");

ALTER TABLE "points_configs"
  ADD CONSTRAINT "points_configs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "points_adjustments"
  ADD CONSTRAINT "points_adjustments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "points_adjustments"
  ADD CONSTRAINT "points_adjustments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "points_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "points_adjustments" ENABLE ROW LEVEL SECURITY;
