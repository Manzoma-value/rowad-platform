ALTER TABLE "workshops"
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "school_id"
      ORDER BY "start_date" ASC NULLS LAST, "created_at" ASC
    ) - 1 AS "position"
  FROM "workshops"
)
UPDATE "workshops" AS workshop
SET "sort_order" = ranked."position"
FROM ranked
WHERE workshop."id" = ranked."id";

CREATE INDEX "workshops_school_id_sort_order_idx"
ON "workshops" ("school_id", "sort_order");
