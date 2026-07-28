-- In-progress card-game board (per profile, per stage). Lets a player resume
-- a partially-filled board after navigating away, and gives admins
-- visibility into who's mid-attempt. Deleted once that stage is submitted.

CREATE TABLE "rowad_game_drafts" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "profile_id" UUID NOT NULL,
  "stage" "RowadStage" NOT NULL,
  "placements" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rowad_game_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rowad_game_drafts_profile_id_stage_key" ON "rowad_game_drafts"("profile_id", "stage");
CREATE INDEX "rowad_game_drafts_school_id_updated_at_idx" ON "rowad_game_drafts"("school_id", "updated_at" DESC);

ALTER TABLE "rowad_game_drafts"
  ADD CONSTRAINT "rowad_game_drafts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "rowad_game_drafts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
