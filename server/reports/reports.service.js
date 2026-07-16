import Show from "../models/Show.js";
import ReportRepository from "./reports.repository.js";
import {
  autoResizeColumnRequest,
  buildCellValue,
  columnFormatRequest,
  columnWidthRequest,
  dropdownValidationRequest,
  dynamicCellFormatRequest,
  freezeRequest,
  headerFormatRequest,
  resolve,
} from "./sheets-request-builders.js";

// ---------------------------------------------------------------------------
// Report service
// ---------------------------------------------------------------------------

class ReportService {
  /**
   * Generate a Google Spreadsheet from a ReportDefinition.
   *
   * ReportDefinition shape:
   * {
   *   name: string,
   *   folderId: string | () => string,
   *   title: string | (now: Date) => string,
   *   filter: object | (shows: object[]) => object[],   // mongo query or post-fetch fn
   *   sort: object,                                      // mongoose sort (ignored when filter is a function)
   *   frozenRows: number,                               // default 1
   *   headerStyle: { bold, background, foreground, align },
   *   columns: ColumnDefinition[],
   * }
   *
   * ColumnDefinition shape:
   * {
   *   header: string,
   *   key: string,                          // dot-notation path into show doc
   *   value: (show) => any,                 // overrides key when present
   *   hyperlink: (show) => string | null,   // wraps value in =HYPERLINK formula
   *   dropdown: string[],                   // data-validation dropdown values for entire column
   *   width: number,                        // column width in pixels
   *   bold: boolean,
   *   italic: boolean,
   *   align: 'LEFT' | 'CENTER' | 'RIGHT',
   *   wrap: boolean,
   *   dateFormat: string,                   // e.g. 'M/d/yyyy'
   *   background: (show) => {red,green,blue} | null,
   *   textColor: (show) => {red,green,blue} | null,
   * }
   */
  static async generateReport(definition) {
    const {
      folderId,
      title,
      filter,
      sort = { date: 1 },
      columns,
      frozenRows = 1,
      frozenColumns,
      headerStyle,
    } = definition;

    const resolvedFolderId = resolve(folderId);
    const resolvedTitle = resolve(title, new Date());

    // 1. Fetch shows
    let shows;
    if (typeof filter === "function") {
      const all = await Show.find({ deleted: { $ne: true } }).sort({ date: 1 }).lean();
      shows = filter(all);
    } else {
      const query = { deleted: { $ne: true }, ...(filter ?? {}) };
      shows = await Show.find(query).sort(sort).lean();
    }

    // 2. Create spreadsheet & move to target folder
    const { spreadsheetId, spreadsheetUrl } = await ReportRepository.createSpreadsheet(resolvedTitle);
    await ReportRepository.moveToFolder(spreadsheetId, resolvedFolderId);

    // 3. Build and write rows
    const headerRow = columns.map((col) => col.header);
    const dataRows = shows.map((show) => columns.map((col) => buildCellValue(col, show)));
    await ReportRepository.writeValues(spreadsheetId, [headerRow, ...dataRows]);

    // 4. Build formatting requests
    const sheetId = 0;
    const rowCount = shows.length;
    const requests = [];

    requests.push(freezeRequest(sheetId, frozenRows, frozenColumns));
    requests.push(headerFormatRequest(sheetId, columns.length, headerStyle));

    const autoWidthCols = [];

    columns.forEach((col, i) => {
      if (col.autoWidth) {
        autoWidthCols.push({ col, i });
      } else if (col.width != null) {
        requests.push(columnWidthRequest(sheetId, i, col.width));
      }
      const fmt = columnFormatRequest(sheetId, i, rowCount, col);
      if (fmt) requests.push(fmt);

      if (col.dropdown?.length) {
        requests.push(dropdownValidationRequest(sheetId, i, rowCount, col.dropdown));
      }
    });

    // Dynamic per-cell colors — only iterate if any column uses them
    const dynamicCols = columns
      .map((col, i) => ({ col, i }))
      .filter(({ col }) => col.background || col.textColor || col.cellFormat);

    if (dynamicCols.length > 0) {
      shows.forEach((show, rowIdx) => {
        for (const { col, i } of dynamicCols) {
          const bg = col.background ? col.background(show) : null;
          const fg = col.textColor ? col.textColor(show) : null;
          const fmt = col.cellFormat ? col.cellFormat(show) : null;
          const req = dynamicCellFormatRequest(sheetId, i, rowIdx, bg, fg, fmt);
          if (req) requests.push(req);
        }
      });
    }

    // Pass 1: all formatting except auto-resize
    await ReportRepository.batchUpdate(spreadsheetId, requests);

    // Pass 2: auto-resize — must run after formatting so Sheets sizes against styled content
    if (autoWidthCols.length > 0) {
      await ReportRepository.batchUpdate(
        spreadsheetId,
        autoWidthCols.map(({ i }) => autoResizeColumnRequest(sheetId, i))
      );
    }

    // Second pass: apply autoWidthPadding for columns that requested it.
    // Must happen after the first batchUpdate so auto-resize has already run.
    const paddingCols = columns.map((col, i) => ({ col, i })).filter(({ col }) => col.autoWidth && col.autoWidthPadding);
    if (paddingCols.length > 0) {
      const paddingRequests = await Promise.all(
        paddingCols.map(async ({ col, i }) => {
          const currentWidth = await ReportRepository.getColumnWidth(spreadsheetId, sheetId, i);
          if (currentWidth == null) return null;
          return columnWidthRequest(sheetId, i, currentWidth + col.autoWidthPadding);
        })
      );
      await ReportRepository.batchUpdate(spreadsheetId, paddingRequests.filter(Boolean));
    }

    return { spreadsheetId, spreadsheetUrl, showCount: rowCount, title: resolvedTitle };
  }
}

export default ReportService;
