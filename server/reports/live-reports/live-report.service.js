import log from "../../logging/log.js";
import Show from "../../models/Show.js";
import LiveReport from "../../models/LiveReport.js";
import ReportRepository from "../reports.repository.js";
import {
  autoResizeColumnRequest,
  buildCellValue,
  clearDataValidationRequest,
  clearFormatRequest,
  columnFormatRequest,
  columnWidthRequest,
  conditionalFormatRuleRequest,
  deleteConditionalFormatRuleRequest,
  dropdownValidationRequest,
  dynamicCellFormatRequest,
  freezeRequest,
  headerCellAlignRequest,
  headerFormatRequest,
  protectedRangeRequest,
} from "../sheets-request-builders.js";
import { getLiveDefinition, listLiveDefinitions } from "./index.js";

// ---------------------------------------------------------------------------
// Per-report write lock — serializes reads/writes against a given live
// report's spreadsheet so two events firing close together can't race each
// other (read-then-write is not atomic).  In-process only: Raven runs as a
// single Node process, so a Map is sufficient — no external lock needed.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentEnvironment() {
  const env = process.env.LIVE_REPORTS_ENV ?? "test";
  if (env !== "test" && env !== "prod") {
    throw new Error(`LIVE_REPORTS_ENV must be "test" or "prod", got "${env}"`);
  }
  return env;
}

// 0 -> A, 25 -> Z, 26 -> AA, ...
function columnLetter(index) {
  let n = index;
  let letters = "";
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letters;
}

const AUTO_SIZE_PADDING_PX = 10;

function numColumns(definition) {
  return definition.ravenColumns.length + definition.commentColumns.length;
}

function header(definition) {
  return [
    ...definition.ravenColumns.map((c) => c.header),
    ...definition.commentColumns.map((c) => c.header),
  ];
}

// Comment columns can pin a fixed width (e.g. wrapped notes columns); raven
// columns always auto-size regardless of any stray `width` on them.
function autoSizableColumnIndices(definition) {
  const ravenIndices = definition.ravenColumns.map((_, i) => i);
  const commentIndices = definition.commentColumns
    .map((col, i) => ({ col, i: definition.ravenColumns.length + i }))
    .filter(({ col }) => col.width == null)
    .map(({ i }) => i);
  return [...ravenIndices, ...commentIndices];
}

async function fetchDesiredRows(definition) {
  const all = await Show.find({ deleted: { $ne: true } }).sort({ date: 1 }).lean();
  const filtered = definition.filter(all);
  return filtered.map((show) => ({
    rowKey: definition.rowKey(show),
    show,
    ravenValues: definition.ravenColumns.map((col) => buildCellValue(col, show)),
  }));
}

function dynamicColumns(definition) {
  return definition.ravenColumns
    .map((col, i) => ({ col, i }))
    .filter(({ col }) => col.background || col.textColor);
}

// Per-cell background/text-color requests for one row — values.update never
// touches formatting, so this has to be reissued any time a row's dynamic
// column (e.g. the status column's color) is written outside a full rewrite.
function dynamicFormattingRequestsForRow(definition, sheetId, rowIndex, show) {
  return dynamicColumns(definition)
    .map(({ col, i }) => {
      const bg = col.background ? col.background(show) : null;
      const fg = col.textColor ? col.textColor(show) : null;
      return dynamicCellFormatRequest(sheetId, i, rowIndex, bg, fg, null);
    })
    .filter(Boolean);
}

async function applyFormatting(definition, spreadsheetId, sheetId, rows) {
  const numCols = numColumns(definition);
  const rowCount = rows.length;
  const requests = [freezeRequest(sheetId, definition.frozenRows ?? 1, null)];
  requests.push(headerFormatRequest(sheetId, numCols, definition.headerStyle));

  definition.ravenColumns.forEach((col, i) => {
    const fmt = columnFormatRequest(sheetId, i, rowCount, col);
    if (fmt) requests.push(fmt);
    if (rowCount > 0) {
      requests.push(
        col.dropdown?.length
          ? dropdownValidationRequest(sheetId, i, rowCount, col.dropdown)
          : clearDataValidationRequest(sheetId, i, rowCount)
      );
    }
    // Overrides headerFormatRequest's uniform alignment for this one column —
    // must come after it in the same batch to win.
    if (col.headerAlign) {
      requests.push(headerCellAlignRequest(sheetId, i, col.headerAlign));
    }
  });

  definition.commentColumns.forEach((col, i) => {
    const colIndex = definition.ravenColumns.length + i;
    if (col.width != null) requests.push(columnWidthRequest(sheetId, colIndex, col.width));
    const fmt = columnFormatRequest(sheetId, colIndex, rowCount, col);
    if (fmt) requests.push(fmt);
  });

  rows.forEach((row, rowIdx) => {
    requests.push(...dynamicFormattingRequestsForRow(definition, sheetId, rowIdx, row.show));
  });

  await ReportRepository.batchUpdate(spreadsheetId, requests.filter(Boolean));

  // Auto-resize (+ a little breathing room) every column that isn't pinned
  // to a fixed width — run after the formatting pass so Sheets sizes against
  // styled text.
  await autoResizeAndPad(spreadsheetId, sheetId, definition);

  await ensureColumnProtections(definition, spreadsheetId, sheetId);
  await ensureConditionalFormatting(definition, spreadsheetId, sheetId);
}

// Locks down any raven column marked `protect: true` (e.g. the Status
// dropdown) so only the account Raven authenticates as can edit it, while
// leaving everything else in the sheet — including the comment columns —
// freely editable by whoever the spreadsheet is shared with. Idempotent:
// only adds a protection if one matching its description isn't already
// there, so this is safe to call on every rewrite.
async function ensureColumnProtections(definition, spreadsheetId, sheetId) {
  const protectedCols = definition.ravenColumns
    .map((col, i) => ({ col, i }))
    .filter(({ col }) => col.protect);
  if (protectedCols.length === 0) return;

  const existing = await ReportRepository.getProtectedRanges(spreadsheetId, sheetId);
  const existingDescriptions = new Set(existing.map((p) => p.description));
  const editorEmail = process.env.USER_EMAIL;

  const addRequests = protectedCols
    .filter(({ col }) => !existingDescriptions.has(`Locked: ${col.header}`))
    .map(({ col, i }) =>
      protectedRangeRequest(
        sheetId,
        { startRowIndex: 1, startColumnIndex: i, endColumnIndex: i + 1 },
        `Locked: ${col.header}`,
        editorEmail ? [editorEmail] : []
      )
    );

  if (addRequests.length > 0) {
    await ReportRepository.batchUpdate(spreadsheetId, addRequests);
  }
}

// Sets up one conditional-format rule per value in a column's
// `dropdownColors` map, so the cell's background follows its text value
// forever — evaluated by Sheets itself, with no involvement from Raven at
// all. This is what lets someone maintain the sheet by hand after Raven is
// gone: pick a new value in the dropdown, and the color updates on its own.
// Idempotent: no-ops once the expected rule count for a column is present;
// otherwise clears whatever's there for it and rebuilds from scratch (e.g.
// after the color map itself changes).
async function ensureConditionalFormatting(definition, spreadsheetId, sheetId) {
  const colorCols = definition.ravenColumns
    .map((col, i) => ({ col, i }))
    .filter(({ col }) => col.dropdownColors);
  if (colorCols.length === 0) return;

  const existingRules = await ReportRepository.getConditionalFormatRules(spreadsheetId, sheetId);
  const managedColIndices = new Set(colorCols.map(({ i }) => i));

  const relevantExisting = existingRules
    .map((rule, idx) => ({ rule, idx }))
    .filter(({ rule }) =>
      rule.ranges?.some((r) => r.sheetId === sheetId && managedColIndices.has(r.startColumnIndex))
    );

  const expectedCount = colorCols.reduce(
    (sum, { col }) => sum + Object.keys(col.dropdownColors).length,
    0
  );

  if (relevantExisting.length === expectedCount) return;

  // Delete highest index first — indices shift down as each is removed, so
  // deleting ascending would target the wrong rule partway through.
  const staleIndices = relevantExisting.map(({ idx }) => idx).sort((a, b) => b - a);
  if (staleIndices.length > 0) {
    await ReportRepository.batchUpdate(
      spreadsheetId,
      staleIndices.map((idx) => deleteConditionalFormatRuleRequest(sheetId, idx))
    );
  }

  const addRequests = colorCols.flatMap(({ col, i }) =>
    Object.entries(col.dropdownColors).map(([value, color]) =>
      conditionalFormatRuleRequest(sheetId, i, value, color)
    )
  );
  if (addRequests.length > 0) {
    await ReportRepository.batchUpdate(spreadsheetId, addRequests);
  }
}

async function autoResizeAndPad(spreadsheetId, sheetId, definition) {
  const indices = autoSizableColumnIndices(definition);
  if (indices.length === 0) return;

  await ReportRepository.batchUpdate(
    spreadsheetId,
    indices.map((i) => autoResizeColumnRequest(sheetId, i))
  );

  const paddingRequests = await Promise.all(
    indices.map(async (i) => {
      const currentWidth = await ReportRepository.getColumnWidth(spreadsheetId, sheetId, i);
      if (currentWidth == null) return null;
      return columnWidthRequest(sheetId, i, currentWidth + AUTO_SIZE_PADDING_PX);
    })
  );
  await ReportRepository.batchUpdate(spreadsheetId, paddingRequests.filter(Boolean));
}

// Native Sheets "Comment" threads are anchored to a fixed cell position, not
// to a row's data — since rewrites re-flow rows without doing real
// insert/delete-row operations, a comment left on a cell can end up looking
// attached to a different show/contract than whoever wrote it meant. Rather
// than try to track and re-anchor them, this report doesn't support them at
// all: strip any that show up so nothing is ever left misattributed.
async function stripNativeComments(spreadsheetId) {
  const comments = await ReportRepository.listComments(spreadsheetId);
  if (comments.length === 0) return;

  await Promise.all(comments.map((c) => ReportRepository.deleteComment(spreadsheetId, c.id)));
  log.warn(
    "liveReport",
    `Removed ${comments.length} native Sheets comment(s) — not supported on this report`,
    { spreadsheetId }
  );
}

// ---------------------------------------------------------------------------
// Live report service
// ---------------------------------------------------------------------------

class LiveReportService {
  // Ensures a live report has a spreadsheet for the current environment
  // (LIVE_REPORTS_ENV) — reusing one already tracked in Mongo, otherwise one
  // already sitting in the definition's Drive folder (by name), otherwise
  // creating a new one — then brings it fully up to date.
  static async ensure(reportName) {
    const definition = getLiveDefinition(reportName);
    if (!definition) throw new Error(`No live report definition found: "${reportName}"`);

    const environment = currentEnvironment();

    return withLock(`${reportName}:${environment}`, async () => {
      let liveReport = await LiveReport.findOne({ reportName, environment });

      if (!liveReport) {
        const folderId = definition.folderId[environment];
        const { spreadsheetId, spreadsheetUrl } = await LiveReportService.#findOrCreateSpreadsheet(
          definition,
          folderId
        );
        liveReport = new LiveReport({
          reportName,
          environment,
          spreadsheetId,
          spreadsheetUrl,
          sheetId: 0,
          rows: [],
        });
      }

      await LiveReportService.#fullRewrite(definition, liveReport);
      return liveReport;
    });
  }

  static async #findOrCreateSpreadsheet(definition, folderId) {
    const existing = await ReportRepository.findFileInFolder(folderId, definition.title);
    if (existing) return existing;

    const created = await ReportRepository.createSpreadsheet(definition.title);
    await ReportRepository.moveToFolder(created.spreadsheetId, folderId);
    return created;
  }

  static async getStatus(reportName) {
    const environment = currentEnvironment();
    return LiveReport.findOne({ reportName, environment }).lean();
  }

  // Subscribed to ShowsEvents.onChanged. Cheap to call often: every live
  // report definition is checked, but each one no-ops without touching the
  // Sheets API unless something it actually renders has changed.
  static async handleShowChanged(_event) {
    const environment = currentEnvironment();
    for (const { name } of listLiveDefinitions()) {
      const definition = getLiveDefinition(name);
      await withLock(`${name}:${environment}`, () =>
        LiveReportService.#syncDefinition(definition, environment)
      );
    }
  }

  static async #syncDefinition(definition, environment) {
    const liveReport = await LiveReport.findOne({ reportName: definition.name, environment });
    if (!liveReport) return; // not set up for this environment yet

    const desiredRows = await fetchDesiredRows(definition);
    const desiredKeys = new Set(desiredRows.map((r) => r.rowKey));
    const cachedKeys = new Set(liveReport.rows.map((r) => r.rowKey));

    const membershipChanged =
      desiredKeys.size !== cachedKeys.size || [...desiredKeys].some((k) => !cachedKeys.has(k));

    if (membershipChanged) {
      await LiveReportService.#fullRewrite(definition, liveReport, desiredRows);
      return;
    }

    const cachedByKey = new Map(liveReport.rows.map((r) => [r.rowKey, r]));
    let changedAny = false;

    for (const desired of desiredRows) {
      const cached = cachedByKey.get(desired.rowKey);
      const cachedRaven = cached.values.slice(0, definition.ravenColumns.length);
      const unchanged = cachedRaven.length === desired.ravenValues.length &&
        cachedRaven.every((v, i) => v === desired.ravenValues[i]);
      if (unchanged) continue;

      changedAny = true;
      await LiveReportService.#updateSingleRow(definition, liveReport, desired);
    }

    if (changedAny) {
      liveReport.lastSyncedAt = new Date();
      await liveReport.save();
    }
  }

  // Value-only update: read the row's current comment cells first so we
  // never clobber something staff typed in since our cache was last synced.
  static async #updateSingleRow(definition, liveReport, desired) {
    const rowIndex = liveReport.rows.findIndex((r) => r.rowKey === desired.rowKey);
    if (rowIndex === -1) return;

    await stripNativeComments(liveReport.spreadsheetId);

    const sheetRow = rowIndex + 2; // +1 for header row, +1 for 1-indexing
    const numCols = numColumns(definition);
    const range = `A${sheetRow}:${columnLetter(numCols - 1)}${sheetRow}`;

    const [currentRow = []] = await ReportRepository.getValues(liveReport.spreadsheetId, range);
    const comments = definition.commentColumns.map(
      (_, i) => currentRow[definition.ravenColumns.length + i] ?? ""
    );

    const newValues = [...desired.ravenValues, ...comments];
    await ReportRepository.writeValues(liveReport.spreadsheetId, [newValues], range);

    const formattingRequests = dynamicFormattingRequestsForRow(
      definition,
      liveReport.sheetId ?? 0,
      rowIndex,
      desired.show
    );
    if (formattingRequests.length > 0) {
      await ReportRepository.batchUpdate(liveReport.spreadsheetId, formattingRequests);
    }

    // Keep every non-fixed-width column sized to fit — new/changed text can
    // be longer or shorter than what was there before.
    await autoResizeAndPad(liveReport.spreadsheetId, liveReport.sheetId ?? 0, definition);

    liveReport.rows[rowIndex].values = newValues;
  }

  // Rebuilds the whole sheet from Mongo. Reads whatever's currently in the
  // sheet first so existing comment columns survive for rows that are
  // staying; new rows get blank comments, removed rows are dropped.
  static async #fullRewrite(definition, liveReport, desiredRows = null) {
    const rows = desiredRows ?? (await fetchDesiredRows(definition));
    const numCols = numColumns(definition);
    const sheetId = liveReport.sheetId ?? 0;
    const previousRowCount = liveReport.rows.length;

    // Strip before any row-shifting so nothing sits around long enough to
    // end up anchored to a different show/contract than whoever wrote it.
    await stripNativeComments(liveReport.spreadsheetId);

    // Ground-truth check against the sheet itself (not our own cache) for
    // whether the comment columns were redefined (e.g. swapping department
    // columns for named ones) — if so, old freeform text at a given position
    // no longer means the same thing, so don't carry it over.
    const expectedCommentHeaders = definition.commentColumns.map((c) => c.header);
    let columnsChanged = false;
    if (previousRowCount > 0) {
      const [actualHeaderRow = []] = await ReportRepository.getValues(
        liveReport.spreadsheetId,
        "A1:ZZ1"
      ).catch(() => [[]]);
      const actualCommentHeaders = actualHeaderRow.slice(definition.ravenColumns.length);
      columnsChanged =
        actualCommentHeaders.length !== expectedCommentHeaders.length ||
        expectedCommentHeaders.some((h, i) => actualCommentHeaders[i] !== h);
    }

    const existingCommentsByKey = new Map();
    if (!columnsChanged && previousRowCount > 0) {
      const lastRow = previousRowCount + 1;
      const range = `A2:${columnLetter(numCols - 1)}${lastRow}`;
      const currentValues = await ReportRepository.getValues(liveReport.spreadsheetId, range).catch(
        () => []
      );
      liveReport.rows.forEach((cached, i) => {
        const liveRow = currentValues[i] ?? cached.values;
        existingCommentsByKey.set(cached.rowKey, liveRow.slice(definition.ravenColumns.length));
      });
    }

    const dataRows = rows.map((r) => {
      const comments =
        existingCommentsByKey.get(r.rowKey) ?? definition.commentColumns.map(() => "");
      return [...r.ravenValues, ...comments];
    });

    await ReportRepository.writeValues(
      liveReport.spreadsheetId,
      [header(definition), ...dataRows],
      "A1"
    );

    // Blank out (values + formatting) anything left over from a previous,
    // larger sheet that the write above didn't reach.
    const maxRowCount = Math.max(previousRowCount, rows.length);
    const formatClearRequests = [];

    if (maxRowCount > rows.length) {
      const clearFrom = rows.length + 2;
      const clearTo = maxRowCount + 1;
      const blank = Array.from({ length: clearTo - clearFrom + 1 }, () => Array(numCols).fill(""));
      await ReportRepository.writeValues(
        liveReport.spreadsheetId,
        blank,
        `A${clearFrom}:${columnLetter(numCols - 1)}${clearTo}`
      );
      formatClearRequests.push(clearFormatRequest(sheetId, clearFrom - 1, clearTo, 0, numCols));
    }

    // Extra trailing columns from a previous, wider layout (e.g. this
    // report's comment columns being redefined) — clear a generous buffer
    // past the current layout unconditionally rather than trying to work
    // out exactly how wide the old layout was.
    const COLUMN_CLEAR_BUFFER = 10;
    const clearRowCount = Math.max(maxRowCount + 1, 1);
    const blankCols = Array.from({ length: clearRowCount }, () =>
      Array(COLUMN_CLEAR_BUFFER).fill("")
    );
    await ReportRepository.writeValues(
      liveReport.spreadsheetId,
      blankCols,
      `${columnLetter(numCols)}1:${columnLetter(numCols + COLUMN_CLEAR_BUFFER - 1)}${clearRowCount}`
    );
    formatClearRequests.push(
      clearFormatRequest(sheetId, 0, clearRowCount, numCols, numCols + COLUMN_CLEAR_BUFFER)
    );

    if (formatClearRequests.length > 0) {
      await ReportRepository.batchUpdate(liveReport.spreadsheetId, formatClearRequests);
    }

    liveReport.rows = rows.map((r, i) => ({ rowKey: r.rowKey, values: dataRows[i] }));
    liveReport.sheetId = sheetId;
    liveReport.lastSyncedAt = new Date();
    await liveReport.save();

    await applyFormatting(definition, liveReport.spreadsheetId, sheetId, rows);
  }
}

export default LiveReportService;
