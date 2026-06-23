-- ──────────────────────────────────────────────────────────────────────
-- Replace the Rowad stage-based onboarding with a teacher Application
-- review flow. The Rowad model + concepts table stay (they back the
-- card-game), but submissions/placements are gone — game scores live
-- client-side now.
-- ──────────────────────────────────────────────────────────────────────

-- 1. Drop legacy submission tables (no app code reads them after this).
DROP TABLE IF EXISTS "rowad_placements";
DROP TABLE IF EXISTS "rowad_submissions";
DROP TYPE  IF EXISTS "RowadSubmissionStatus";

-- 2. Collapse TeacherOnboardingStatus enum.
--    All non-ACTIVE teachers are promoted to ACTIVE per product call;
--    new sign-ups will start at PENDING_APPLICATION.
CREATE TYPE "TeacherOnboardingStatus_new" AS ENUM (
  'PENDING_APPLICATION', 'UNDER_REVIEW', 'ACTIVE', 'REJECTED'
);

ALTER TABLE "teachers"
  ALTER COLUMN "onboarding_status" DROP DEFAULT,
  ALTER COLUMN "onboarding_status" TYPE "TeacherOnboardingStatus_new"
    USING (
      CASE
        WHEN "onboarding_status"::text = 'ACTIVE' THEN 'ACTIVE'::"TeacherOnboardingStatus_new"
        ELSE 'ACTIVE'::"TeacherOnboardingStatus_new"
      END
    ),
  ALTER COLUMN "onboarding_status" SET DEFAULT 'PENDING_APPLICATION';

DROP TYPE "TeacherOnboardingStatus";
ALTER TYPE "TeacherOnboardingStatus_new" RENAME TO "TeacherOnboardingStatus";

-- 3. Supporting enums for the application form.
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

CREATE TYPE "TeacherCurrentRole" AS ENUM (
  'TEACHER', 'SUPERVISOR', 'PRINCIPAL', 'VICE_PRINCIPAL',
  'COUNSELOR', 'TRAINER', 'TEAM_LEAD', 'RESEARCHER',
  'VOLUNTEER', 'OTHER'
);

CREATE TYPE "QualificationLevel" AS ENUM (
  'DIPLOMA', 'BACHELOR', 'HIGHER_DIPLOMA', 'MASTER', 'PHD'
);

CREATE TYPE "ExperienceRange" AS ENUM (
  'LT_3', 'Y_3_5', 'Y_6_10', 'Y_11_15', 'GT_15'
);

CREATE TYPE "AchievementScope" AS ENUM (
  'INSTITUTIONAL', 'CITY', 'COUNTRY', 'REGIONAL', 'INTERNATIONAL'
);

-- 4. The application table.
CREATE TABLE "teacher_applications" (
  "id"                       UUID NOT NULL DEFAULT gen_random_uuid(),
  "teacher_id"               UUID NOT NULL,
  "school_id"                UUID NOT NULL,

  "full_name"                TEXT NOT NULL,
  "age"                      INTEGER NOT NULL,
  "country"                  TEXT NOT NULL,
  "city"                     TEXT NOT NULL,
  "phone"                    TEXT NOT NULL,
  "email"                    TEXT NOT NULL,
  "gender"                   "Gender" NOT NULL,

  "nominating_entity"        TEXT,
  "nominator_name"           TEXT,
  "nominator_role"           TEXT,

  "current_role"             "TeacherCurrentRole" NOT NULL,
  "current_role_other"       TEXT,

  "qualification"            "QualificationLevel" NOT NULL,
  "specialization"           TEXT NOT NULL,
  "graduation_institution"   TEXT NOT NULL,

  "experience_areas"         TEXT[] NOT NULL DEFAULT '{}',
  "experience_areas_other"   TEXT,
  "years_of_experience"      "ExperienceRange" NOT NULL,

  "target_groups"            TEXT[] NOT NULL DEFAULT '{}',
  "target_groups_other"      TEXT,

  "contributions"            TEXT[] NOT NULL DEFAULT '{}',

  "has_achievements"         BOOLEAN NOT NULL DEFAULT FALSE,
  "achievements_scope"       "AchievementScope",

  "languages"                JSONB NOT NULL DEFAULT '[]',
  "languages_other"          TEXT,

  "attachments"              TEXT[] NOT NULL DEFAULT '{}',
  "notes"                    TEXT,

  "submitted_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewer_id"              UUID,
  "reviewer_notes"           TEXT,
  "reviewed_at"              TIMESTAMP(3),

  CONSTRAINT "teacher_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teacher_applications_teacher_id_key"
  ON "teacher_applications" ("teacher_id");

CREATE INDEX "teacher_applications_school_id_submitted_at_idx"
  ON "teacher_applications" ("school_id", "submitted_at" DESC);

ALTER TABLE "teacher_applications"
  ADD CONSTRAINT "teacher_applications_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "teacher_applications_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "teacher_applications_reviewer_id_fkey"
    FOREIGN KEY ("reviewer_id") REFERENCES "profiles"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
