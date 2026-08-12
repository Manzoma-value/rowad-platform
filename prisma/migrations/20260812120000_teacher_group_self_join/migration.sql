ALTER TABLE "teacher_groups"
  ADD COLUMN "max_members" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "leader_teacher_id" UUID;

ALTER TABLE "teacher_groups"
  ADD CONSTRAINT "teacher_groups_leader_teacher_id_fkey"
  FOREIGN KEY ("leader_teacher_id") REFERENCES "teachers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "teacher_groups_leader_teacher_id_idx"
  ON "teacher_groups"("leader_teacher_id");

ALTER TABLE "teacher_groups"
  ADD CONSTRAINT "teacher_groups_max_members_check"
  CHECK ("max_members" >= 1 AND "max_members" <= 500);
