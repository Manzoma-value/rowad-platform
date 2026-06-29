-- Teacher Groups — private communities of accepted teachers, organized by
-- the school admin. m:n via teacher_group_members.

CREATE TABLE "teacher_groups" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id"   UUID NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "created_by"  UUID NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "teacher_groups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "teacher_groups_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "teacher_groups_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "teacher_groups_school_id_updated_at_idx"
  ON "teacher_groups" ("school_id", "updated_at" DESC);

CREATE TABLE "teacher_group_members" (
  "group_id"   UUID NOT NULL,
  "teacher_id" UUID NOT NULL,
  "joined_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "teacher_group_members_pkey" PRIMARY KEY ("group_id", "teacher_id"),
  CONSTRAINT "teacher_group_members_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "teacher_groups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "teacher_group_members_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "teacher_group_members_teacher_id_idx"
  ON "teacher_group_members" ("teacher_id");
