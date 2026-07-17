-- Proper many-to-many workshop enrollment, an explicit live-session state,
-- and auditable manual attendance operations.

CREATE TYPE "WorkshopEnrollmentSource" AS ENUM ('QR', 'MANUAL');
CREATE TYPE "WorkshopAttendanceSource" AS ENUM ('QR', 'MANUAL');

ALTER TABLE "workshops"
  ADD COLUMN "is_live" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "live_started_at" TIMESTAMP(3),
  ADD COLUMN "live_ended_at" TIMESTAMP(3);

CREATE TABLE "workshop_enrollments" (
  "id" UUID NOT NULL,
  "workshop_id" UUID NOT NULL,
  "teacher_id" UUID NOT NULL,
  "source" "WorkshopEnrollmentSource" NOT NULL DEFAULT 'QR',
  "enrolled_by" UUID,
  "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workshop_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workshop_enrollments_workshop_id_teacher_id_key"
  ON "workshop_enrollments"("workshop_id", "teacher_id");
CREATE INDEX "workshop_enrollments_teacher_id_enrolled_at_idx"
  ON "workshop_enrollments"("teacher_id", "enrolled_at" DESC);

ALTER TABLE "workshop_enrollments"
  ADD CONSTRAINT "workshop_enrollments_workshop_id_fkey"
  FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workshop_enrollments"
  ADD CONSTRAINT "workshop_enrollments_teacher_id_fkey"
  FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workshop_enrollments"
  ADD CONSTRAINT "workshop_enrollments_enrolled_by_fkey"
  FOREIGN KEY ("enrolled_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve every registration created by the original single-workshop field.
INSERT INTO "workshop_enrollments" ("id", "workshop_id", "teacher_id", "source", "enrolled_at")
SELECT gen_random_uuid(), "workshop_signup_id", "id", 'QR'::"WorkshopEnrollmentSource", "created_at"
FROM "teachers"
WHERE "workshop_signup_id" IS NOT NULL
ON CONFLICT ("workshop_id", "teacher_id") DO NOTHING;

ALTER TABLE "workshop_attendance"
  ADD COLUMN "source" "WorkshopAttendanceSource" NOT NULL DEFAULT 'QR',
  ADD COLUMN "recorded_by" UUID;

ALTER TABLE "workshop_attendance"
  ADD CONSTRAINT "workshop_attendance_recorded_by_fkey"
  FOREIGN KEY ("recorded_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
