import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  isViewOnlyAccessExpired,
  isViewOnlySchoolAdminWrite,
  riyadhEndOfDay,
} from "../src/lib/view-only-access.ts";

const root = process.cwd();
const routeRoot = path.join(root, "src", "app", "api", "school-admin");
const writeMethod = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/g;

async function routeFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(fullPath);
    return entry.name === "route.ts" ? [fullPath] : [];
  }));
  return nested.flat();
}

function auditHandlerGuards(source, file) {
  const handlers = [...source.matchAll(writeMethod)];
  const failures = [];
  for (let index = 0; index < handlers.length; index += 1) {
    const match = handlers[index];
    const start = match.index ?? 0;
    const end = handlers[index + 1]?.index ?? source.length;
    const body = source.slice(start, end);
    if (!/\brequireSchoolAdminWriter\s*\(\s*\)/.test(body)) {
      failures.push(`${path.relative(root, file)}: ${match[1]} is missing requireSchoolAdminWriter()`);
    }
  }
  return failures;
}

const files = await routeFiles(routeRoot);
const guardFailures = [];
let writeHandlers = 0;
for (const file of files) {
  const source = await readFile(file, "utf8");
  writeHandlers += [...source.matchAll(writeMethod)].length;
  guardFailures.push(...auditHandlerGuards(source, file));
}

assert.equal(
  guardFailures.length,
  0,
  `School-admin write guard audit failed:\n${guardFailures.join("\n")}`,
);
assert.ok(writeHandlers > 0, "No school-admin write handlers were found");

const proxySource = await readFile(path.join(root, "src", "proxy.ts"), "utf8");
assert.match(proxySource, /isViewOnlySchoolAdminWrite\(apiProfile, request\.method\)/);
assert.match(proxySource, /isViewOnlyAccessExpired/);

const authSource = await readFile(path.join(root, "src", "lib", "school-admin-auth.ts"), "utf8");
assert.match(authSource, /if \(isViewOnlyAccessExpired\(profile\)\)/);
assert.match(authSource, /if \(auth\.profile\.is_view_only\)/);

const profilePageSource = await readFile(
  path.join(root, "src", "app", "school-admin", "profile", "page.tsx"),
  "utf8",
);
assert.match(profilePageSource, /const viewOnly = useViewOnly\(\)/);
assert.match(profilePageSource, /if \(!profile \|\| viewOnly\) return/);

const managementPageSource = await readFile(
  path.join(root, "src", "app", "school-admin", "view-only-admins", "page.tsx"),
  "utf8",
);
assert.match(managementPageSource, /await requireSchoolAdminWriter\(\)/);
assert.match(managementPageSource, /if \(!auth\) redirect\("\/school-admin"\)/);

const classesPageSource = await readFile(
  path.join(root, "src", "app", "school-admin", "classes", "page.tsx"),
  "utf8",
);
assert.match(classesPageSource, /const viewOnly = useViewOnly\(\)/);
assert.match(classesPageSource, /viewOnly \? \(/);

const migrationSource = await readFile(
  path.join(
    root,
    "prisma",
    "migrations",
    "20260728000000_view_only_admin_expiry",
    "migration.sql",
  ),
  "utf8",
);
assert.match(migrationSource, /ON storage\.objects AS RESTRICTIVE[\s\S]*FOR INSERT/);
assert.match(migrationSource, /ON storage\.objects AS RESTRICTIVE[\s\S]*FOR UPDATE/);
assert.match(migrationSource, /ON storage\.objects AS RESTRICTIVE[\s\S]*FOR DELETE/);

const now = new Date("2026-08-01T00:00:00.000Z");
assert.equal(
  isViewOnlyAccessExpired(
    { is_view_only: false, view_only_expires_at: "2020-01-01T00:00:00.000Z" },
    now,
  ),
  false,
);
for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
  assert.equal(
    isViewOnlySchoolAdminWrite(
      { role: "SCHOOL_ADMIN", is_view_only: true },
      method,
    ),
    true,
    `${method} must be blocked for a view-only school admin`,
  );
}
for (const method of ["GET", "HEAD", "OPTIONS"]) {
  assert.equal(
    isViewOnlySchoolAdminWrite(
      { role: "SCHOOL_ADMIN", is_view_only: true },
      method,
    ),
    false,
    `${method} must remain available for a view-only school admin`,
  );
}
assert.equal(
  isViewOnlySchoolAdminWrite({ role: "SCHOOL_ADMIN", is_view_only: false }, "PATCH"),
  false,
);
assert.equal(
  isViewOnlySchoolAdminWrite({ role: "TEACHER", is_view_only: true }, "PATCH"),
  false,
);
assert.equal(
  isViewOnlyAccessExpired({ is_view_only: true, view_only_expires_at: null }, now),
  false,
);
assert.equal(
  isViewOnlyAccessExpired(
    { is_view_only: true, view_only_expires_at: "2026-08-01T00:00:00.000Z" },
    now,
  ),
  true,
);
assert.equal(
  isViewOnlyAccessExpired(
    { is_view_only: true, view_only_expires_at: "2026-08-01T00:00:00.001Z" },
    now,
  ),
  false,
);
assert.equal(riyadhEndOfDay("2026-08-31")?.toISOString(), "2026-08-31T20:59:59.999Z");
assert.equal(riyadhEndOfDay("2026-02-30"), null);
assert.equal(riyadhEndOfDay("31-08-2026"), null);

console.log(
  `View-only access audit passed: ${writeHandlers} school-admin write handlers are writer-guarded; global API, direct storage, UI, and expiry rules verified.`,
);
