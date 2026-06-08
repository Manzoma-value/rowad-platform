-- CreateTable: school_admins join table
CREATE TABLE "school_admins" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "school_id"  UUID         NOT NULL,
    "profile_id" UUID         NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_admins_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex
CREATE UNIQUE INDEX "school_admins_school_id_profile_id_key" ON "school_admins"("school_id", "profile_id");

-- AddForeignKey
ALTER TABLE "school_admins" ADD CONSTRAINT "school_admins_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "school_admins" ADD CONSTRAINT "school_admins_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: promote every school's current admin_id into a membership row
INSERT INTO "school_admins" ("school_id", "profile_id")
SELECT "id", "admin_id"
FROM   "schools"
WHERE  "admin_id" IS NOT NULL;

-- DropColumn: admin_id is no longer on schools
ALTER TABLE "schools" DROP COLUMN "admin_id";
