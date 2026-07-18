/**
 * server/migrations/scripts/015_remove_contract_buyouts_and_ticket_prices.js
 *
 * Buyouts (production.hospitality/meals/accommodations/travel/backline) and
 * ticketPrices were briefly added to each contract in build.contracts[], but
 * those are venue-operational, not contract-specific, so they were removed
 * from the Contract schema in favor of the existing show-level fields
 * (ShowSchema.production / ShowSchema.ticketPrices). Any value already
 * written to a contract for these fields is orphaned data that's never read
 * anywhere. Removes it.
 *
 * Safe to re-run: the $or/$exists filter prevents touching documents already
 * clean.
 */

export async function up(db) {
  const shows = db.collection("Shows");

  const result = await shows.updateMany(
    {
      $or: [
        { "build.contracts.production.hospitality": { $exists: true } },
        { "build.contracts.production.meals": { $exists: true } },
        { "build.contracts.production.accommodations": { $exists: true } },
        { "build.contracts.production.travel": { $exists: true } },
        { "build.contracts.production.backline": { $exists: true } },
        { "build.contracts.ticketPrices": { $exists: true } },
      ],
    },
    {
      $unset: {
        "build.contracts.$[].production.hospitality": "",
        "build.contracts.$[].production.meals": "",
        "build.contracts.$[].production.accommodations": "",
        "build.contracts.$[].production.travel": "",
        "build.contracts.$[].production.backline": "",
        "build.contracts.$[].ticketPrices": "",
      },
    }
  );

  console.log(
    `     stray contract buyouts/ticketPrices removed from ${result.modifiedCount} show document(s)`
  );
}
