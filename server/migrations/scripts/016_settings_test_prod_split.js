/**
 * server/migrations/scripts/016_settings_test_prod_split.js
 *
 * Every Setting used to hold a single flat string value (implicitly
 * "prod"). Settings now hold two independent values, test and prod (see
 * SettingsService.getValue) — this migrates existing documents from
 * `value: "<string>"` to `value: { test: "<string>", prod: "<string>" }`,
 * copying the old value into BOTH sides so nothing that currently reads a
 * setting starts failing the moment SETTINGS_ENV=test.
 *
 * Safe to re-run: only matches documents where `value` is still a plain
 * string (BSON type check), so a second run is a no-op.
 */

export async function up(db) {
  const settings = db.collection("Settings");

  const oldShapeDocs = await settings.find({ value: { $type: "string" } }).toArray();

  for (const doc of oldShapeDocs) {
    await settings.updateOne(
      { _id: doc._id },
      { $set: { value: { test: doc.value, prod: doc.value } } }
    );
  }

  console.log(`     ${oldShapeDocs.length} setting(s) migrated to {test, prod} value shape`);
}

export async function down(db) {
  const settings = db.collection("Settings");

  const newShapeDocs = await settings.find({ "value.prod": { $exists: true } }).toArray();

  for (const doc of newShapeDocs) {
    await settings.updateOne({ _id: doc._id }, { $set: { value: doc.value.prod ?? "" } });
  }

  console.log(`     ${newShapeDocs.length} setting(s) reverted to flat string value`);
}
