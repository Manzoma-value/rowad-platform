-- Workshops — in-person training with signup + attendance QR codes.

CREATE TYPE "WorkshopStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "workshops" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id"    UUID NOT NULL,
  "title"        TEXT NOT NULL,
  "description"  TEXT,
  "start_date"   DATE,
  "end_date"     DATE,
  "status"       "WorkshopStatus" NOT NULL DEFAULT 'OPEN',
  "signup_token" TEXT NOT NULL,
  "created_by"   UUID NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workshops_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workshops_signup_token_key" UNIQUE ("signup_token"),
  CONSTRAINT "workshops_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workshops_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "workshops_school_id_created_at_idx"
  ON "workshops" ("school_id", "created_at" DESC);

CREATE TABLE "workshop_attendance" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "workshop_id"   UUID NOT NULL,
  "teacher_id"    UUID NOT NULL,
  "day_date"      DATE NOT NULL,
  "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workshop_attendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workshop_attendance_workshop_id_teacher_id_day_date_key"
    UNIQUE ("workshop_id", "teacher_id", "day_date"),
  CONSTRAINT "workshop_attendance_workshop_id_fkey"
    FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workshop_attendance_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "workshop_attendance_workshop_day_idx"
  ON "workshop_attendance" ("workshop_id", "day_date");

CREATE TABLE "workshop_attendance_codes" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "workshop_id" UUID NOT NULL,
  "code"        TEXT NOT NULL,
  "day_date"    DATE NOT NULL,
  "created_by"  UUID NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workshop_attendance_codes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workshop_attendance_codes_code_key" UNIQUE ("code"),
  CONSTRAINT "workshop_attendance_codes_workshop_id_fkey"
    FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workshop_attendance_codes_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "workshop_attendance_codes_workshop_day_idx"
  ON "workshop_attendance_codes" ("workshop_id", "day_date" DESC);

-- Add workshop_signup_id to teachers (SetNull FK).
ALTER TABLE "teachers" ADD COLUMN "workshop_signup_id" UUID;
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_workshop_signup_id_fkey"
  FOREIGN KEY ("workshop_signup_id") REFERENCES "workshops"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "teachers_workshop_signup_id_idx"
  ON "teachers" ("workshop_signup_id");
