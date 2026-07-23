import { CONTRACT_STATUS } from "../../shared/constants/builds.js";
import log from "../logging/log.js";
import BookingSyncIssue from "../models/BookingSyncIssue.js";
import Show from "../models/Show.js";
import { CONTRACT_STATUS_COLORS } from "../reports/definitions/contract-status-90-day-shared.js";
import ReportRepository from "../reports/reports.repository.js";
import {
  conditionalFormatRuleRequest,
  deleteConditionalFormatRuleRequest,
  dropdownValidationRequest,
  insertDimensionRequest,
} from "../reports/sheets-request-builders.js";
import { BookingSpreadsheets } from "../utilities/constants.js";

// Per-sheet write lock — same pattern as live-report.service.js's withLock.
// Without it, two contracts on the same show (syncShowContracts loops over
// all of them) or two overlapping status changes racing each other can both
// try to delete-then-recreate the same 8 FEC color rules at once, and the
// second one fails outright ("No conditional format ... at index: 7") since
// the rules it read no longer match what's actually there by the time its
// own delete requests execute.
const locks = new Map();
function withLock(key, fn) {
  const prev = locks.get(key) ?? Promise.resolve();
  const run = () => fn();
  const next = prev.then(run, run).finally(() => {
    if (locks.get(key) === next) locks.delete(key);
  });
  locks.set(key, next);
  return next;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthSheetTitle(date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

// Matches the booking sheet's own date-column format exactly: no leading
// zeros, no year, weekday abbreviation ("Sat 8/1") — not the same as any
// Intl/toLocaleDateString output, so this is built by hand.
function sheetDateString(date) {
  return `${WEEKDAY_NAMES[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
}

// 0-based column index -> A1 letter(s).
function columnLetter(index) {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

// Accepts multiple candidate labels, tried in order — the FEC column is
// mid-rename across months (some tabs still say "FEC", others "Status",
// now that it holds the full status dropdown rather than a boolean) and a
// month can be renamed at any time without warning.
function findHeaderColumn(header, ...labels) {
  const targets = labels.map((l) => l.trim().toLowerCase());
  for (const target of targets) {
    const idx = header.findIndex((h) => (h ?? "").trim().toLowerCase() === target);
    if (idx !== -1) return idx;
  }
  return -1;
}

// Same construction the report engines use for their own hyperlinked cells
// (see buildCellValue in sheets-request-builders.js) — mirrors the existing
// HYPERLINK formula already on the Artist cell of a show's own row.
function buildHyperlinkFormula(url, text) {
  const safeText = String(text).replace(/"/g, '""');
  const safeUrl = String(url).replace(/"/g, '""');
  return `=HYPERLINK("${safeUrl}","${safeText}")`;
}

// One entry per data row (row 1 is the header), carrying its raw cells and
// 1-based sheet row number.
function buildRows(values) {
  return values.slice(1).map((row, idx) => ({
    sheetRow: idx + 2,
    raw: row,
  }));
}

async function loadShowAndContract(googleFolderId, contractId) {
  const show = await Show.findOne({ googleFolderId }).lean();
  if (!show) return null;
  const contract = show.build?.contracts?.find((c) => String(c._id) === String(contractId));
  if (!contract) return null;
  return { show, contract };
}

// Resolves a show date to {spreadsheetId, sheetId, sheetTitle, rowCount} —
// null if the year isn't a booking spreadsheet Raven knows about, or the
// expected month tab isn't there.
async function resolveSpreadsheetAndSheet(date) {
  const spreadsheetId = BookingSpreadsheets.byYear[date.getFullYear()];
  if (!spreadsheetId) return null;

  const sheetTitle = monthSheetTitle(date);
  const sheets = await ReportRepository.getSheetMetadata(spreadsheetId);
  const sheet = sheets.find((s) => s.title === sheetTitle);
  if (!sheet) {
    log.warn("booking-sheets", `No "${sheetTitle}" tab found in booking spreadsheet ${spreadsheetId}`);
    return null;
  }
  return { spreadsheetId, sheetTitle, sheetId: sheet.sheetId, rowCount: sheet.rowCount };
}

// The literal (non-inherited) Date+Artist row for a show — every calendar
// day gets exactly one of these, whether or not it has a show at all
// ("HOLD", "DARK", etc. share the same convention). The sheet's own Artist
// text is hand-typed and can drift from Raven's (e.g. "Bob Dylan Tribute"
// vs "A Tribute to Bob Dylan", or "Elizabeth Mitchell" vs "Elizabeth
// Mitchell (daytime)"), so an exact Date+Artist match is only the first of
// three fallbacks, each strictly safer than guessing:
//   1. Exact Date+Artist match.
//   2. Date alone, when exactly one row on the tab has that date — a date
//      shared by more than one row (e.g. a matinee and an evening show)
//      makes this ambiguous.
//   3. Among rows sharing that date, the one whose own Contract cell
//      already names this contract (targetSignee) — resolves the matinee/
//      evening case above when the Contract column happens to already be
//      filled in correctly even though the Artist column drifted.
// Anything left ambiguous after all three returns null rather than guess.
function findAnchorRow(rows, targetDate, targetArtist, targetSignee, contractColIndex) {
  const exact = rows.find(
    (r) =>
      (r.raw[0] ?? "").trim() === targetDate &&
      (r.raw[1] ?? "").trim().toLowerCase() === targetArtist.trim().toLowerCase()
  );
  if (exact) return exact;

  const dateRows = rows.filter((r) => (r.raw[0] ?? "").trim() === targetDate);
  if (dateRows.length === 1) return dateRows[0];
  if (dateRows.length === 0 || contractColIndex === -1) return null;

  const bySignee = dateRows.filter(
    (r) => (r.raw[contractColIndex] ?? "").trim().toLowerCase() === targetSignee.trim().toLowerCase()
  );
  return bySignee.length === 1 ? bySignee[0] : null;
}

// The rows belonging to one show's block: the anchor itself plus every
// following row up to (not including) the next row that starts a new date
// (i.e. has its own non-blank Date cell) — these are the "no date or show
// listed" sub-rows for the show's non-main contracts.
function subRowsAfter(rows, anchorRow) {
  const anchorIdx = rows.indexOf(anchorRow);
  const subRows = [];
  for (let i = anchorIdx + 1; i < rows.length; i++) {
    if ((rows[i].raw[0] ?? "").trim()) break;
    subRows.push(rows[i]);
  }
  return subRows;
}

// Finds the row for one contract. Per the sheet's own convention: the
// show's main contract lives directly on the Date+Artist row; every other
// contract for that show gets its own blank-Date/blank-Artist row
// underneath it, identified by the Contract cell (or, on older rows where
// that cell was never filled in, by the row's own Artist cell instead —
// e.g. an opener billed under its own name rather than a Contract label).
async function findMatchingRow(
  { spreadsheetId, sheetTitle, rowCount },
  { targetDate, targetArtist, targetSignee, isMainContract }
) {
  const range = `'${sheetTitle}'!A1:Z${rowCount}`;
  const values = await ReportRepository.getValues(spreadsheetId, range);
  if (values.length === 0) {
    return { fecColIndex: -1 };
  }

  const header = values[0];
  const fecColIndex = findHeaderColumn(header, "Status", "FEC");
  const contractColIndex = findHeaderColumn(header, "Contract");
  const hasContractColumn = contractColIndex !== -1;

  const rows = buildRows(values);
  const anchorRow = findAnchorRow(rows, targetDate, targetArtist, targetSignee, contractColIndex);

  if (!anchorRow) {
    return { fecColIndex, matched: null, reason: "no_match", candidateRowCount: 0, dateGroupFound: false };
  }

  if (isMainContract) {
    return { fecColIndex, matched: anchorRow, dateGroupFound: true, contractColIndex, hasContractColumn };
  }

  const subRows = subRowsAfter(rows, anchorRow);
  let candidates = hasContractColumn
    ? subRows.filter(
        (r) => (r.raw[contractColIndex] ?? "").trim().toLowerCase() === targetSignee.trim().toLowerCase()
      )
    : [];
  if (candidates.length === 0) {
    candidates = subRows.filter(
      (r) => (r.raw[1] ?? "").trim().toLowerCase() === targetSignee.trim().toLowerCase()
    );
  }

  if (candidates.length === 1) {
    return { fecColIndex, matched: candidates[0], dateGroupFound: true, anchorRow, subRows };
  }
  return {
    fecColIndex,
    matched: null,
    reason: candidates.length === 0 ? "no_match" : "ambiguous_match",
    candidateRowCount: candidates.length,
    dateGroupFound: true,
    anchorRow,
    subRows,
  };
}

// Unconditionally rebuilds the dropdown + per-value color rules on the FEC
// column on every call — deliberately NOT gated by "does it look already
// set up," because that check used to just count existing rules, and a
// mid-sheet row insertion (insertDimensionRequest, e.g. from addRowForIssue)
// doesn't change the rule count: Sheets splits each rule's range around the
// inserted row (excluding it) instead, so the count-based check kept
// declaring the column "already set up" even after a gap opened up around
// a newly inserted row, leaving it — and sometimes older rows a prior
// insertion had already split around — stuck on whatever validation/format
// they had before (observed in practice reverting to a stale checkbox).
// Rebuilding every time is cheap (this only runs on an actual contract
// status change, not a hot path) and is immune to that class of drift.
//
// Applying this to an old-format tab (still holding literal TRUE/FALSE text
// in other rows) will flag those other rows with Sheets' "value not in
// list" warning until they're touched — expected, called out in the plan,
// not a bug.
async function ensureFecDropdown(spreadsheetId, sheetId, colIndex, rowCount) {
  const existingRules = await ReportRepository.getConditionalFormatRules(spreadsheetId, sheetId);
  const staleIndices = existingRules
    .map((rule, idx) => ({ rule, idx }))
    .filter(({ rule }) => rule.ranges?.some((r) => r.sheetId === sheetId && r.startColumnIndex === colIndex))
    .map(({ idx }) => idx)
    .sort((a, b) => b - a); // highest index first — deleting shifts indices down otherwise

  const setupRequests = [
    ...staleIndices.map((idx) => deleteConditionalFormatRuleRequest(sheetId, idx)),
    dropdownValidationRequest(sheetId, colIndex, rowCount, CONTRACT_STATUS),
  ];
  await ReportRepository.batchUpdate(spreadsheetId, setupRequests);

  const colorRequests = CONTRACT_STATUS.map((status) =>
    conditionalFormatRuleRequest(sheetId, colIndex, status, CONTRACT_STATUS_COLORS[status])
  );
  await ReportRepository.batchUpdate(spreadsheetId, colorRequests);
}

async function upsertIssue({ googleFolderId, contractId, show, contract, resolvedSheet, matchResult }) {
  await BookingSyncIssue.findOneAndUpdate(
    { googleFolderId, contractId },
    {
      $set: {
        artist: show.artist,
        signee: contract.signee,
        date: show.date,
        reason: matchResult.reason,
        candidateRowCount: matchResult.candidateRowCount,
        dateGroupFound: matchResult.dateGroupFound,
        spreadsheetId: resolvedSheet.spreadsheetId,
        sheetTitle: resolvedSheet.sheetTitle,
        sheetGid: resolvedSheet.sheetId,
        resolved: false,
      },
    },
    { upsert: true }
  );
}

// Main entry point — subscribed to ShowsEvents' "status", "signee", and
// "membership" changes in index.js (see syncShowContracts for
// "isMainContract", which can affect more than one contract at once), and
// callable directly for the Contracts panel's manual "Sync" button. Returns
// a result object ({synced, reason?, ...}) so the manual path can report
// back what happened — the event-driven callers just ignore it.
async function syncContractStatus({ googleFolderId, contractId }) {
  const loaded = await loadShowAndContract(googleFolderId, contractId);
  if (!loaded) return { synced: false, reason: "not_found" };
  const { show, contract } = loaded;
  if (!show.date) return { synced: false, reason: "no_show_date" };
  // Archived contracts are excluded from the 90-day contract-status report
  // for the same reason (contract-status-90-day-shared.js) — a defunct
  // contract shouldn't push a status into the booking sheet.
  if (contract.archived) return { synced: false, reason: "archived" };

  const resolvedSheet = await resolveSpreadsheetAndSheet(new Date(show.date));
  if (!resolvedSheet) return { synced: false, reason: "no_spreadsheet_for_year" };

  return withLock(`${resolvedSheet.spreadsheetId}:${resolvedSheet.sheetTitle}`, async () => {
    const targetDate = sheetDateString(new Date(show.date));
    const matchResult = await findMatchingRow(resolvedSheet, {
      targetDate,
      targetArtist: show.artist,
      targetSignee: contract.signee,
      isMainContract: !!contract.isMainContract,
    });

    if (matchResult.fecColIndex === -1) {
      log.warn("booking-sheets", `No "FEC" column found on "${resolvedSheet.sheetTitle}" — skipping sync`);
      return { synced: false, reason: "no_status_column", sheetTitle: resolvedSheet.sheetTitle };
    }

    if (matchResult.matched) {
      await ensureFecDropdown(
        resolvedSheet.spreadsheetId,
        resolvedSheet.sheetId,
        matchResult.fecColIndex,
        resolvedSheet.rowCount
      );
      await ReportRepository.writeValues(
        resolvedSheet.spreadsheetId,
        [[contract.status]],
        `'${resolvedSheet.sheetTitle}'!${columnLetter(matchResult.fecColIndex)}${matchResult.matched.sheetRow}`
      );
      if (contract.isMainContract) {
        // The main contract's own row should name it in the Contract column
        // too (linked to its folder, same as the Artist cell links to the
        // show folder) — not just carry its FEC status anonymously.
        if (matchResult.hasContractColumn) {
          const contractCellValue = contract.folderId
            ? buildHyperlinkFormula(`https://drive.google.com/drive/folders/${contract.folderId}`, contract.signee)
            : contract.signee;
          await ReportRepository.writeValues(
            resolvedSheet.spreadsheetId,
            [[contractCellValue]],
            `'${resolvedSheet.sheetTitle}'!${columnLetter(matchResult.contractColIndex)}${matchResult.matched.sheetRow}`
          );
        }
        // Raven is the source of truth for the show's own name — the
        // Billing/Artist(s) cell is hand-typed and can drift from it (e.g.
        // "Bob Dylan Tribute" vs "A Tribute to Bob Dylan"). Rewritten every
        // sync so it can never stay out of sync, not just when the
        // date-only fallback in findAnchorRow had to kick in to find this
        // row in the first place.
        const artistCellValue = buildHyperlinkFormula(
          `https://drive.google.com/drive/folders/${googleFolderId}`,
          show.artist
        );
        await ReportRepository.writeValues(
          resolvedSheet.spreadsheetId,
          [[artistCellValue]],
          `'${resolvedSheet.sheetTitle}'!B${matchResult.matched.sheetRow}`
        );
      }
      await BookingSyncIssue.updateOne({ googleFolderId, contractId }, { $set: { resolved: true } });
      log.info("booking-sheets", `Synced status for ${show.artist} / ${contract.signee}`, {
        sheetTitle: resolvedSheet.sheetTitle,
        row: matchResult.matched.sheetRow,
        status: contract.status,
      });
      return {
        synced: true,
        sheetTitle: resolvedSheet.sheetTitle,
        row: matchResult.matched.sheetRow,
        status: contract.status,
      };
    }

    await upsertIssue({ googleFolderId, contractId, show, contract, resolvedSheet, matchResult });
    log.warn("booking-sheets", `Could not sync status for ${show.artist} / ${contract.signee}`, {
      reason: matchResult.reason,
    });
    return { synced: false, reason: matchResult.reason, sheetTitle: resolvedSheet.sheetTitle };
  });
}

// Toggling which contract is main is exclusive — Raven un-mains whichever
// contract previously had it atomically, in the same DB update, but only
// ever emits an event for the contract actually toggled (see
// ShowsService.setMainContract). That previously-main contract's row
// placement is just as stale as the newly-main one's, so an isMainContract
// change re-syncs every non-archived contract on the show rather than just
// the one named in the event.
async function syncShowContracts(googleFolderId) {
  const show = await Show.findOne({ googleFolderId }).lean();
  if (!show) return;
  const contracts = (show.build?.contracts ?? []).filter((c) => !c.archived);
  for (const contract of contracts) {
    await syncContractStatus({ googleFolderId, contractId: String(contract._id) });
  }
}

async function listUnresolvedIssues() {
  return BookingSyncIssue.find({ resolved: false }).sort({ date: 1 }).lean();
}

async function dismissIssue(issueId) {
  const issue = await BookingSyncIssue.findById(issueId);
  if (!issue) throw new Error("Booking sync issue not found");
  issue.resolved = true;
  await issue.save();
  return issue;
}

// Inserts a new blank-Date/blank-Artist sub-row for a secondary contract,
// writes its Contract cell (if the tab has one) and status, and marks the
// issue resolved. Only offered when the show's own Date+Artist row was
// found (see BookingSyncIssue.dateGroupFound) — every calendar day already
// has a row in these sheets, so a missing one means something unexpected is
// going on that shouldn't be auto-resolved.
async function addRowForIssue(issueId) {
  const issue = await BookingSyncIssue.findById(issueId);
  if (!issue) throw new Error("Booking sync issue not found");
  if (issue.resolved) throw new Error("Issue is already resolved");
  if (!issue.dateGroupFound) {
    throw new Error("The date row wasn't found in the sheet — add it there first, then dismiss and re-sync.");
  }

  const loaded = await loadShowAndContract(issue.googleFolderId, issue.contractId);
  if (!loaded) throw new Error("The show or contract this issue refers to no longer exists");
  const { show, contract } = loaded;

  const resolvedSheet = await resolveSpreadsheetAndSheet(new Date(show.date));
  if (!resolvedSheet) throw new Error("Could not re-resolve the booking spreadsheet/tab");

  await withLock(`${resolvedSheet.spreadsheetId}:${resolvedSheet.sheetTitle}`, async () => {
    const targetDate = sheetDateString(new Date(show.date));
    const range = `'${resolvedSheet.sheetTitle}'!A1:Z${resolvedSheet.rowCount}`;
    const values = await ReportRepository.getValues(resolvedSheet.spreadsheetId, range);
    const header = values[0] ?? [];
    const fecColIndex = findHeaderColumn(header, "Status", "FEC");
    const contractColIndex = findHeaderColumn(header, "Contract");
    if (fecColIndex === -1) throw new Error('No "FEC" column found on this tab');

    const rows = buildRows(values);
    // Note: uses this (non-main) contract's own signee only as the last-
    // resort disambiguator among same-date rows — it won't usually match
    // the anchor's Contract cell (that's the main contract's territory),
    // so this typically only helps when a prior sync already wrote it.
    const anchorRow = findAnchorRow(rows, targetDate, show.artist, contract.signee, contractColIndex);
    if (!anchorRow) throw new Error("The show's own Date+Artist row is no longer present in the sheet");

    // Add-row only ever applies to a secondary (non-main) contract — a main
    // contract either matches its show's own Date+Artist row directly or, if
    // that row is missing entirely, isn't offered add-row in the first place
    // (see the dateGroupFound check above; every calendar day already has a
    // row, so a missing one needs a manual fix, not an auto-inserted
    // duplicate date row). So this always inserts a new blank-Date/blank-
    // Artist sub-row right after the show's existing sub-rows (or right
    // after the anchor itself if this is its first).
    const subRows = subRowsAfter(rows, anchorRow);
    const lastRowOfGroup = subRows.length > 0 ? subRows[subRows.length - 1] : anchorRow;
    const insertAtGridIndex = lastRowOfGroup.sheetRow; // 0-based index of the row right after it
    const newRowNumber = lastRowOfGroup.sheetRow + 1;

    await ReportRepository.batchUpdate(resolvedSheet.spreadsheetId, [
      insertDimensionRequest(resolvedSheet.sheetId, insertAtGridIndex),
    ]);

    const fullRow = Array.from({ length: header.length }, () => "");
    fullRow[fecColIndex] = contract.status;
    if (contractColIndex !== -1) fullRow[contractColIndex] = contract.signee;

    await ensureFecDropdown(resolvedSheet.spreadsheetId, resolvedSheet.sheetId, fecColIndex, resolvedSheet.rowCount);
    await ReportRepository.writeValues(
      resolvedSheet.spreadsheetId,
      [fullRow],
      `'${resolvedSheet.sheetTitle}'!A${newRowNumber}`
    );
  });

  issue.resolved = true;
  await issue.save();
  return issue;
}

const BookingSheetsService = {
  syncContractStatus,
  syncShowContracts,
  listUnresolvedIssues,
  dismissIssue,
  addRowForIssue,
};

export default BookingSheetsService;
