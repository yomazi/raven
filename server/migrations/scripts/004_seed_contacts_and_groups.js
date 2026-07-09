/**
 * server/migrations/scripts/004_seed_contacts_and_groups.js
 *
 * Seeds the initial address book: individual contacts, plus the team
 * groups that always get emailed together (Finance, Production,
 * Audience Services, Marketing).
 *
 * Safe to re-run: contacts are upserted by email (existing name/email
 * left untouched via $setOnInsert), groups are upserted by name.
 */

const CONTACTS = [
  { name: "Lindsey Crawford", email: "lindsey@thefreight.org" },
  { name: "Winfred Torgby", email: "winfred.torgby@thefreight.org" },
  { name: "Brian Walker", email: "brian.walker@thefreight.org" },
  { name: "Jill Dockter", email: "jill.dockter@thefreight.org" },
  { name: "Tanika Baptiste", email: "tanika.baptiste@thefreight.org" },
  { name: "Gracie Malley", email: "gracie.malley@thefreight.org" },
  { name: "Anica Odell-Smedley", email: "anica@thefreight.org" },
  { name: "Kate Jones Butler", email: "kate.butler@thefreight.org" },
  { name: "PC Muñoz", email: "pcmunoz@thefreight.org" },
  { name: "Par Neiburger", email: "par.neiburger@thefreight.org" },
  { name: "Sridevi Ramanathan", email: "sridevi@thefreight.org" },
  { name: "Robin Gabrielli", email: "osidius.jones@gmail.com" },
];

const GROUPS = [
  { name: "Finance", emails: ["lindsey@thefreight.org", "winfred.torgby@thefreight.org"] },
  { name: "Production", emails: ["brian.walker@thefreight.org", "jill.dockter@thefreight.org"] },
  { name: "Audience Services", emails: ["tanika.baptiste@thefreight.org"] },
  {
    name: "Marketing",
    emails: [
      "gracie.malley@thefreight.org",
      "anica@thefreight.org",
      "kate.butler@thefreight.org",
    ],
  },
];

export async function up(db) {
  const contacts = db.collection("Contacts");
  const groups = db.collection("Groups");
  const now = new Date();

  for (const c of CONTACTS) {
    await contacts.updateOne(
      { email: c.email },
      { $setOnInsert: { name: c.name, email: c.email, createdAt: now }, $set: { updatedAt: now } },
      { upsert: true }
    );
  }
  console.log(`     contacts: ${CONTACTS.length} upserted`);

  const found = await contacts.find({ email: { $in: CONTACTS.map((c) => c.email) } }).toArray();
  const idByEmail = Object.fromEntries(found.map((c) => [c.email, c._id]));

  for (const g of GROUPS) {
    await groups.updateOne(
      { name: g.name },
      {
        $set: { name: g.name, contacts: g.emails.map((e) => idByEmail[e]), updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
  }
  console.log(`     groups: ${GROUPS.length} upserted`);
}

export async function down(db) {
  const contacts = db.collection("Contacts");
  const groups = db.collection("Groups");

  const groupResult = await groups.deleteMany({ name: { $in: GROUPS.map((g) => g.name) } });
  const contactResult = await contacts.deleteMany({
    email: { $in: CONTACTS.map((c) => c.email) },
  });

  console.log(
    `     removed ${groupResult.deletedCount} group(s), ${contactResult.deletedCount} contact(s)`
  );
}
