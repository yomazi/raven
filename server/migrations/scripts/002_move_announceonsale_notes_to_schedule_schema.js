/**
 * server/migrations/002_move-build-announceOnSaleNotes-to-schedule-notes.js
 *
 * Moves build.announceOnSaleNotes → schedule.notes for every Show document
 * that has a non-empty build.announceOnSaleNotes value.
 *
 * Safe to re-run: the $exists + $ne checks prevent touching already-migrated
 * or empty documents.
 */

export async function up(db) {
  const shows = db.collection("Shows");

  // Pull only the docs we need to transform — those with a real value in the old field.
  // We can't do this as a single updateMany because the source and destination field
  // names differ, so we iterate and set the value explicitly.
  const cursor = shows.find({
    "build.announceOnSaleNotes": { $exists: true, $nin: [null, ""] },
  });

  let matched = 0;
  let modified = 0;

  for await (const show of cursor) {
    const notes = show.build.announceOnSaleNotes;
    const result = await shows.updateOne(
      { _id: show._id },
      {
        $set: { "schedule.notes": notes },
        $unset: { "build.announceOnSaleNotes": "" },
      }
    );
    matched++;
    if (result.modifiedCount > 0) modified++;
  }

  console.log(
    `     build.announceOnSaleNotes → schedule.notes: ${matched} matched, ${modified} updated`
  );
}

export async function down(db) {
  const shows = db.collection("Shows");

  // Reverse: move schedule.notes back to build.announceOnSaleNotes.
  // Only touches documents that have a schedule.notes value (i.e. ones we migrated).
  const cursor = shows.find({
    "schedule.notes": { $exists: true, $nin: [null, ""] },
  });

  let matched = 0;
  let modified = 0;

  for await (const show of cursor) {
    const notes = show.schedule.notes;
    const result = await shows.updateOne(
      { _id: show._id },
      {
        $set: { "build.announceOnSaleNotes": notes },
        $unset: { "schedule.notes": "" },
      }
    );
    matched++;
    if (result.modifiedCount > 0) modified++;
  }

  console.log(
    `     schedule.notes → build.announceOnSaleNotes: ${matched} matched, ${modified} updated`
  );
}
