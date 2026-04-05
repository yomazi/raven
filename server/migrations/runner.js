#!/usr/bin/env node

/**
 * server/migrations/runner.js
 *
 * Usage (from server/ or via root-level npm scripts):
 *   node migrations/runner.js            → run all pending migrations
 *   node migrations/runner.js --list     → show status of all migrations
 *   node migrations/runner.js --dry-run  → show what would run, without executing
 *   node migrations/runner.js --down 003 → roll back migration 003 (if it exports down())
 */

import dotenv from "dotenv";
import { readdir } from "fs/promises";
import { MongoClient } from "mongodb";
import { dirname, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsFolder = resolve(__dirname, "scripts");

// server/migrations/ → server/.env
dotenv.config({ path: resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "raven_db";
const MIGRATIONS_COLLECTION = "_migrations";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    list: args.includes("--list"),
    dryRun: args.includes("--dry-run"),
    down: args.includes("--down") ? args[args.indexOf("--down") + 1] : null,
  };

  return result;
}

async function getMigrationFiles() {
  const files = await readdir(scriptsFolder);

  return files.filter((f) => /^\d{3}_.+\.js$/.test(f)).sort();
}

async function getApplied(db) {
  const docs = await db.collection(MIGRATIONS_COLLECTION).find({}).toArray();
  const result = new Set(docs.map((d) => d.name));

  return result;
}

async function markApplied(db, name) {
  await db.collection(MIGRATIONS_COLLECTION).insertOne({ name, appliedAt: new Date() });
}

async function markUnapplied(db, name) {
  await db.collection(MIGRATIONS_COLLECTION).deleteOne({ name });
}

function label(tag, color) {
  const codes = { green: 32, yellow: 33, red: 31, dim: 2, cyan: 36 };
  return `\x1b[${codes[color]}m${tag}\x1b[0m`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { list, dryRun, down } = parseArgs();

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log(`\n🗄  Connected to: ${MONGO_URI}/${DB_NAME}`);

  const files = await getMigrationFiles();
  const applied = await getApplied(db);

  // ── --list ────────────────────────────────────────────────────────────────
  if (list) {
    console.log("\nMigration status:\n");
    for (const file of files) {
      const status = applied.has(file) ? label("✔ applied", "green") : label("○ pending", "yellow");
      console.log(`  ${status}  ${file}`);
    }
    console.log();
    await client.close();
    return;
  }

  // ── --down <prefix> ───────────────────────────────────────────────────────
  if (down) {
    const target = files.find((f) => f.startsWith(down));

    if (!target) {
      console.error(`  ${label("✖ error", "red")}  No migration found matching prefix: ${down}`);
      await client.close();
      process.exit(1);
    }

    const pathToTarget = resolve(scriptsFolder, target);

    if (!applied.has(target)) {
      console.log(`  ${label("⚠ skipped", "yellow")}  ${target} has not been applied.`);
      await client.close();
      return;
    }
    const mod = await import(pathToFileURL(pathToTarget).href);
    if (!mod.down) {
      console.error(`  ${label("✖ error", "red")}  ${target} does not export a down() function.`);
      await client.close();
      process.exit(1);
    }
    console.log(`\n  ↩  Rolling back ${target} ...`);
    if (!dryRun) {
      await mod.down(db);
      await markUnapplied(db, target);
    }
    const doneLabel = label(dryRun ? "dry run complete" : "✔ done", dryRun ? "cyan" : "green");
    const doneMessage = dryRun ? `${target} was not modified.` : `${target} rolled back.`;
    console.log(`  ${doneLabel}  ${doneMessage}\n`);
    await client.close();
    return;
  }

  // ── run pending ───────────────────────────────────────────────────────────
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log(`\n  ${label("✔ up to date", "green")}  No pending migrations.\n`);
    await client.close();
    return;
  }

  console.log(`\n  ${pending.length} pending migration(s):\n`);

  for (const file of pending) {
    console.log(`  → ${file}${dryRun ? label("  (dry run)", "dim") : ""}`);
    const pathToFile = resolve(scriptsFolder, file);
    if (!dryRun) {
      const mod = await import(pathToFileURL(pathToFile).href);
      if (typeof mod.up !== "function") {
        console.error(
          `     ${label("✖ error", "red")}  ${file} does not export an up() function. Aborting.`
        );
        await client.close();
        process.exit(1);
      }
      try {
        await mod.up(db);
        await markApplied(db, file);
        console.log(`     ${label("✔ applied", "green")}`);
      } catch (err) {
        console.error(`     ${label("✖ failed", "red")}  ${err.message}`);
        console.error("     Aborting. Remaining migrations were NOT run.");
        await client.close();
        process.exit(1);
      }
    }
  }

  const doneLabel = label(dryRun ? "dry run complete" : "✔ done", dryRun ? "cyan" : "green");
  const doneMessage = dryRun ? "No changes were made." : "All pending migrations applied.";
  console.log(`\n  ${doneLabel}  ${doneMessage}\n`);
  await client.close();
}

main().catch((err) => {
  console.error("\n✖ Runner error:", err.message);
  process.exit(1);
});
