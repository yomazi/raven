/**
 * server/migrations/001_add-builds-shouldShowInRoster.js
 *
 * For every Show document where builds.shouldShowInRoster does not exist,
 * set it to false.
 *
 * Safe to re-run: $exists check prevents touching already-set fields.
 */

export async function up(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { "builds.shouldShowInRoster": { $exists: false } },
    { $set: { "builds.shouldShowInRoster": false } }
  );

  console.log(
    `     builds.shouldShowInRoster: ${result.matchedCount} matched, ${result.modifiedCount} updated`
  );
}

export async function down(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { "builds.shouldShowInRoster": { $exists: true } },
    { $unset: { "builds.shouldShowInRoster": "" } }
  );

  console.log(`     builds.shouldShowInRoster removed from ${result.modifiedCount} document(s)`);
}
