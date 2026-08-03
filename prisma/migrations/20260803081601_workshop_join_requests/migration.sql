-- Workshop join-request / approval workflow.
-- Hand-written to include ONLY this feature's changes — `prisma migrate diff`
-- against the live database also surfaced a large amount of pre-existing,
-- unrelated schema drift (dropped indexes/FKs, id-default changes on
-- unrelated tables) that predates this change and is intentionally left
-- untouched here.

-- CreateEnum
CREATE TYPE "WorkshopEnrollmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'WORKSHOP_NEW';
ALTER TYPE "NotificationType" ADD VALUE 'WORKSHOP_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'WORKSHOP_REQUEST_DECISION';

-- AlterEnum
ALTER TYPE "WorkshopEnrollmentSource" ADD VALUE 'REQUEST';

-- AlterTable
ALTER TABLE "workshop_enrollments"
  ADD COLUMN "status" "WorkshopEnrollmentStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "decided_by" UUID,
  ADD COLUMN "decided_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "workshop_enrollments"
  ADD CONSTRAINT "workshop_enrollments_decided_by_fkey"
  FOREIGN KEY ("decided_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
