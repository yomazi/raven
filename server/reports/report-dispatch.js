/**
 * Routes a report name to whichever registry owns it — the snapshot
 * registry (definitions/index.js, one-off spreadsheets generated fresh each
 * run) or the live registry (live-reports/index.js, one persistent
 * spreadsheet updated in place) — so the rest of the reports module
 * (the API, the scheduler) doesn't need to know which kind a given name is.
 */

import { getDefinition, listDefinitions } from "./definitions/index.js";
import { getLiveDefinition, listLiveDefinitions } from "./live-reports/index.js";
import LiveReportService from "./live-reports/live-report.service.js";
import ReportService from "./reports.service.js";

export function resolveReport(name) {
  const snapshot = getDefinition(name);
  if (snapshot) return { kind: "snapshot", definition: snapshot };

  const live = getLiveDefinition(name);
  if (live) return { kind: "live", definition: live };

  return null;
}

export function listAllReports() {
  return [
    ...listDefinitions().map((d) => ({ ...d, kind: "snapshot" })),
    ...listLiveDefinitions().map((d) => ({ ...d, kind: "live" })),
  ];
}

// Normalizes a live report's result to the same shape generateReport()
// already returns, so callers (the API response, ReportSchedule.lastResult)
// don't need to branch on kind.
export async function runReportByName(name) {
  const resolved = resolveReport(name);
  if (!resolved) throw new Error(`No report definition found: "${name}"`);

  if (resolved.kind === "snapshot") {
    return ReportService.generateReport(resolved.definition);
  }

  const liveReport = await LiveReportService.ensure(name);
  return {
    spreadsheetId: liveReport.spreadsheetId,
    spreadsheetUrl: liveReport.spreadsheetUrl,
    showCount: liveReport.rows.length,
    title: resolved.definition.title,
  };
}
