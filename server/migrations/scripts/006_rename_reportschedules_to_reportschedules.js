/**
 * server/migrations/scripts/006_rename_reportschedules_to_reportschedules.js
 *
 * Renames the "reportschedules" collection to "ReportSchedules" so it
 * matches the Pascal-case naming convention used by every other collection
 * in raven_db (Shows, Tasks, Contacts, Groups, Users, ApiTokens, Logs) —
 * "reportschedules" was the lone lowercase outlier, left over from the
 * ReportSchedule model not passing an explicit collection name.
 *
 * The app's ReportSchedule model was updated in the same change to declare
 * the "ReportSchedules" collection name, so a running server can end up
 * auto-creating an empty "ReportSchedules" collection (via its unique index
 * build) before this migration runs. If that happens, MongoDB's rename
 * would fail with "target namespace exists" — so this drops an empty
 * pre-created target before renaming the real data into place. It refuses
 * to touch a non-empty target to avoid ever discarding real documents.
 *
 * Idempotent: skips if the source collection is already gone (already
 * renamed).
 */

export async function up(db) {
  const sourceExists = (await db.listCollections({ name: "reportschedules" }).toArray()).length > 0;

  if (!sourceExists) {
    console.log(`     "reportschedules" not found — already renamed, skipping`);
    return;
  }

  const targetExists = (await db.listCollections({ name: "ReportSchedules" }).toArray()).length > 0;

  if (targetExists) {
    const targetCount = await db.collection("ReportSchedules").countDocuments();
    if (targetCount > 0) {
      throw new Error(
        `"ReportSchedules" already exists and has ${targetCount} document(s) — refusing to overwrite. Resolve manually.`
      );
    }
    await db.collection("ReportSchedules").drop();
    console.log(`     dropped empty pre-existing "ReportSchedules" collection`);
  }

  await db.collection("reportschedules").rename("ReportSchedules");
  console.log(`     renamed "reportschedules" → "ReportSchedules"`);
}

export async function down(db) {
  const collections = await db.listCollections({ name: "ReportSchedules" }).toArray();

  if (collections.length === 0) {
    console.log(`     "ReportSchedules" not found — already rolled back, skipping`);
    return;
  }

  await db.collection("ReportSchedules").rename("reportschedules");
  console.log(`     renamed "ReportSchedules" → "reportschedules"`);
}
