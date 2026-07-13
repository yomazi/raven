/**
 * server/migrations/scripts/007_seed_settings.js
 *
 * Seeds the initial app-wide settings shown in the Settings popup.
 *
 * Safe to re-run: upserted by key, existing values left untouched via
 * $setOnInsert so a later manual edit isn't clobbered by a re-run.
 */

const SETTINGS = [
  {
    key: "generalContractTemplateDocId",
    label: "General Contract Template Doc ID",
    value: "1r4o9VAuZAvqS8Zcxx1yAD0O-iZm-eOPRZQC25nONPNc",
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
