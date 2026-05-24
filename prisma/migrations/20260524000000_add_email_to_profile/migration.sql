-- AlterTable: add nullable email column to profiles
ALTER TABLE "profiles" ADD COLUMN "email" TEXT;

-- CreateIndex: enforce uniqueness (NULL values are excluded from unique constraints in Postgres)
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");
