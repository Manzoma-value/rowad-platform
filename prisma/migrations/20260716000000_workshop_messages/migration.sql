CREATE TABLE "workshop_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workshop_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshop_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workshop_messages_workshop_id_created_at_idx"
ON "workshop_messages"("workshop_id", "created_at");

ALTER TABLE "workshop_messages"
ADD CONSTRAINT "workshop_messages_workshop_id_fkey"
FOREIGN KEY ("workshop_id") REFERENCES "workshops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workshop_messages"
ADD CONSTRAINT "workshop_messages_author_id_fkey"
FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workshop_messages" ENABLE ROW LEVEL SECURITY;
