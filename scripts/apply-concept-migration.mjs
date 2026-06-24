// One-shot: apply the concept-centric migration directly, then mark it
// applied in Prisma's _prisma_migrations table.
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const MIGRATION_NAME = "20260624000000_concept_centric_lessons_quizzes";
const sqlPath = `prisma/migrations/${MIGRATION_NAME}/migration.sql`;
const sql = readFileSync(sqlPath, "utf8");

const pool = new Pool({ connectionString: DATABASE_URL });

try {
  const client = await pool.connect();
  try {
    // Idempotent check — has this migration already been applied?
    const { rows } = await client.query(
      `SELECT 1 FROM _prisma_migrations WHERE migration_name = $1`,
      [MIGRATION_NAME],
    );
    if (rows.length > 0) {
      console.log(`✓ ${MIGRATION_NAME} already marked applied — skipping SQL.`);
    } else {
      console.log(`→ Applying ${MIGRATION_NAME} …`);
      await client.query("BEGIN");
      await client.query(sql);
      // Mark applied
      await client.query(
        `INSERT INTO _prisma_migrations
           (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
         VALUES (gen_random_uuid(), '', $1, now(), now(), 1)`,
        [MIGRATION_NAME],
      );
      await client.query("COMMIT");
      console.log("✓ Applied + recorded.");
    }
  } finally {
    client.release();
  }
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
