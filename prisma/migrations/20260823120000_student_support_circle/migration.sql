CREATE TYPE "StudentSupportRole" AS ENUM ('GUARDIAN', 'RELIGIOUS_REFERENCE', 'SPONSOR');

CREATE TABLE "student_support_contacts" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "role" "StudentSupportRole" NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "relationship" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_support_contacts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_support_contacts_student_id_role_key"
ON "student_support_contacts"("student_id", "role");

CREATE INDEX "student_support_contacts_student_id_idx"
ON "student_support_contacts"("student_id");

ALTER TABLE "student_support_contacts"
ADD CONSTRAINT "student_support_contacts_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
