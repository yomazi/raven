/**
 * server/migrations/scripts/010_rename_build_dateBuildComplete_to_dateTicketingComplete.js
 *
 * Renames build.dateBuildComplete → build.dateTicketingComplete on all Show
 * documents, following the "Build" phase's rename to "Ticketing".
 *
 * Safe to re-run: $rename on a non-existent source field is a no-op, so
 * already-migrated docs are skipped.
 */

export async function up(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { "build.dateBuildComplete": { $exists: true } },
    { $rename: { "build.dateBuildComplete": "build.dateTicketingComplete" } }
  );

  console.log(
    `     build.dateBuildComplete → build.dateTicketingComplete: ${result.matchedCount} matched, ${result.modifiedCount} updated`
  );
}

export async function down(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { "build.dateTicketingComplete": { $exists: true } },
    { $rename: { "build.dateTicketingComplete": "build.dateBuildComplete" } }
  );

  console.log(
    `     build.dateTicketingComplete → build.dateBuildComplete: ${result.matchedCount} matched, ${result.modifiedCount} updated`
  );
}
