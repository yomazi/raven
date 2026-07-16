/**
 * Live report definition registry — same shape as ../definitions/index.js,
 * but for reports that update an existing spreadsheet in place instead of
 * generating a new one on a schedule.
 *
 * Add new live report definitions here.
 */

import contractStatus90DayLive from "./definitions/contract-status-90-day-live.js";

const definitions = [contractStatus90DayLive];

const registry = Object.fromEntries(definitions.map((d) => [d.name, d]));

export function getLiveDefinition(name) {
  return registry[name] ?? null;
}

export function listLiveDefinitions() {
  return definitions.map(({ name }) => ({ name }));
}
