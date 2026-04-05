#!/usr/bin/env node

/**
 * server/migrations/new-migration.js
 *
 * Creates a new migration file in the scripts/ folder with the correct number.
 *
 * Usage:
 *   node migrations/new-migration.js <description>
 *
 * Example:
 *   node migrations/new-migration.js remove_deprecated_venue_field
 *   → creates server/migrations/scripts/002_remove_deprecated_venue_field.js
 */

import { readdir, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsFolder = resolve(__dirname, "scripts");

function label(tag, color) {
  const codes = { green: 32, yellow: 33, red: 31, cyan: 36, dim: 2 };
  return `\x1b[${codes[color]}m${tag}\x1b[0m`;
}

async function main() {
  const name = process.argv[2];

  if (!name) {
    console.error(`\n  ${label("✖ error", "red")}  Please provide a description.\n`);
    console.error(`  Usage: node migrations/new-migration.js <description>\n`);
    process.exit(1);
  }

  // Sanitize: lowercase, replace spaces with underscores, strip non-alphanumeric except underscores
  const sanitized = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  if (!sanitized) {
    console.error(
      `\n  ${label("✖ error", "red")}  Description produced an empty filename after sanitizing.\n`
    );
    process.exit(1);
  }

  // Find the highest existing migration number
  const files = await readdir(scriptsFolder);
  const existing = files.filter((f) => /^\d{3}_.+\.js$/.test(f)).sort();
  const lastNumber =
    existing.length > 0 ? parseInt(existing[existing.length - 1].slice(0, 3), 10) : 0;
  const nextNumber = String(lastNumber + 1).padStart(3, "0");
  const filename = `${nextNumber}_${sanitized}.js`;
  const filepath = resolve(scriptsFolder, filename);

  const template = `/**
 * server/migrations/scripts/${filename}
 *
 * The runner passes a raw MongoDB \`db\` instance (not Mongoose).
 * Use the native driver: db.collection("Name").updateMany(...) etc.
 *
 * Rules:
 *   - up()   should be idempotent where possible ($exists checks, upserts, etc.)
 *   - down()  is optional but encouraged for anything reversible
 *   - Log a summary line so the runner output stays informative
 */

export async function up(db) {
  // const col = db.collection("CollectionName");
  // const result = await col.updateMany( ... );
  // console.log(\`     N documents updated\`);
  throw new Error("up() not implemented — fill this in before running.");
}

// export async function down(db) {
//   const col = db.collection("CollectionName");
//   await col.updateMany( ... );
// }
`;

  await writeFile(filepath, template, "utf8");
  console.log(`\n  ${label("✔ created", "green")}  migrations/scripts/${filename}\n`);
}

main().catch((err) => {
  console.error("\n✖ Error:", err.message);
  process.exit(1);
});
