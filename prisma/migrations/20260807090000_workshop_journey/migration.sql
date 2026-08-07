-- Workshop journey: admin-controlled requirements, quizzes and completion records.

CREATE TYPE "WorkshopRequirementType" AS ENUM ('VIDEO', 'QUIZ', 'MESSAGE', 'READING');
CREATE TYPE "WorkshopQuizQuestionType" AS ENUM ('MCQ', 'TF', 'TEXT');

CREATE TABLE "workshop_requirements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workshop_id" UUID NOT NULL,
  "type" "WorkshopRequirementType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "is_required" BOOLEAN NOT NULL DEFAULT true,
  "min_length" INTEGER NOT NULL DEFAULT 1,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workshop_requirements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workshop_quizzes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requirement_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "passing_score" INTEGER NOT NULL DEFAULT 70,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workshop_quizzes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workshop_quiz_questions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quiz_id" UUID NOT NULL,
  "type" "WorkshopQuizQuestionType" NOT NULL,
  "text" TEXT NOT NULL,
  "correct_answer" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workshop_quiz_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workshop_quiz_question_options" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "question_id" UUID NOT NULL,
  "text" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "workshop_quiz_question_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workshop_quiz_attempts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quiz_id" UUID NOT NULL,
  "teacher_id" UUID NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "completed_at" TIMESTAMP(3),
  "passed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workshop_quiz_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workshop_quiz_answers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "attempt_id" UUID NOT NULL,
  "question_id" UUID NOT NULL,
  "answer" TEXT NOT NULL,
  "is_correct" BOOLEAN NOT NULL DEFAULT false,
  "grading_status" "WorkshopVideoAnswerStatus" NOT NULL DEFAULT 'AUTO_GRADED',
  "grader_id" UUID,
  "graded_at" TIMESTAMP(3),
  "feedback" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workshop_quiz_answers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workshop_requirement_completions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requirement_id" UUID NOT NULL,
  "teacher_id" UUID NOT NULL,
  "response" TEXT,
  "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workshop_requirement_completions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workshop_completions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workshop_id" UUID NOT NULL,
  "teacher_id" UUID NOT NULL,
  "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workshop_completions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workshop_quizzes_requirement_id_key" ON "workshop_quizzes"("requirement_id");
CREATE INDEX "workshop_requirements_workshop_id_order_idx" ON "workshop_requirements"("workshop_id", "order");
CREATE INDEX "workshop_quiz_questions_quiz_id_order_idx" ON "workshop_quiz_questions"("quiz_id", "order");
CREATE UNIQUE INDEX "workshop_quiz_attempts_quiz_id_teacher_id_key" ON "workshop_quiz_attempts"("quiz_id", "teacher_id");
CREATE INDEX "workshop_quiz_attempts_teacher_id_updated_at_idx" ON "workshop_quiz_attempts"("teacher_id", "updated_at" DESC);
CREATE UNIQUE INDEX "workshop_quiz_answers_attempt_id_question_id_key" ON "workshop_quiz_answers"("attempt_id", "question_id");
CREATE INDEX "workshop_quiz_answers_grading_status_created_at_idx" ON "workshop_quiz_answers"("grading_status", "created_at" DESC);
CREATE UNIQUE INDEX "workshop_requirement_completions_requirement_id_teacher_id_key" ON "workshop_requirement_completions"("requirement_id", "teacher_id");
CREATE INDEX "workshop_requirement_completions_teacher_id_completed_at_idx" ON "workshop_requirement_completions"("teacher_id", "completed_at" DESC);
CREATE UNIQUE INDEX "workshop_completions_workshop_id_teacher_id_key" ON "workshop_completions"("workshop_id", "teacher_id");
CREATE INDEX "workshop_completions_workshop_id_completed_at_idx" ON "workshop_completions"("workshop_id", "completed_at" DESC);

ALTER TABLE "workshop_requirements" ADD CONSTRAINT "workshop_requirements_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workshop_requirements" ADD CONSTRAINT "workshop_requirements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workshop_quizzes" ADD CONSTRAINT "workshop_quizzes_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "workshop_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workshop_quiz_questions" ADD CONSTRAINT "workshop_quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "workshop_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workshop_quiz_question_options" ADD CONSTRAINT "workshop_quiz_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "workshop_quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workshop_quiz_attempts" ADD CONSTRAINT "workshop_quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "workshop_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workshop_quiz_attempts" ADD CONSTRAINT "workshop_quiz_attempts_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workshop_quiz_answers" ADD CONSTRAINT "workshop_quiz_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "workshop_quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workshop_quiz_answers" ADD CONSTRAINT "workshop_quiz_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "workshop_quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workshop_quiz_answers" ADD CONSTRAINT "workshop_quiz_answers_grader_id_fkey" FOREIGN KEY ("grader_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workshop_requirement_completions" ADD CONSTRAINT "workshop_requirement_completions_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "workshop_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workshop_requirement_completions" ADD CONSTRAINT "workshop_requirement_completions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workshop_completions" ADD CONSTRAINT "workshop_completions_workshop_id_fkey" FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workshop_completions" ADD CONSTRAINT "workshop_completions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
