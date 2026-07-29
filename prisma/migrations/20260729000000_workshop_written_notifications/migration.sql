ALTER TYPE "WorkshopVideoQuestionType" ADD VALUE IF NOT EXISTS 'TEXT';

CREATE TYPE "WorkshopVideoAnswerStatus" AS ENUM (
  'AUTO_GRADED',
  'PENDING_REVIEW',
  'GRADED'
);

ALTER TABLE "workshop_video_answers"
ADD COLUMN "grading_status" "WorkshopVideoAnswerStatus" NOT NULL DEFAULT 'AUTO_GRADED',
ADD COLUMN "grader_id" UUID,
ADD COLUMN "graded_at" TIMESTAMP(3),
ADD COLUMN "feedback" TEXT;

ALTER TABLE "workshop_video_answers"
ADD CONSTRAINT "workshop_video_answers_grader_id_fkey"
FOREIGN KEY ("grader_id") REFERENCES "profiles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "workshop_video_answers_grading_status_created_at_idx"
ON "workshop_video_answers"("grading_status", "created_at" DESC);

CREATE TYPE "NotificationType" AS ENUM (
  'COMMUNITY_POST',
  'COMMUNITY_REPLY',
  'WORKSHOP_ANSWER',
  'WORKSHOP_MESSAGE',
  'WORKSHOP_VIDEO',
  'WORKSHOP_MATERIAL',
  'WORKSHOP_UPDATE',
  'WORKSHOP_LIVE',
  'SYSTEM'
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "recipient_id" UUID NOT NULL,
  "actor_id" UUID,
  "type" "NotificationType" NOT NULL,
  "title_ar" TEXT NOT NULL,
  "title_sq" TEXT NOT NULL,
  "title_en" TEXT NOT NULL,
  "body_ar" TEXT,
  "body_sq" TEXT,
  "body_en" TEXT,
  "href" TEXT NOT NULL,
  "dedupe_key" TEXT,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_dedupe_key_key"
ON "notifications"("dedupe_key");

CREATE INDEX "notifications_recipient_id_read_at_created_at_idx"
ON "notifications"("recipient_id", "read_at", "created_at" DESC);

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_recipient_id_fkey"
FOREIGN KEY ("recipient_id") REFERENCES "profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "profiles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
