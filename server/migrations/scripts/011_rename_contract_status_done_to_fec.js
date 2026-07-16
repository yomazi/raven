/**
 * server/migrations/scripts/011_rename_contract_status_done_to_fec.js
 *
 * Renames the per-contract status value "done" -> "FEC" on all
 * build.contracts[] entries. Contracts are the only field using this
 * enum value as "fully executed contract" — build.contract (the
 * BASE_STATUS rollup) and every other BASE_STATUS field keep "done"
 * unchanged.
 *
 * Safe to re-run: each direction's filter only matches contracts still at
 * the value being replaced.
 */

export async function up(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { "build.contracts.status": "done" },
    { $set: { "build.contracts.$[elem].status": "FEC" } },
    { arrayFilters: [{ "elem.status": "done" }] }
  );

  console.log(
    `     build.contracts[].status "done" -> "FEC": ${result.matchedCount} matched, ${result.modifiedCount} updated`
  );
}

export async function down(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { "build.contracts.status": "FEC" },
    { $set: { "build.contracts.$[elem].status": "done" } },
    { arrayFilters: [{ "elem.status": "FEC" }] }
  );

  console.log(
    `     build.contracts[].status "FEC" -> "done": ${result.matchedCount} matched, ${result.modifiedCount} updated`
  );
}
