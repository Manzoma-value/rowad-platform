CREATE TYPE "WorkshopVideoSource" AS ENUM ('SUPABASE', 'GOOGLE_DRIVE');

ALTER TABLE "workshop_videos"
  ALTER COLUMN "storage_path" DROP NOT NULL,
  ADD COLUMN "source_type" "WorkshopVideoSource" NOT NULL DEFAULT 'SUPABASE',
  ADD COLUMN "drive_file_id" TEXT;

CREATE INDEX "workshop_videos_drive_file_id_idx" ON "workshop_videos"("drive_file_id");
