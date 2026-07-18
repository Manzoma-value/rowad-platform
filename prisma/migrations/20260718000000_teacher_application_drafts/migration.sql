-- Preserve unfinished teacher applications for school-admin progress review.
ALTER TABLE "teachers"
  ADD COLUMN "application_draft" JSONB,
  ADD COLUMN "application_draft_updated_at" TIMESTAMP(3);
