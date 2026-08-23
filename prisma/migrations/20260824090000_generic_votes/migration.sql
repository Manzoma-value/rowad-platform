-- Replace the single hardcoded "future qualification vote" survey with a
-- generic, admin-authored polls system (create / open / close any number
-- of votes, each with its own questions).

CREATE TYPE "VoteStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "VoteStatus" NOT NULL DEFAULT 'OPEN',
    "allow_notes" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vote_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vote_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,

    CONSTRAINT "vote_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vote_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vote_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "answers" JSONB NOT NULL,
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vote_responses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "votes_school_id_status_idx" ON "votes"("school_id", "status");
CREATE INDEX "vote_questions_vote_id_position_idx" ON "vote_questions"("vote_id", "position");
CREATE UNIQUE INDEX "vote_responses_vote_id_teacher_id_key" ON "vote_responses"("vote_id", "teacher_id");
CREATE INDEX "vote_responses_vote_id_idx" ON "vote_responses"("vote_id");

ALTER TABLE "votes"
  ADD CONSTRAINT "votes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vote_questions"
  ADD CONSTRAINT "vote_questions_vote_id_fkey" FOREIGN KEY ("vote_id") REFERENCES "votes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vote_responses"
  ADD CONSTRAINT "vote_responses_vote_id_fkey" FOREIGN KEY ("vote_id") REFERENCES "votes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vote_responses"
  ADD CONSTRAINT "vote_responses_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "votes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vote_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vote_responses" ENABLE ROW LEVEL SECURITY;

-- ── Data migration: fold the old fixed 5-question survey into the new
--    shape, one legacy vote per school that actually collected responses,
--    so no historical answers are lost. The vote is created CLOSED (it was
--    a one-time onboarding survey) — the admin can reopen it if desired.
INSERT INTO "votes" ("id", "school_id", "title", "description", "status", "allow_notes", "created_at", "closed_at")
SELECT gen_random_uuid(), fqv."school_id",
       'Votimi për proceset e ardhshme të zhvillimit profesional',
       'Sondazhi fillestar rreth shpeshtësisë së mbështetjes dhe zhvillimit profesional — migruar automatikisht nga sistemi i mëparshëm.',
       'CLOSED', true, MIN(fqv."submitted_at"), now()
FROM "future_qualification_votes" fqv
GROUP BY fqv."school_id";

INSERT INTO "vote_questions" ("id", "vote_id", "position", "prompt", "options")
SELECT gen_random_uuid(), v.id, q.position, q.prompt, q.options::jsonb
FROM "votes" v
CROSS JOIN (
  VALUES
    (0, 'Cila është shpeshtësia më e përshtatshme për ty për një seancë individuale coaching?',
        '[{"value":"WEEKLY","label":"Një herë në javë"},{"value":"BIWEEKLY","label":"Një herë çdo dy javë"}]'),
    (1, 'Cila është shpeshtësia më e përshtatshme për zhvillimin e kësaj seance konsultimi?',
        '[{"value":"BIWEEKLY","label":"Një herë çdo dy javë"},{"value":"MONTHLY","label":"Një herë në muaj"}]'),
    (2, 'Cila është shpeshtësia më e përshtatshme për zhvillimin e seancës së vlerësimit?',
        '[{"value":"WEEKLY","label":"Çdo javë"},{"value":"BIWEEKLY","label":"Një herë çdo dy javë"},{"value":"MONTHLY","label":"Një herë në muaj"}]'),
    (3, 'Cila shpeshtësi do të ishte e përshtatshme për ty për këtë lloj mbështetjeje?',
        '[{"value":"WEEKLY","label":"Çdo javë"},{"value":"BIWEEKLY","label":"Një herë çdo dy javë"},{"value":"MONTHLY","label":"Një herë në muaj"}]'),
    (4, 'A mendon se grupi yt aktual ka nevojë për një drejtues të caktuar për një periudhë të përcaktuar?',
        '[{"value":"true","label":"Po, kemi nevojë për një drejtues"},{"value":"false","label":"Jo, jo për momentin"}]')
) AS q(position, prompt, options);

INSERT INTO "vote_responses" ("id", "vote_id", "teacher_id", "answers", "notes", "submitted_at")
SELECT
  gen_random_uuid(),
  v.id,
  fqv."teacher_id",
  jsonb_build_array(
    jsonb_build_object('question_id', q0.id, 'value', fqv."coaching_frequency"::text),
    jsonb_build_object('question_id', q1.id, 'value', fqv."consultation_frequency"::text),
    jsonb_build_object('question_id', q2.id, 'value', fqv."evaluation_frequency"::text),
    jsonb_build_object('question_id', q3.id, 'value', fqv."field_support_frequency"::text),
    jsonb_build_object('question_id', q4.id, 'value', fqv."needs_group_leader"::text)
  ),
  fqv."notes",
  fqv."submitted_at"
FROM "future_qualification_votes" fqv
JOIN "votes" v ON v."school_id" = fqv."school_id"
JOIN "vote_questions" q0 ON q0."vote_id" = v.id AND q0."position" = 0
JOIN "vote_questions" q1 ON q1."vote_id" = v.id AND q1."position" = 1
JOIN "vote_questions" q2 ON q2."vote_id" = v.id AND q2."position" = 2
JOIN "vote_questions" q3 ON q3."vote_id" = v.id AND q3."position" = 3
JOIN "vote_questions" q4 ON q4."vote_id" = v.id AND q4."position" = 4;

DROP TABLE "future_qualification_votes";
DROP TYPE "VoteFrequency";
