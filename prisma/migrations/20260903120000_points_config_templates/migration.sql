-- Points distribution templates — a school can now keep several named point
-- distributions instead of exactly one. Exactly one may be active at a time;
-- the active template is what scores the real leaderboard.

ALTER TABLE "points_configs" DROP CONSTRAINT IF EXISTS "points_configs_school_id_fkey";
ALTER TABLE "points_configs" DROP CONSTRAINT IF EXISTS "points_configs_school_id_key";

ALTER TABLE "points_configs" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'التوزيع الافتراضي';
ALTER TABLE "points_configs" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT false;

-- Any config that already existed (one per school, under the old design)
-- becomes that school's active template so scoring is unaffected.
UPDATE "points_configs" SET "is_active" = true;

ALTER TABLE "points_configs" ALTER COLUMN "name" DROP DEFAULT;

CREATE INDEX "points_configs_school_id_idx" ON "points_configs"("school_id");
CREATE UNIQUE INDEX "points_configs_school_id_active_key" ON "points_configs"("school_id") WHERE "is_active" = true;

ALTER TABLE "points_configs"
  ADD CONSTRAINT "points_configs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
