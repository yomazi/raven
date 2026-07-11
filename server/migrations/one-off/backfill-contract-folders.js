#!/usr/bin/env node

/**
 * server/migrations/one-off/backfill-contract-folders.js
 *
 * One-time backfill for the multi-contract redesign. Unlike the numbered
 * scripts in migrations/scripts/, this makes real Google Drive API calls
 * (one folder-create per show with an existing contract), so it lives
 * outside the fast, deterministic DB-only migration runner and is meant to
 * be run manually:
 *
 *   node migrations/one-off/backfill-contract-folders.js
 *   node migrations/one-off/backfill-contract-folders.js --dry-run
 *
 * Resumable: a show is considered already migrated once it has a
 * build.contracts key at all (even an empty array), so re-running only
 * touches shows a previous run didn't reach or failed on.
 *
 * For each unmigrated show:
 *   - build.contract was "n/a" or missing  -> contracts: [], contract: "n/a"
 *   - build.contract was anything else     -> create a "contract - {artist}"
 *     Drive subfolder, then contracts: [{ signee: artist, status: <old
 *     value>, folderId, folderName, lastCheckin, dateDrafted, dateSigned,
 *     dateFEC: <copied from the old top-level fields> }], contract:
 *     <recomputed rollup>
 * Old top-level fields (contractLastCheckin, weDraftedContract, dateDrafted,
 * dateSigned, dateFEC) are unset once copied.
 */

import "dotenv/config";
import { connectDb } from "../../utilities/db.js";
import DriveRepository from "../../drive/drive.repository.js";
import Show from "../../models/Show.js";
import { deriveContractFieldStatus } from "../../../shared/functions/builds.js";

const DRY_RUN = process.argv.includes("--dry-run");

async function migrateShow(show) {
  const oldBuild = show.build ?? {};
  const oldStatus = oldBuild.contract;

  if (!oldStatus || oldStatus === "n/a") {
    return {
      contracts: [],
      contract: "n/a",
    };
  }

  const folder = await DriveRepository.createContractFolder({
    folderId: show.googleFolderId,
    signee: show.artist,
  });

  const contract = {
    signee: show.artist,
    status: oldStatus,
    folderId: folder.folderId,
    folderName: folder.folderName,
    lastCheckin: oldBuild.contractLastCheckin ?? null,
    dateDrafted: oldBuild.dateDrafted ?? null,
    dateSigned: oldBuild.dateSigned ?? null,
    dateFEC: oldBuild.dateFEC ?? null,
    archived: false,
  };

  return {
    contracts: [contract],
    contract: deriveContractFieldStatus([contract]),
  };
}

async function run() {
  await connectDb();

  // .lean() so we read the raw stored document, including fields the
  // current schema no longer declares (contractLastCheckin, dateDrafted,
  // etc.) — those only get stripped by Mongoose on write, not on read.
  const shows = await Show.find({
    deleted: { $ne: true },
    "build.contracts": { $exists: false },
  }).lean();

  console.log(`Found ${shows.length} show(s) not yet migrated.`);

  let migrated = 0;
  let failed = 0;

  for (const show of shows) {
    try {
      const { contracts, contract } = await migrateShow(show);

      console.log(
        `${DRY_RUN ? "[dry-run] " : ""}${show.artist} (${show.googleFolderId}): ` +
          `${contracts.length} contract(s), rollup="${contract}"`
      );

      if (!DRY_RUN) {
        await Show.updateOne(
          { _id: show._id },
          {
            $set: { "build.contracts": contracts, "build.contract": contract },
            $unset: {
              "build.contractLastCheckin": "",
              "build.weDraftedContract": "",
              "build.dateDrafted": "",
              "build.dateSigned": "",
              "build.dateFEC": "",
            },
          }
        );
      }

      migrated++;
    } catch (err) {
      failed++;
      console.error(`  FAILED: ${show.artist} (${show.googleFolderId}): ${err.message}`);
    }
  }

  console.log(`\nDone. Migrated ${migrated}, failed ${failed} (re-run to retry failures).`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
