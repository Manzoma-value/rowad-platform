ALTER TABLE "workshops"
  ADD COLUMN "attendance_token" TEXT;

CREATE UNIQUE INDEX "workshops_attendance_token_key"
  ON "workshops"("attendance_token");
