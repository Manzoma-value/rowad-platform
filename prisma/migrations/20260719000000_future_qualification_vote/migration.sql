CREATE TYPE "VoteFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

CREATE TABLE "future_qualification_votes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "teacher_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "coaching_frequency" "VoteFrequency" NOT NULL,
  "consultation_frequency" "VoteFrequency" NOT NULL,
  "evaluation_frequency" "VoteFrequency" NOT NULL,
  "field_support_frequency" "VoteFrequency" NOT NULL,
  "needs_group_leader" BOOLEAN NOT NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "future_qualification_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "future_qualification_votes_teacher_id_key"
  ON "future_qualification_votes"("teacher_id");
CREATE INDEX "future_qualification_votes_school_id_submitted_at_idx"
  ON "future_qualification_votes"("school_id", "submitted_at" DESC);

ALTER TABLE "future_qualification_votes"
  ADD CONSTRAINT "future_qualification_votes_teacher_id_fkey"
  FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "future_qualification_votes"
  ADD CONSTRAINT "future_qualification_votes_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "future_qualification_votes" ENABLE ROW LEVEL SECURITY;
