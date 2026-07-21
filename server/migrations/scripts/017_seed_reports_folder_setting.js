/**
 * server/migrations/scripts/017_seed_reports_folder_setting.js
 *
 * Seeds the "Reports Folder ID" setting shown in the Settings popup, with
 * separate test/prod values (see 016_settings_test_prod_split.js for why
 * every setting has this shape now).
 *
 * The test value reuses REPORTS_FOLDER_DEV_ID's existing folder ID from
 * .env — that env var was never actually read by any code, so this setting
 * effectively replaces it, now properly split by environment.
 *
 * Safe to re-run: upserted by key, existing values left untouched via
 * $setOnInsert so a later manual edit isn't clobbered by a re-run.
 */

const SETTINGS = [
  {
    key: "reportsFolderId",
    label: "Reports Folder ID",
    value: {
      test: "1sQcn305HBF4iyQzraJPft8bVpKzti0d4",
      prod: "REPLACE_WITH_PROD_DRIVE_FOLDER_ID",
    },
  },
];

export async function up(db) {
  const settings = db.collection("Settings");
  const now = new Date();

  for (const s of SETTINGS) {
    await settings.updateOne(
      { key: s.key },
      {
        $setOnInsert: { key: s.key, label: s.label, value: s.value, createdAt: now },
        $set: { updatedAt: now },
      },
      { upsert: true }
    );
  }
  console.log(`     settings: ${SETTINGS.length} upserted`);
}

export async function down(db) {
  const settings = db.collection("Settings");

  const result = await settings.deleteMany({ key: { $in: SETTINGS.map((s) => s.key) } });

  console.log(`     removed ${result.deletedCount} setting(s)`);
}
