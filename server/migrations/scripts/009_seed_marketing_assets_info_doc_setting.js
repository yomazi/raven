/**
 * server/migrations/scripts/009_seed_marketing_assets_info_doc_setting.js
 *
 * Seeds the "Marketing Assets Info Doc ID" setting shown in the Settings
 * popup — this is the doc actually copied when creating a show's Marketing
 * Assets folder (replaces 008's "marketingAssetsInfoTemplateDocId").
 *
 * Safe to re-run: upserted by key, existing values left untouched via
 * $setOnInsert so a later manual edit isn't clobbered by a re-run.
 */

const SETTINGS = [
  {
    key: "marketingAssetsInfoDocId",
    label: "Marketing Assets Info Doc ID",
    value: "1dZxRjVfy-7prPdtfrQCUxDcjnyvYhJmJTqcDz8abrsQ",
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
