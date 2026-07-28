-- Usage log for the five practice mini-games (Memory Match, Maqsad Hunter,
-- Speed Drill, Maqsad Collector, Word Rain). These games have no server-side
-- answer key — this table exists purely so admins can see who played, how
-- often, and which game is most popular. Mirrors rowad_game_submissions.

CREATE TYPE "MiniGameKind" AS ENUM ('MEMORY', 'HUNTER', 'SPEED', 'COLLECTOR', 'WORDRAIN');

CREATE TABLE "mini_game_submissions" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "profile_id" UUID NOT NULL,
  "game" "MiniGameKind" NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "won" BOOLEAN NOT NULL DEFAULT false,
  "meta" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mini_game_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mini_game_submissions_school_id_created_at_idx" ON "mini_game_submissions"("school_id", "created_at" DESC);
CREATE INDEX "mini_game_submissions_profile_id_game_created_at_idx" ON "mini_game_submissions"("profile_id", "game", "created_at" DESC);
CREATE INDEX "mini_game_submissions_game_created_at_idx" ON "mini_game_submissions"("game", "created_at" DESC);

ALTER TABLE "mini_game_submissions"
  ADD CONSTRAINT "mini_game_submissions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "mini_game_submissions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
