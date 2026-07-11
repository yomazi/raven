/**
 * server/migrations/scripts/005_schedule_release_mode.js
 *
 * Replaces the boolean schedule.releaseAsap with a three-way
 * schedule.releaseMode ("asap" | "on-schedule" | "tbd").
 *
 * Mapping (existing data takes priority over the old flag):
 *   - announceDateTime or onSaleDateTime already set -> "on-schedule"
 *   - else releaseAsap === true                      -> "asap"
 *   - else (releaseAsap false/missing, no dates)      -> "tbd"
 *
 * Safe to re-run: only touches docs that still have the old
 * schedule.releaseAsap field.
 */

function deriveReleaseMode(schedule) {
  if (schedule?.announceDateTime || schedule?.onSaleDateTime) return "on-schedule";
  if (schedule?.releaseAsap === true) return "asap";
  return "tbd";
}

export async function up(db) {
  const shows = db.collection("Shows");

  const cursor = shows.find({ "schedule.releaseAsap": { $exists: true } });
  const operations = [];

  for await (const show of cursor) {
    const releaseMode = deriveReleaseMode(show.schedule);
    operations.push({
      updateOne: {
        filter: { _id: show._id },
        update: {
          $set: { "schedule.releaseMode": releaseMode },
          $unset: { "schedule.releaseAsap": "" },
        },
      },
    });
  }

  if (operations.length === 0) {
    console.log("     No shows with schedule.releaseAsap found — nothing to do.");
    return;
  }

  const result = await shows.bulkWrite(operations);
  console.log(`     schedule.releaseAsap -> schedule.releaseMode: ${result.modifiedCount} updated`);
}

export async function down(db) {
  const shows = db.collection("Shows");

  const cursor = shows.find({ "schedule.releaseMode": { $exists: true } });
  const operations = [];

  for await (const show of cursor) {
    const releaseAsap = show.schedule?.releaseMode === "asap";
    operations.push({
      updateOne: {
        filter: { _id: show._id },
        update: {
          $set: { "schedule.releaseAsap": releaseAsap },
          $unset: { "schedule.releaseMode": "" },
        },
      },
    });
  }

  if (operations.length === 0) {
    console.log("     No shows with schedule.releaseMode found — nothing to do.");
    return;
  }

  const result = await shows.bulkWrite(operations);
  console.log(`     schedule.releaseMode -> schedule.releaseAsap: ${result.modifiedCount} updated`);
}
