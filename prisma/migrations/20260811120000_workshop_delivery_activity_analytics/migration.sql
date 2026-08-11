-- Distinguish online and in-person workshops, allow activity-sourced attendance,
-- and give workshop admins an auditable record of PDF engagement.

CREATE TYPE "WorkshopDeliveryMode" AS ENUM ('OFFLINE', 'ONLINE');

ALTER TYPE "WorkshopAttendanceSource" ADD VALUE 'ACTIVITY';

ALTER TABLE "workshops"
ADD COLUMN "delivery_mode" "WorkshopDeliveryMode" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN "venue" TEXT,
ADD COLUMN "meeting_url" TEXT;

CREATE TABLE "workshop_material_views" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workshop_id" UUID NOT NULL,
  "teacher_id" UUID NOT NULL,
  "material_id" TEXT NOT NULL,
  "first_opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "open_count" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "workshop_material_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workshop_material_views_workshop_id_teacher_id_material_id_key"
ON "workshop_material_views"("workshop_id", "teacher_id", "material_id");

CREATE INDEX "workshop_material_views_workshop_id_material_id_last_opened_at_idx"
ON "workshop_material_views"("workshop_id", "material_id", "last_opened_at" DESC);

ALTER TABLE "workshop_material_views"
ADD CONSTRAINT "workshop_material_views_workshop_id_fkey"
FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workshop_material_views"
ADD CONSTRAINT "workshop_material_views_teacher_id_fkey"
FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
