-- Interactive workshop videos: uploaded video files with in-video MCQ/TF
-- quiz stops, plus per-teacher view tracking and graded attempts.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('workshop-videos', 'workshop-videos', true, 367001600)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

CREATE TYPE "WorkshopVideoQuestionType" AS ENUM ('MCQ', 'TF');

CREATE TABLE "workshop_videos" (
  "id" UUID NOT NULL,
  "workshop_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mime_type" TEXT,
  "size_bytes" INTEGER,
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workshop_videos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workshop_video_questions" (
  "id" UUID NOT NULL,
  "video_id" UUID NOT NULL,
  "type" "WorkshopVideoQuestionType" NOT NULL,
  "text" TEXT NOT NULL,
  "correct_answer" TEXT NOT NULL,
  "timestamp_seconds" INTEGER NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workshop_video_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workshop_video_question_options" (
  "id" UUID NOT NULL,
  "question_id" UUID NOT NULL,
  "text" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  CONSTRAINT "workshop_video_question_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workshop_video_views" (
  "id" UUID NOT NULL,
  "video_id" UUID NOT NULL,
  "teacher_id" UUID NOT NULL,
  "first_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "workshop_video_views_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workshop_video_attempts" (
  "id" UUID NOT NULL,
  "video_id" UUID NOT NULL,
  "teacher_id" UUID NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workshop_video_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workshop_video_answers" (
  "id" UUID NOT NULL,
  "attempt_id" UUID NOT NULL,
  "question_id" UUID NOT NULL,
  "answer" TEXT NOT NULL,
  "is_correct" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workshop_video_answers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workshop_videos_workshop_id_order_idx" ON "workshop_videos"("workshop_id", "order");
CREATE INDEX "workshop_video_questions_video_id_timestamp_seconds_idx" ON "workshop_video_questions"("video_id", "timestamp_seconds");
CREATE UNIQUE INDEX "workshop_video_views_video_id_teacher_id_key" ON "workshop_video_views"("video_id", "teacher_id");
CREATE UNIQUE INDEX "workshop_video_attempts_video_id_teacher_id_key" ON "workshop_video_attempts"("video_id", "teacher_id");
CREATE UNIQUE INDEX "workshop_video_answers_attempt_id_question_id_key" ON "workshop_video_answers"("attempt_id", "question_id");

ALTER TABLE "workshop_videos"
  ADD CONSTRAINT "workshop_videos_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "workshop_videos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workshop_video_questions"
  ADD CONSTRAINT "workshop_video_questions_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "workshop_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workshop_video_question_options"
  ADD CONSTRAINT "workshop_video_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "workshop_video_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workshop_video_views"
  ADD CONSTRAINT "workshop_video_views_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "workshop_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "workshop_video_views_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workshop_video_attempts"
  ADD CONSTRAINT "workshop_video_attempts_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "workshop_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "workshop_video_attempts_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workshop_video_answers"
  ADD CONSTRAINT "workshop_video_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "workshop_video_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "workshop_video_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "workshop_video_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
