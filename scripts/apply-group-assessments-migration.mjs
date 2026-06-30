import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const NAME = "20260701000000_group_assessments";
const sql = readFileSync(`prisma/migrations/${NAME}/migration.sql`, "utf8");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();
try {
  const { rows } = await c.query(
    "SELECT 1 FROM _prisma_migrations WHERE migration_name=$1",
    [NAME],
  );
  if (rows.length) {
    console.log("already applied");
  } else {
    await c.query("BEGIN");
    await c.query(sql);
    await c.query(
      `INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
       VALUES (gen_random_uuid(), '', $1, now(), now(), 1)`,
      [NAME],
    );
    await c.query("COMMIT");
    console.log("applied");
  }
} catch (e) {
  await c.query("ROLLBACK");
  console.error("FAIL", e.message);
  process.exit(1);
} finally {
  c.release();
  pool.end();
}
