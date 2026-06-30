/**
 * Report definition registry.
 *
 * Add new definitions here. The `name` field must be unique — it is the key
 * used by the API to look up and run a report.
 *
 * Usage:
 *   POST /api/v1/reports/generate   { "name": "production-status" }
 */

import contractStatus90DayOutlook from "./contract-status-90-day-outlook.js";
import productionStatusReport from "./production-status.js";

const definitions = [productionStatusReport, contractStatus90DayOutlook];

const registry = Object.fromEntries(definitions.map((d) => [d.name, d]));

export function getDefinition(name) {
  return registry[name] ?? null;
}

export function listDefinitions() {
  return definitions.map(({ name }) => ({ name }));
}
