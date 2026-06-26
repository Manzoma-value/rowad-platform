-- Read-only demo accounts (e.g. investor demo on the admin role)
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "is_view_only" BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── Rowad card-game score tracking (re-introduced as game-only, no
--     gating). One row per game session. Stage = STAGE1 (concept-only) or
--     STAGE2 (detailed-card variant).
CREATE TABLE IF NOT EXISTS "rowad_game_submissions" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id"  UUID NOT NULL,
  "profile_id" UUID NOT NULL,
  "stage"      "RowadStage" NOT NULL,
  "score"      INTEGER NOT NULL,
  "total"      INTEGER NOT NULL DEFAULT 25,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rowad_game_submissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rowad_game_submissions_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "rowad_game_submissions_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "rowad_game_submissions_school_id_created_at_idx"
  ON "rowad_game_submissions" ("school_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "rowad_game_submissions_profile_id_stage_score_idx"
  ON "rowad_game_submissions" ("profile_id", "stage", "score" DESC);
