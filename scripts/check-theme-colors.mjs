import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const roots = ["src/app/teacher", "src/app/student", "src/components"];
const extensions = new Set([".css", ".ts", ".tsx"]);
const fix = process.argv.includes("--fix");

const palette = [
  "#6B1E2D",
  "#4A0E1C",
  "#5B1526",
  "#32101A",
  "#B8A082",
  "#8F765B",
  "#D9C9B0",
  "#EFEAE0",
  "#E5E0D5",
  "#F7F3EB",
  "#FFFBF5",
  "#1A1A1A",
  "#655B53",
  "#796A62",
  "#8C8274",
  "#1B5E20",
  "#FFFFFF",
];

function parseHex(value) {
  let hex = value.slice(1);
  if (hex.length === 3 || hex.length === 4) {
    hex = [...hex].map((part) => part + part).join("");
  }
  if (hex.length !== 6 && hex.length !== 8) return null;
  return {
    rgb: [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ],
    alpha: hex.length === 8 ? hex.slice(6).toUpperCase() : "",
  };
}

const paletteRgb = palette.map((hex) => ({ hex, rgb: parseHex(hex).rgb }));
const approvedBases = new Set(palette.map((hex) => hex.toUpperCase()));

function distance(left, right) {
  return left.reduce((sum, value, index) => sum + (value - right[index]) ** 2, 0);
}

function nearest(rgb, candidates = paletteRgb) {
  return [...candidates].sort(
    (left, right) => distance(rgb, left.rgb) - distance(rgb, right.rgb),
  )[0];
}

function normalizeRgb(rgb) {
  const [red, green, blue] = rgb;
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  const lightness = (max + min) / 510;

  if (lightness > 0.9) {
    return nearest(
      rgb,
      paletteRgb.filter(({ hex }) =>
        ["#EFEAE0", "#E5E0D5", "#F7F3EB", "#FFFBF5", "#FFFFFF"].includes(hex),
      ),
    );
  }

  if (green > red * 1.12 && green > blue * 1.08 && lightness < 0.75) {
    return paletteRgb.find(({ hex }) => hex === "#1B5E20");
  }

  if (red > green * 1.18 && red > blue * 1.08 && lightness < 0.78) {
    return paletteRgb.find(({ hex }) => hex === "#6B1E2D");
  }

  return nearest(rgb);
}

function normalizeHex(value) {
  const parsed = parseHex(value);
  if (!parsed) return value;
  const normalized = normalizeRgb(parsed.rgb).hex;
  return normalized + parsed.alpha;
}

function isApprovedHex(value) {
  const parsed = parseHex(value);
  if (!parsed) return false;
  const base = `#${parsed.rgb.map((part) => part.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  return approvedBases.has(base);
}

function normalizeColors(source) {
  let output = source.replace(/#[0-9a-f]{3,8}\b/gi, (value) =>
    isApprovedHex(value) ? value : normalizeHex(value),
  );

  output = output.replace(
    /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(\s*,\s*[^)]+)?\)/gi,
    (value, red, green, blue, alpha) => {
      const rgb = [Number(red), Number(green), Number(blue)];
      const target = normalizeRgb(rgb).rgb;
      if (rgb.every((part, index) => part === target[index])) return value;
      if (alpha) return `rgba(${target.join(",")},${alpha.replace(/^\s*,\s*/, "")})`;
      return `rgb(${target.join(",")})`;
    },
  );

  return output;
}

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
let changedFiles = 0;

for (const file of files) {
  const source = await readFile(file, "utf8");
  const normalized = normalizeColors(source);

  if (fix && normalized !== source) {
    await writeFile(file, normalized, "utf8");
    changedFiles += 1;
    continue;
  }

  if (!fix && normalized !== source) failures.push(file);
}

if (failures.length > 0) {
  console.error(
    "Off-theme colors detected in teacher, student, or shared UI files:\n" +
      failures.map((file) => `  - ${file}`).join("\n") +
      "\nRun `npm run fix:theme-colors` to normalize them.",
  );
  process.exit(1);
}

console.log(
  fix
    ? `Theme color normalization updated ${changedFiles} file(s).`
    : "Teacher and student theme color check passed.",
);
