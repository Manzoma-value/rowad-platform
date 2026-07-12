-- Measurement models become fully admin-authored per assessment: each
-- GroupAssessment now owns its own ordered set of traits (AssessmentTrait)
-- instead of the platform-wide fixed five, and can target more than one
-- teacher group (GroupAssessmentGroup). Purely additive — no column is
-- dropped, no existing row is destructively altered.

-- CreateTable: which group(s) feed members into an assessment
CREATE TABLE "group_assessment_groups" (
    "assessment_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,

    CONSTRAINT "group_assessment_groups_pkey" PRIMARY KEY ("assessment_id","group_id")
);

CREATE INDEX "group_assessment_groups_group_id_idx" ON "group_assessment_groups"("group_id");

ALTER TABLE "group_assessment_groups"
  ADD CONSTRAINT "group_assessment_groups_assessment_id_fkey"
  FOREIGN KEY ("assessment_id") REFERENCES "group_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "group_assessment_groups"
  ADD CONSTRAINT "group_assessment_groups_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "teacher_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: the ordered traits an admin defines for one specific model
CREATE TABLE "assessment_traits" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "label_ar" TEXT NOT NULL,
    "label_sq" TEXT NOT NULL,
    "statement_ar" TEXT NOT NULL,
    "statement_sq" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B1E2D',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_traits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assessment_traits_assessment_id_position_key" ON "assessment_traits"("assessment_id","position");
CREATE INDEX "assessment_traits_assessment_id_idx" ON "assessment_traits"("assessment_id");

ALTER TABLE "assessment_traits"
  ADD CONSTRAINT "assessment_traits_assessment_id_fkey"
  FOREIGN KEY ("assessment_id") REFERENCES "group_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add the new ordered-scores column (nullable until backfilled below)
ALTER TABLE "assessment_ratings" ADD COLUMN "scores" JSONB;

-- Backfill 1/3 — every existing assessment keeps working with its original
-- (single) group as a target group, so member sourcing is uniform for old
-- and new rows alike.
INSERT INTO "group_assessment_groups" ("assessment_id", "group_id")
SELECT "id", "group_id" FROM "group_assessments"
ON CONFLICT DO NOTHING;

-- Backfill 2/3 — every existing assessment gets its own copy of the five
-- canonical Rowad traits it was always implicitly scored against, so it
-- renders and behaves identically to before this migration.
INSERT INTO "assessment_traits"
  ("id", "assessment_id", "position", "label_ar", "label_sq", "statement_ar", "statement_sq", "color", "created_at")
SELECT gen_random_uuid(), ga."id", t.position, t.label_ar, t.label_sq, t.statement_ar, t.statement_sq, t.color, now()
FROM "group_assessments" ga
CROSS JOIN (VALUES
  (0, 'النسل', 'Pasardhësia',
     'أعتبر نفسي فردًا يحمل واجبًا، يلتزم به بوصفه أمانة الاستخلاف، ويؤديه تجاه النسل والأمة.',
     'E konsideroj veten si person që mban një detyrim, i përkushtohet atij si një amanet trashëgimie, dhe e përmbush ndaj pasardhësisë dhe umetit.',
     '#6B1E2D'),
  (1, 'الكفارات', 'Shlyerja',
     'أربط التقصير في واجبي بما شرعه الله من تكفير وجبر للتقصير.',
     'E lidh mangësinë në detyrën time me atë që Allahu e ka përcaktuar si shlyerje dhe ndreqje për mangësinë.',
     '#B8A082'),
  (2, 'الدراية', 'Vetëdija',
     'لدي عقلية تميز بين الأشياء في ظل تصوري كرائد.',
     'Kam një mendje që dallon gjërat nën konceptin tim si pionier (rowad).',
     '#8F765B'),
  (3, 'الحمية', 'Zelli',
     'تأبى نفسي الضيم عند الاعتداء على عرضي أو مالي أو نسلي أو سمعتي أو حقوقي.',
     'Shpirti im refuzon padrejtësinë kur cenohet nderi, pasuria, pasardhësia, reputacioni ose të drejtat e mia.',
     '#4A0E1C'),
  (4, 'التمييز', 'Dallimi',
     'أستخدم حدسي للوعي بالأشياء، وأراجع قواعد الذكاء بما يوافق الفطرة.',
     'E përdor intuitën time për vetëdijësim ndaj gjërave, dhe i rishikoj rregullat e intelektit në përputhje me natyrën njerëzore (fitra).',
     '#A55A68')
) AS t(position, label_ar, label_sq, statement_ar, statement_sq, color)
ON CONFLICT ("assessment_id", "position") DO NOTHING;

-- Backfill 3/3 — mirror the legacy five columns into the new ordered array
-- for every existing rating row, in the same canonical order used above.
UPDATE "assessment_ratings"
SET "scores" = jsonb_build_array("s_lineage", "s_atonement", "s_awareness", "s_zeal", "s_distinct")
WHERE "scores" IS NULL;

-- Every row is now populated — safe to require it for anything written from here on.
ALTER TABLE "assessment_ratings" ALTER COLUMN "scores" SET NOT NULL;
