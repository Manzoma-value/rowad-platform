CREATE TYPE "TeacherGroupJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "teacher_group_join_requests" (
  "id" UUID NOT NULL,
  "group_id" UUID NOT NULL,
  "teacher_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "status" "TeacherGroupJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_by" UUID,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "teacher_group_join_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teacher_group_join_requests_teacher_id_key"
  ON "teacher_group_join_requests"("teacher_id");
CREATE INDEX "teacher_group_join_requests_group_id_status_requested_at_idx"
  ON "teacher_group_join_requests"("group_id", "status", "requested_at");
CREATE INDEX "teacher_group_join_requests_school_id_status_idx"
  ON "teacher_group_join_requests"("school_id", "status");

ALTER TABLE "teacher_group_join_requests" ADD CONSTRAINT "teacher_group_join_requests_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "teacher_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_group_join_requests" ADD CONSTRAINT "teacher_group_join_requests_teacher_id_fkey"
  FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_group_join_requests" ADD CONSTRAINT "teacher_group_join_requests_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_group_join_requests" ADD CONSTRAINT "teacher_group_join_requests_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
