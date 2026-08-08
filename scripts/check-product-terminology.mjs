import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = ["src"];
const extensions = new Set([".ts", ".tsx"]);
const forbidden = [
  /mësues/giu,
  /nxënës/giu,
  /shkoll/giu,
  /\bklas(?:a|at|ën|ës|ë|ave)?\b/giu,
];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collect(target);
    return extensions.has(path.extname(entry.name)) ? [target] : [];
  }));
  return nested.flat();
}

const files = (await Promise.all(roots.map(collect))).flat();
const failures = [];

for (const file of files) {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of forbidden) {
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match) failures.push(`${file}:${index + 1} ${match[0]}`);
    }
  });
}

if (failures.length) {
  console.error("Legacy Albanian product terminology detected:\n" + failures.map((failure) => `  - ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Canonical Albanian product terminology check passed.");
