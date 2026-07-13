/**
 * server/migrations/scripts/008_seed_marketing_assets_template_setting.js
 *
 * Seeds the "Marketing Assets Info Template Doc ID" setting shown in the
 * Settings popup.
 *
 * Safe to re-run: upserted by key, existing values left untouched via
 * $setOnInsert so a later manual edit isn't clobbered by a re-run.
 */

const SETTINGS = [
  {
    key: "marketingAssetsInfoTemplateDocId",
    label: "Marketing Assets Info Template Doc ID",
    value: "1xuF-TAwEhZ2foDCk24S4HYf1jRbOiTB2ArG_5h3noEM",
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
