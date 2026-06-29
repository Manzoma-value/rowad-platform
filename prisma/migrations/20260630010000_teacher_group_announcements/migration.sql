-- Teacher Group Announcements - private feed inside teacher groups.

CREATE TABLE "teacher_group_announcements" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "group_id"   UUID NOT NULL,
  "school_id"  UUID NOT NULL,
  "author_id"  UUID NOT NULL,
  "content"    TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "teacher_group_announcements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "teacher_group_announcements_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "teacher_groups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "teacher_group_announcements_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "teacher_group_announcements_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "teacher_group_announcements_group_id_created_at_idx"
  ON "teacher_group_announcements" ("group_id", "created_at" DESC);

CREATE INDEX "teacher_group_announcements_author_id_idx"
  ON "teacher_group_announcements" ("author_id");
