import {
  CONTRACT_STATUS_HEADER_STYLE,
  contractStatus90DayColumns,
  contractStatus90DayFilter,
} from "../../definitions/contract-status-90-day-shared.js";

// Raven-owned, live-report-only — appended after the four shared columns
// from contractStatus90DayColumns.
const ROBIN_NOTES_COLUMN = {
  header: "Robin's notes",
  value: (show) => show._contract.comments ?? "",
  align: "LEFT",
  headerAlign: "LEFT",
  width: 300,
  wrap: true,
  protect: true,
};

// Freeform columns Freight staff comment in directly — Raven never writes to
// these except to preserve whatever's already there when it rewrites a row.
// A fixed width + wrap keeps these readable regardless of comment length;
// columns without an explicit width are auto-sized instead.
const COMMENT_COLUMNS = [
  { header: "Par's notes", width: 300, wrap: true },
  { header: "PC's notes", width: 300, wrap: true },
];

const contractStatus90DayLive = {
  name: "contract-status-90-day-live",

  // A live report is one persistent spreadsheet (not a new one per run), so
  // its title has no date stamp — it's also the filename Raven looks for
  // inside folderId before deciding to create a new spreadsheet.
  title: "Outstanding Contracts (90-Day Outlook)",

  // Which Drive folder to file the spreadsheet in comes from the "Reports
  // Folder ID" setting (test/prod), resolved at ensure()-time — see
  // LiveReportService.#findOrCreateSpreadsheet.
  settingsFolderKey: "reportsFolderId",

  // Same filter/row shape as the snapshot report — one row per active
  // contract for shows in the next 90 days.
  filter: contractStatus90DayFilter,
  rowKey: (show) => String(show._contract._id),

  ravenColumns: [...contractStatus90DayColumns, ROBIN_NOTES_COLUMN],
  commentColumns: COMMENT_COLUMNS,

  frozenRows: 1,
  headerStyle: CONTRACT_STATUS_HEADER_STYLE,
};

export default contractStatus90DayLive;
