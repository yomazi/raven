/**
 * server/migrations/scripts/012_rename_build_event_phase_build_to_ticketing.js
 *
 * Renames the build.events[].phase value "build" -> "ticketing" on all Show
 * documents, following the "Build" phase's rename to "Ticketing" (see
 * migration 010). That migration renamed build.dateBuildComplete but missed
 * historical event log entries, which still record the old phase name —
 * now invalid under the buildEventSchema.phase enum (["setup", "ticketing",
 * "close"]), causing PATCH /shows/:id to 500 with a validation error
 * whenever build.events is revalidated.
 *
 * Safe to re-run: each direction's filter only matches events still at the
 * value being replaced.
 */

export async function up(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { "build.events.phase": "build" },
    { $set: { "build.events.$[elem].phase": "ticketing" } },
    { arrayFilters: [{ "elem.phase": "build" }] }
  );

  console.log(
    `     build.events[].phase "build" -> "ticketing": ${result.matchedCount} matched, ${result.modifiedCount} updated`
  );
}

export async function down(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { "build.events.phase": "ticketing" },
    { $set: { "build.events.$[elem].phase": "build" } },
    { arrayFilters: [{ "elem.phase": "ticketing" }] }
  );

  console.log(
    `     build.events[].phase "ticketing" -> "build": ${result.matchedCount} matched, ${result.modifiedCount} updated`
  );
}
