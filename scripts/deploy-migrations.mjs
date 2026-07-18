import { spawnSync } from "node:child_process";

// Database schema must be ahead of application code. Vercel preview builds
// intentionally skip this; only the production deployment applies pending
// migrations, before Prisma generates the client and Next builds the app.
if (process.env.VERCEL_ENV !== "production") {
  console.log("Skipping database migrations outside the Vercel production deployment.");
  process.exit(0);
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
