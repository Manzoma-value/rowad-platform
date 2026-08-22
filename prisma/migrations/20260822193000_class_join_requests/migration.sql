CREATE TYPE "ClassJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "class_join_requests" (
    "id" UUID NOT NULL,
    "invite_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "ClassJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_join_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "class_join_requests_student_id_key" ON "class_join_requests"("student_id");
CREATE INDEX "class_join_requests_teacher_id_class_id_status_created_at_idx"
  ON "class_join_requests"("teacher_id", "class_id", "status", "created_at" DESC);
CREATE INDEX "class_join_requests_school_id_status_idx"
  ON "class_join_requests"("school_id", "status");

ALTER TABLE "class_join_requests"
  ADD CONSTRAINT "class_join_requests_invite_id_fkey"
  FOREIGN KEY ("invite_id") REFERENCES "class_invites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_join_requests"
  ADD CONSTRAINT "class_join_requests_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_join_requests"
  ADD CONSTRAINT "class_join_requests_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_join_requests"
  ADD CONSTRAINT "class_join_requests_teacher_id_fkey"
  FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_join_requests"
  ADD CONSTRAINT "class_join_requests_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
