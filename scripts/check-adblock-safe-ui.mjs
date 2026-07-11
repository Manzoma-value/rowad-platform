import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = ["src/app", "src/components"];
const extensions = new Set([".css", ".ts", ".tsx"]);
const blockedIdentifier = /\b(?:ad|ads|advert|advertisement|sponsor)-[a-z0-9_-]+/gi;

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(target);
      return extensions.has(path.extname(entry.name)) ? [target] : [];
    }),
  );
  return files.flat();
}

const files = (await Promise.all(roots.map(collectFiles))).flat();
const failures = [];

for (const file of files) {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  lines.forEach((line, index) => {
    const matches = [...line.matchAll(blockedIdentifier)];
    for (const match of matches) {
      failures.push(`${file}:${index + 1} ${match[0]}`);
    }
  });
}

if (failures.length > 0) {
  console.error(
    "Unsafe UI identifiers detected. Content blockers may hide these elements:\n" +
      failures.map((failure) => `  - ${failure}`).join("\n"),
  );
  process.exit(1);
}

console.log("Ad-block-safe UI identifier check passed.");
