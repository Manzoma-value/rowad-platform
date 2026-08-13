-- Hot-path indexes for the Hub feed, reply threads, roadmap attempts, and
-- teacher reports. CONCURRENTLY avoids blocking writes on production tables.
-- PostgreSQL requires each statement to run outside a transaction; Prisma's
-- PostgreSQL migration runner does not wrap migration files automatically.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "posts_school_id_reply_to_id_created_at_idx"
  ON "posts" ("school_id", "reply_to_id", "created_at" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "posts_reply_to_id_created_at_idx"
  ON "posts" ("reply_to_id", "created_at");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "posts_author_id_idx"
  ON "posts" ("author_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "module_attempts_student_id_idx"
  ON "module_attempts" ("student_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "module_answers_attempt_id_idx"
  ON "module_answers" ("attempt_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "trait_assessments_teacher_id_student_id_idx"
  ON "trait_assessments" ("teacher_id", "student_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "trait_assessments_student_id_submitted_at_idx"
  ON "trait_assessments" ("student_id", "submitted_at");
