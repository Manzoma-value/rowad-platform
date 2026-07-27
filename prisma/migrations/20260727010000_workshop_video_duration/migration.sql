-- Purely additive: record the video's playback length (measured client-side at
-- upload time) so question timestamps can be validated against it. Existing
-- rows stay NULL, which the app treats as "unknown duration".
ALTER TABLE "workshop_videos" ADD COLUMN "duration_seconds" INTEGER;
