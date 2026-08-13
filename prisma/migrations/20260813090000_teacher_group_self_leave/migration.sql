CREATE TABLE "teacher_group_leave_events" (
  "id" UUID NOT NULL,
  "group_id" UUID NOT NULL,
  "teacher_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "left_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "teacher_group_leave_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "teacher_group_leave_events_group_id_left_at_idx"
  ON "teacher_group_leave_events"("group_id", "left_at" DESC);
CREATE INDEX "teacher_group_leave_events_teacher_id_left_at_idx"
  ON "teacher_group_leave_events"("teacher_id", "left_at" DESC);
CREATE INDEX "teacher_group_leave_events_school_id_left_at_idx"
  ON "teacher_group_leave_events"("school_id", "left_at" DESC);

ALTER TABLE "teacher_group_leave_events" ADD CONSTRAINT "teacher_group_leave_events_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "teacher_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_group_leave_events" ADD CONSTRAINT "teacher_group_leave_events_teacher_id_fkey"
  FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teacher_group_leave_events" ADD CONSTRAINT "teacher_group_leave_events_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "teacher_group_leave_events" ADD CONSTRAINT "teacher_group_leave_events_reason_length_check"
  CHECK (char_length(btrim("reason")) BETWEEN 10 AND 1000);
