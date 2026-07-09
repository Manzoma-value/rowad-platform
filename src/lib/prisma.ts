import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// ─────────────────────────────────────────────────────────────────────
// Serverless-hardened Prisma client.
//
// Why this file looks the way it does:
//   On Vercel, lambda instances are frozen between invocations. TCP
//   sockets held by the pg Pool die silently during the freeze; on thaw
//   the pool hands out dead sockets and the first query fails with
//   P1017 / "Connection terminated unexpectedly". Users saw this as
//   "the dashboard randomly doesn't load".
//
//   Three defenses:
//   1. pool.on("error") — without it, an errored *idle* client emits an
//      unhandled 'error' event and crashes the whole process.
//   2. Short idleTimeoutMillis — discard idle sockets before they can
//      go stale; new connections through the Supabase pooler are cheap.
//   3. A $extends retry wrapper — any query that dies on a
//      connection-level error is retried once on a fresh connection.
// ─────────────────────────────────────────────────────────────────────

function isConnectionError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: string })?.code ?? "";
  return (
    code === "P1017" ||            // server closed the connection
    code === "P1001" ||            // can't reach database server
    code === "P2024" ||            // connection pool timeout
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "ETIMEDOUT" ||
    /Connection terminated/i.test(msg) ||
    /Connection closed/i.test(msg) ||
    /server closed the connection/i.test(msg) ||
    /Client has encountered a connection error/i.test(msg) ||
    /Connection ended unexpectedly/i.test(msg) ||
    /connection timeout/i.test(msg)
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Missing DATABASE_URL");

  const pool = new Pool({
    connectionString,
    max: 5,
    // Discard idle sockets quickly — a stale socket that outlives a lambda
    // freeze is worse than paying for a new pooler connection.
    idleTimeoutMillis: 15_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    allowExitOnIdle: true,
  });

  // CRITICAL: an idle client error without a listener crashes the process.
  pool.on("error", (err) => {
    console.error("[pg pool] idle client error (recovered):", err.message);
  });

  const adapter = new PrismaPg(pool);
  const base = new PrismaClient({ adapter });

  // Retry every operation once on connection-level failures. Covers model
  // queries and raw queries alike. Interactive transactions that die
  // mid-flight still propagate (retrying half a transaction is unsafe),
  // but the first query of a fresh request — the common failure — heals.
  return base.$extends({
    query: {
      $allOperations: async ({ query, args }) => {
        try {
          return await query(args);
        } catch (e) {
          if (!isConnectionError(e)) throw e;
          console.warn("[prisma] connection error, retrying once:", (e as Error).message);
          await sleep(150);
          return query(args);
        }
      },
    },
  });
}

type ExtendedPrisma = ReturnType<typeof createClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: ExtendedPrisma;
};

export const prisma: ExtendedPrisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
