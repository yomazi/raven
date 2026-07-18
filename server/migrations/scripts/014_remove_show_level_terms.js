/**
 * server/migrations/scripts/014_remove_show_level_terms.js
 *
 * Deal Terms (Main Settlement, Livestream, Educational Events) moved from
 * being a single show-level "terms" object to a "terms" object embedded on
 * each contract in build.contracts[], since a show can have multiple
 * contracts with different settlement/livestream terms. The Show schema no
 * longer defines a top-level "terms" field, so any value still stored there
 * is orphaned data that's never read anywhere. Removes it.
 *
 * Safe to re-run: $exists check prevents touching documents already clean.
 */

export async function up(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { terms: { $exists: true } },
    { $unset: { terms: "" } }
  );

  console.log(`     stray "terms" field removed from ${result.modifiedCount} document(s)`);
}
