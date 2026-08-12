-- Reusable beneficiary registration links owned by a supervisor's group.
CREATE TABLE "class_invites" (
  "id" UUID NOT NULL,
  "token" TEXT NOT NULL,
  "class_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "teacher_id" UUID NOT NULL,
  "created_by" UUID NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "use_count" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "class_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "class_invites_token_key" ON "class_invites"("token");
CREATE UNIQUE INDEX "class_invites_class_id_key" ON "class_invites"("class_id");
CREATE INDEX "class_invites_school_id_is_active_idx" ON "class_invites"("school_id", "is_active");
CREATE INDEX "class_invites_teacher_id_idx" ON "class_invites"("teacher_id");

ALTER TABLE "class_invites" ADD CONSTRAINT "class_invites_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_invites" ADD CONSTRAINT "class_invites_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_invites" ADD CONSTRAINT "class_invites_teacher_id_fkey"
  FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "class_invites" ADD CONSTRAINT "class_invites_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing active supervisors who do not yet lead a beneficiary group receive
-- one immediately. A stable suffix is used only when a name is already taken.
INSERT INTO "classes" ("id", "name", "created_at", "school_id", "teacher_id")
SELECT
  gen_random_uuid(),
  CASE
    WHEN EXISTS (
      SELECT 1 FROM "classes" c2
      WHERE c2."school_id" = t."school_id" AND c2."name" = p."full_name"
    ) THEN p."full_name" || ' — ' || UPPER(LEFT(t."id"::text, 6))
    ELSE p."full_name"
  END,
  CURRENT_TIMESTAMP,
  t."school_id",
  t."id"
FROM "teachers" t
JOIN "profiles" p ON p."id" = t."profile_id"
WHERE t."onboarding_status" = 'ACTIVE'
  AND NOT EXISTS (SELECT 1 FROM "classes" c WHERE c."teacher_id" = t."id")
ON CONFLICT ("school_id", "name") DO NOTHING;
