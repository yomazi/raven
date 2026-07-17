/**
 * server/migrations/scripts/013_remove_stray_builds_shouldshowinroster.js
 *
 * Migration 001 (add_builds_shouldShowInRoster) had a naming bug: it wrote
 * to the top-level "builds" (plural) key instead of "build" (singular),
 * which doesn't match the buildSchema.shouldShowInRoster field actually
 * defined on the Show model. The real field, build.shouldShowInRoster, has
 * always been the one read/written by the app (Properties page checkbox,
 * the Builds roster filter, reports, etc.) — the plural "builds" object is
 * orphaned data that's never read anywhere. Removes it.
 *
 * Safe to re-run: $exists check prevents touching documents already clean.
 */

export async function up(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { "builds.shouldShowInRoster": { $exists: true } },
    { $unset: { builds: "" } }
  );

  console.log(`     stray "builds" field removed from ${result.modifiedCount} document(s)`);
}

export async function down(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { builds: { $exists: false } },
    { $set: { "builds.shouldShowInRoster": false } }
  );

  console.log(`     builds.shouldShowInRoster restored on ${result.modifiedCount} document(s)`);
}
