-- Authentication and dashboard lookups run on nearly every signed-in page.
-- These indexes remove sequential scans from the school membership and
-- assessment summary paths without blocking writes during deployment.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "school_admins_profile_id_idx"
  ON "school_admins" ("profile_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "assessments_type_is_active_idx"
  ON "assessments" ("type", "is_active");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "assessments_school_id_type_idx"
  ON "assessments" ("school_id", "type");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "assessment_questions_assessment_id_order_idx"
  ON "assessment_questions" ("assessment_id", "order");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "assessment_options_question_id_order_idx"
  ON "assessment_options" ("question_id", "order");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "assessment_attempts_assessment_id_review_status_idx"
  ON "assessment_attempts" ("assessment_id", "review_status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "assessment_attempts_student_id_submitted_at_idx"
  ON "assessment_attempts" ("student_id", "submitted_at" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "assessment_answers_attempt_id_idx"
  ON "assessment_answers" ("attempt_id");
