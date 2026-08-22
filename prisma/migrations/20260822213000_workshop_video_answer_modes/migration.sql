CREATE TYPE "WorkshopVideoAnswerMode" AS ENUM ('SINGLE', 'MULTIPLE', 'NONE');

ALTER TABLE "workshop_video_questions"
ADD COLUMN "answer_mode" "WorkshopVideoAnswerMode" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN "correct_answers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "workshop_video_questions"
SET "correct_answers" = ARRAY["correct_answer"]::TEXT[]
WHERE "type" = 'MCQ' AND BTRIM("correct_answer") <> '';
