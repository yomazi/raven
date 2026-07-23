/**
 * server/migrations/scripts/019_clear_gmail_thread_ids.js
 *
 * Clears build.gmailThreadIds on every show. These were populated by
 * dragonfly using the Gmail add-on framework's own thread id, which comes
 * back in one of two incompatible encodings depending on how the message
 * was opened — so a show's linked-thread list could be missing entries
 * recorded under the other encoding. Dragonfly now resolves and registers
 * threads by their canonical Gmail API id instead (see
 * resolveMessageContext in dragonfly's Code.gs). The feature hasn't been in
 * use long enough for the existing links to be worth reconciling, so this
 * just wipes the list rather than trying to migrate it — every thread
 * re-links itself automatically the next time its email is opened in
 * dragonfly.
 *
 * Safe to re-run: unsetting an already-absent field is a no-op.
 */

export async function up(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    { "build.gmailThreadIds": { $exists: true } },
    { $unset: { "build.gmailThreadIds": "" } }
  );

  console.log(`     build.gmailThreadIds cleared on ${result.modifiedCount} document(s)`);
}
