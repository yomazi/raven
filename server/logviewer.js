#!/usr/bin/env node
import select from "@inquirer/select";
import { createColors } from "colorette";
import fs from "fs";
import path from "path";
import readline from "readline";
import zlib from "zlib";

const { green, red, yellow } = createColors({ useColor: true });

const LOG_FOLDER = "./logs";

async function main() {
  const args = process.argv.slice(2);
  const PICK_MODE = args.includes("--pick");

  let files = fs.readdirSync(LOG_FOLDER).filter((f) => f.endsWith(".log") || f.endsWith(".log.gz"));

  if (files.length === 0) {
    console.log("No log files found in", LOG_FOLDER);
    process.exit(0);
  }

  files = files
    .map((f) => ({ f, mtime: fs.statSync(path.join(LOG_FOLDER, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime)
    .map((o) => o.f);

  let filePath;

  if (PICK_MODE) {
    const file = await select({
      message: "Select a log file to view",
      choices: files.map((f) => ({ name: f, value: f })),
    });
    filePath = path.join(LOG_FOLDER, file);
  } else {
    filePath = path.join(LOG_FOLDER, files[0]);
  }

  console.log(`\nOpening: ${filePath}\n`);

  let readStream;
  if (filePath.endsWith(".gz")) {
    readStream = fs.createReadStream(filePath).pipe(zlib.createGunzip());
  } else {
    readStream = fs.createReadStream(filePath);
  }

  const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity,
  });

  rl.on("line", (line) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      let level = obj.level ?? "-";
      let msg = obj.message ?? "-";

      if (level === "info") level = green(level);
      else if (level === "warn") level = yellow(level);
      else if (level === "error") level = red(level);

      console.log(`${obj.timestamp ?? "-"} ${level} ${msg}`);
    } catch {
      console.log(line);
    }
  });

  rl.on("close", () => {
    console.log("\n--- End of file ---");
  });
}

main();
