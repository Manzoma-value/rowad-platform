import { Pool } from "pg";
import { config } from "dotenv";
config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.connect();
try {
  // Every base table in the public schema, with its RLS flag.
  const { rows } = await c.query(`
    SELECT c.relname AS table_name,
           c.relrowsecurity AS rls_enabled,
           c.relforcerowsecurity AS rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY c.relrowsecurity ASC, c.relname ASC
  `);
  const off = rows.filter((r) => !r.rls_enabled);
  const on = rows.filter((r) => r.rls_enabled);
  console.log(`\nRLS DISABLED (${off.length}):`);
  for (const r of off) console.log("  ✗", r.table_name);
  console.log(`\nRLS ENABLED (${on.length}):`);
  for (const r of on) console.log("  ✓", r.table_name);

  // Also check current role's superuser/bypassrls status — proves whether
  // Prisma's connection bypasses RLS.
  const { rows: who } = await c.query(`
    SELECT current_user,
           rolsuper, rolbypassrls
    FROM pg_roles WHERE rolname = current_user
  `);
  console.log("\nPrisma connection role:", JSON.stringify(who[0]));
} finally {
  c.release();
  pool.end();
}
