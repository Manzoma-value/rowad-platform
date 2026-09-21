import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  isSchoolSlugAllowedOnHost,
  isWhiteLabelAccountAllowed,
  isWhiteLabelHost,
  parseHost,
  preferredSchoolSlugFromHost,
} from "../src/lib/tenant-host.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

assert.equal(isWhiteLabelHost("rowad.manzoma.sa"), true);
assert.equal(isWhiteLabelHost("rowad.localhost:3000"), true);
assert.equal(isWhiteLabelHost("rowad-albania.manzoma.sa"), false);
assert.deepEqual(parseHost("rowad-albania.manzoma.sa"), {
  slug: "rowad-albania",
  isTenant: true,
});
assert.equal(preferredSchoolSlugFromHost("rowad.manzoma.sa"), "rowad-demo");
assert.equal(preferredSchoolSlugFromHost("rowad-albania.manzoma.sa"), "rowad-albania");

assert.equal(isWhiteLabelAccountAllowed("MANZOMA@ROWAD.COM"), true);
assert.equal(isWhiteLabelAccountAllowed("admin@rowad-albania.example"), false);
assert.equal(isWhiteLabelAccountAllowed(null), false);

assert.equal(isSchoolSlugAllowedOnHost("rowad.manzoma.sa", "rowad-demo"), true);
assert.equal(isSchoolSlugAllowedOnHost("rowad.manzoma.sa", "rowad-albania"), false);
assert.equal(isSchoolSlugAllowedOnHost("rowad-albania.manzoma.sa", "rowad-albania"), true);
assert.equal(isSchoolSlugAllowedOnHost("rowad-albania.manzoma.sa", "rowad-demo"), false);
assert.equal(isSchoolSlugAllowedOnHost("localhost:3000", "rowad-demo"), true);

const guardedRoutes = [
  "src/app/api/auth/school-signup/route.ts",
  "src/app/api/class-invites/[token]/route.ts",
  "src/app/api/invite/[token]/route.ts",
  "src/app/api/workshop-signup/route.ts",
  "src/app/api/workshop-enroll/route.ts",
  "src/app/api/workshop-attend/[code]/route.ts",
  "src/app/api/schools/[slug]/route.ts",
];

for (const relativePath of guardedRoutes) {
  const source = readFileSync(join(root, relativePath), "utf8");
  assert.match(
    source,
    /isSchoolSlugAllowedOnHost/,
    `${relativePath} must bind school data to the current host`,
  );
}

const schoolsIndexSource = readFileSync(join(root, "src/app/api/schools/route.ts"), "utf8");
assert.match(
  schoolsIndexSource,
  /preferredSchoolSlugFromHost/,
  "the public school directory must be scoped to the current host",
);

assert.equal(
  existsSync(join(root, "src/app/api/school-admin/debug/route.ts")),
  false,
  "the cross-tenant diagnostic endpoint must not ship",
);

const proxySource = readFileSync(join(root, "src/proxy.ts"), "utf8");
assert.match(proxySource, /isWhiteLabelAccountAllowed/);
assert.match(proxySource, /pathname\.startsWith\("\/schools\/"\)/);
assert.match(proxySource, /pathname\.startsWith\("\/invite\/"\)/);
assert.match(proxySource, /pathname\.startsWith\("\/workshop\/"\)/);
assert.match(
  proxySource,
  /!whiteLabelHost\s*&&\s*\(pathname === "\/api\/teacher"/,
  "teacher API fast-path must never bypass the white-label allowlist",
);

const callbackSource = readFileSync(join(root, "src/app/auth/callback/route.ts"), "utf8");
assert.match(callbackSource, /isWhiteLabelAccountAllowed/);

for (const relativePath of [
  "src/lib/teacher-auth.ts",
  "src/lib/student-auth.ts",
  "src/lib/player-auth.ts",
]) {
  const source = readFileSync(join(root, relativePath), "utf8");
  assert.match(source, /isSchoolIdAllowedForCurrentRequest/);
}

console.log("White-label and tenant isolation checks passed.");
