import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.PRISMA_DATABASE_URL ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: databaseUrl,
  },

  migrations: {
    seed: "npx ts-node prisma/seed.ts",
  },
});