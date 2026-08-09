-- First-stage peer spectrum v3: eight canonical traits, source metadata,
-- and immutable rating revisions after the 24-hour working window.

CREATE TYPE "AssessmentTraitKind" AS ENUM ('TARGET', 'EARLY_OBSERVATION');

ALTER TABLE "assessment_traits"
  ADD COLUMN "kind" "AssessmentTraitKind" NOT NULL DEFAULT 'TARGET',
  ADD COLUMN "objective_ar" TEXT,
  ADD COLUMN "objective_sq" TEXT;

-- The original table constrained the five legacy columns to total 100.
-- Scores are now an N-trait JSON array, so move the invariant to that
-- canonical field while keeping the legacy columns for rollback safety.
ALTER TABLE "assessment_ratings"
  DROP CONSTRAINT IF EXISTS "assessment_ratings_sum_100_chk";

CREATE FUNCTION "assessment_scores_valid_100"(input JSONB)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
STRICT
AS $$
  SELECT jsonb_typeof(input) = 'array'
    AND jsonb_array_length(input) > 0
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(input) AS value
      WHERE jsonb_typeof(value) <> 'number'
         OR (value::text)::numeric <> trunc((value::text)::numeric)
         OR (value::text)::numeric < 0
         OR (value::text)::numeric > 100
    )
    AND (
      SELECT COALESCE(SUM((value::text)::integer), 0)
      FROM jsonb_array_elements(input) AS value
    ) = 100;
$$;

ALTER TABLE "assessment_ratings"
  ADD CONSTRAINT "assessment_ratings_scores_100_chk"
  CHECK ("assessment_scores_valid_100"("scores"));

CREATE TABLE "assessment_rating_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assessment_id" UUID NOT NULL,
  "rater_teacher_id" UUID NOT NULL,
  "target_teacher_id" UUID NOT NULL,
  "scores" JSONB NOT NULL,
  "replacement_scores" JSONB NOT NULL,
  "original_updated_at" TIMESTAMP(3) NOT NULL,
  "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assessment_rating_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assessment_rating_revisions_rating_fkey"
    FOREIGN KEY ("assessment_id", "rater_teacher_id", "target_teacher_id")
    REFERENCES "assessment_ratings"("assessment_id", "rater_teacher_id", "target_teacher_id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "assessment_rating_revisions_rating_original_key"
  ON "assessment_rating_revisions"("assessment_id", "rater_teacher_id", "target_teacher_id", "original_updated_at");
CREATE INDEX "assessment_rating_revisions_assessment_archived_idx"
  ON "assessment_rating_revisions"("assessment_id", "archived_at" DESC);
CREATE INDEX "assessment_rating_revisions_people_archived_idx"
  ON "assessment_rating_revisions"("rater_teacher_id", "target_teacher_id", "archived_at" DESC);
ALTER TABLE "assessment_rating_revisions" ENABLE ROW LEVEL SECURITY;

-- Only migrate models that are recognizably the canonical five-trait Rowad
-- template. Fully custom admin-authored models remain untouched.
CREATE TEMP TABLE "_canonical_first_stage_assessments" ON COMMIT DROP AS
SELECT "assessment_id"
FROM "assessment_traits"
GROUP BY "assessment_id"
HAVING COUNT(*) = 5
   AND BOOL_AND("label_ar" IN ('الدراية', 'الحمية', 'المميز', 'التمييز', 'الفرد', 'النسل', 'الكفارات'));

-- Re-align existing readings from the prior semantic order
-- [الفرد، الكفارات، المميز، الحمية، الدراية] to the source-document order
-- [الدراية، الحمية، المميز، الفرد، الكفارات، الصمود، الأخوة، الرشيد].
-- The three newly introduced observation traits start at zero, preserving
-- every historical 100-point total without inventing ratings.
UPDATE "assessment_ratings" AS r
SET "scores" = jsonb_build_array(
  r."scores"->4,
  r."scores"->3,
  r."scores"->2,
  r."scores"->0,
  r."scores"->1,
  to_jsonb(0),
  to_jsonb(0),
  to_jsonb(0)
)
WHERE r."assessment_id" IN (SELECT "assessment_id" FROM "_canonical_first_stage_assessments")
  AND jsonb_array_length(r."scores") = 5;

DELETE FROM "assessment_traits"
WHERE "assessment_id" IN (SELECT "assessment_id" FROM "_canonical_first_stage_assessments");

INSERT INTO "assessment_traits"
  ("id", "assessment_id", "position", "label_ar", "label_sq", "statement_ar", "statement_sq", "color", "kind", "objective_ar", "objective_sq", "created_at")
SELECT gen_random_uuid(), a."assessment_id", t.position, t.label_ar, t.label_sq,
       t.statement_ar, t.statement_sq, t.color, t.kind::"AssessmentTraitKind",
       t.objective_ar, t.objective_sq, CURRENT_TIMESTAMP
FROM "_canonical_first_stage_assessments" a
CROSS JOIN (VALUES
  (0, 'الدراية', 'Dituria',
   'أستخدم حدسي للوعي بالأشياء، وأراجع قواعد الذكاء بما يوافق الفطرة.',
   'Përdor intuitën time për të kuptuar gjërat dhe i rishikoj rregullat e mendjes në përputhje me natyrshmërinë e krijimit (fitren).',
   '#1A1A1A', 'TARGET', 'حفظ الدين', 'Ruajtja e fesë'),
  (1, 'الحمية', 'Vendosmëria',
   'تأبى نفسي الضيم عند الاعتداء على عرضي أو مالي أو وطني أو سمعتي أو حقوقي.',
   'Vetja ime nuk e pranon padrejtësinë kur cenohet nderi im, pasuria ime, atdheu im, reputacioni im ose të drejtat e mia.',
   '#B33A3A', 'TARGET', 'حفظ النفس', 'Ruajtja e jetës'),
  (2, 'المميز', 'Dallueshmëria',
   'لدي عقلية تميز بين الأشياء في ظل تصوري كرائد.',
   'Kam një mendësi që dallon mes gjërave, në dritën e konceptimit tim si pionier (raid).',
   '#9AA3AC', 'TARGET', 'حفظ العقل', 'Ruajtja e mendjes'),
  (3, 'الفرد', 'Individi',
   'أعتبر نفسي فردًا يحمل واجبًا، يلتزم به بوصفه أمانة الاستخلاف، ويؤديه بولاء لوطني وأمتي.',
   'E konsideroj veten një individ që mbart një detyrë, e cila i përmbahet asaj si amanet i mëkëmbësisë (istihlaf) dhe e kryen me besnikëri ndaj atdheut dhe ummetit tim.',
   '#F2EFE6', 'TARGET', 'حفظ النسل', 'Ruajtja e pasardhësve'),
  (4, 'الكفارات', 'Shlyerjet',
   'أربط التقصير في واجبي بما شرعه الله من تكفيرٍ وجبرٍ للتقصير.',
   'Mangësinë në detyrën time e lidh me atë që Allahu ka caktuar si shlyerje dhe si kompensim për mangësinë.',
   '#F2B705', 'TARGET', 'حفظ المال', 'Ruajtja e pasurisë'),
  (5, 'الصمود', 'Qëndresa',
   'قد تهزّني الحوادث ولكن لا تمحوني؛ بل أنهض وأواصل طريقي.',
   'Ngjarjet mund të më tronditin, por nuk më shuajnë; përkundrazi, ngrihem dhe vazhdoj rrugën time.',
   '#2F6B5F', 'EARLY_OBSERVATION', 'حفظ النفس', 'Ruajtja e jetës'),
  (6, 'الأخوة الإيمانية', 'Vëllazëria e besimit',
   'أبادر إلى مؤازرة إخوتي في الإيمان والتعاون معهم بما أستطيع، ولا أترك المحتاج منهم للعزلة.',
   'Marr nismën për t’i përkrahur vëllezërit e mi në besim dhe për të bashkëpunuar me ta sipas mundësive të mia, dhe nuk e lë në izolim atë prej tyre që ka nevojë.',
   '#315C9B', 'EARLY_OBSERVATION', 'حفظ النسل', 'Ruajtja e pasardhësve'),
  (7, 'الرشيد', 'Pjekuria e gjykimit',
   'أُصيب في دورتي الريادية الصوابَ الكامل اليقيني الذي لا شك فيه.',
   'Në ciklin tim udhëheqës e godas të drejtën e plotë dhe të sigurt, në të cilën nuk ka dyshim.',
   '#70528F', 'EARLY_OBSERVATION', 'حفظ العقل', 'Ruajtja e mendjes')
) AS t(position, label_ar, label_sq, statement_ar, statement_sq, color, kind, objective_ar, objective_sq);
