-- Owner reports — formal institutional reports the platform owner authors
-- and assigns to a single school. School admins of that school can view.
CREATE TYPE "OwnerReportStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "owner_reports" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id"    UUID NOT NULL,
  "created_by"   UUID NOT NULL,
  "title"        TEXT NOT NULL,
  "subtitle"     TEXT,
  "description"  TEXT,
  "report_date"  TIMESTAMP(3),
  "introduction" TEXT,
  "closing_note" TEXT,
  "status"       "OwnerReportStatus" NOT NULL DEFAULT 'DRAFT',
  "blocks"       JSONB NOT NULL DEFAULT '[]',
  "images"       JSONB NOT NULL DEFAULT '[]',
  "attachments"  JSONB NOT NULL DEFAULT '[]',
  "links"        JSONB NOT NULL DEFAULT '[]',
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL,
  "published_at" TIMESTAMP(3),
  CONSTRAINT "owner_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "owner_reports_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "owner_reports_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "owner_reports_school_id_status_published_at_idx"
  ON "owner_reports" ("school_id", "status", "published_at" DESC);
CREATE INDEX "owner_reports_status_updated_at_idx"
  ON "owner_reports" ("status", "updated_at" DESC);
