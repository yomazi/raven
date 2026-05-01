/**
 * server/migrations/scripts/002_rename_contract_status_waiting_for_par.js
 *
 * Renames the contract status value "waiting for Par" → "waiting for us"
 * on all Show documents where build.contract === "waiting for Par".
 *
 * Safe to re-run: the $eq filter means already-updated docs are skipped.
 */

export async function up(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { "build.contract": { $eq: "waiting for Par" } },
    { $set: { "build.contract": "waiting for us" } }
  );

  console.log(
    `     build.contract "waiting for Par" → "waiting for us": ${result.matchedCount} matched, ${result.modifiedCount} updated`
  );
}

export async function down(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { "build.contract": { $eq: "waiting for us" } },
    { $set: { "build.contract": "waiting for Par" } }
  );

  console.log(
    `     build.contract "waiting for us" → "waiting for Par": ${result.matchedCount} matched, ${result.modifiedCount} updated`
  );
}
