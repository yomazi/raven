import Show from "../models/Show.js";
import ReportRepository from "./reports.repository.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function resolve(val, ...args) {
  return typeof val === "function" ? val(...args) : val;
}

// Build the cell value string for one column/show pair.
// Returns a HYPERLINK formula when col.hyperlink is defined and returns a URL.
function buildCellValue(col, show) {
  let text;
  if (col.value) {
    text = col.value(show);
  } else if (col.key) {
    text = getNestedValue(show, col.key);
  } else {
    text = "";
  }

  if (text == null) text = "";

  // Dates: return as-is so Google Sheets can receive a serial number via
  // USER_ENTERED if desired, otherwise just serialize to a locale string.
  if (text instanceof Date) {
    text = text.toLocaleDateString("en-US");
  }

  if (col.hyperlink) {
    const url = col.hyperlink(show);
    if (url) {
      const safeText = String(text).replace(/"/g, '""');
      const safeUrl = String(url).replace(/"/g, '""');
      return `=HYPERLINK("${safeUrl}","${safeText}")`;
    }
  }

  return text;
}

// ---------------------------------------------------------------------------
// Sheets batchUpdate request builders
// ---------------------------------------------------------------------------

function freezeRequest(sheetId, frozenRowCount, frozenColumnCount) {
  const gridProperties = {};
  const fields = [];
  if (frozenRowCount != null) { gridProperties.frozenRowCount = frozenRowCount; fields.push("gridProperties.frozenRowCount"); }
  if (frozenColumnCount != null) { gridProperties.frozenColumnCount = frozenColumnCount; fields.push("gridProperties.frozenColumnCount"); }
  return {
    updateSheetProperties: {
      properties: { sheetId, gridProperties },
      fields: fields.join(","),
    },
  };
}

function columnWidthRequest(sheetId, colIndex, pixelSize) {
  return {
    updateDimensionProperties: {
      range: { sheetId, dimension: "COLUMNS", startIndex: colIndex, endIndex: colIndex + 1 },
      properties: { pixelSize },
      fields: "pixelSize",
    },
  };
}

function autoResizeColumnRequest(sheetId, colIndex) {
  return {
    autoResizeDimensions: {
      dimensions: { sheetId, dimension: "COLUMNS", startIndex: colIndex, endIndex: colIndex + 1 },
    },
  };
}

function headerFormatRequest(sheetId, colCount, headerStyle = {}) {
  const {
    bold = true,
    background = { red: 0.2, green: 0.2, blue: 0.2 },
    foreground = null,
    align = "CENTER",
  } = headerStyle;

  const textFormat = { bold };
  const fields = ["backgroundColor", "textFormat.bold", "horizontalAlignment"];

  if (foreground) {
    textFormat.foregroundColor = foreground;
    fields.push("textFormat.foregroundColor");
  }

  return {
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: colCount },
      cell: {
        userEnteredFormat: {
          backgroundColor: background,
          textFormat,
          horizontalAlignment: align,
        },
      },
      fields: `userEnteredFormat(${fields.join(",")})`,
    },
  };
}

function columnFormatRequest(sheetId, colIndex, rowCount, col) {
  const format = {};
  const fields = [];

  if (col.align) {
    format.horizontalAlignment = col.align.toUpperCase();
    fields.push("horizontalAlignment");
  }
  if (col.wrap != null) {
    format.wrapStrategy = col.wrap ? "WRAP" : "CLIP";
    fields.push("wrapStrategy");
  }
  if (col.dateFormat) {
    format.numberFormat = { type: "DATE", pattern: col.dateFormat };
    fields.push("numberFormat");
  }
  if (col.bold || col.italic) {
    format.textFormat = { bold: !!col.bold, italic: !!col.italic };
    fields.push("textFormat");
  }

  if (!fields.length) return null;

  return {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: rowCount + 1,
        startColumnIndex: colIndex,
        endColumnIndex: colIndex + 1,
      },
      cell: { userEnteredFormat: format },
      fields: `userEnteredFormat(${fields.join(",")})`,
    },
  };
}

function dropdownValidationRequest(sheetId, colIndex, rowCount, values) {
  return {
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: rowCount + 1,
        startColumnIndex: colIndex,
        endColumnIndex: colIndex + 1,
      },
      rule: {
        condition: {
          type: "ONE_OF_LIST",
          values: values.map((v) => ({ userEnteredValue: String(v) })),
        },
        strict: false,
        showCustomUi: true,
      },
    },
  };
}

// Builds a repeatCell request for dynamic per-cell formatting.
// bg: {red,green,blue} | null
// fg: {red,green,blue} | null  (text color)
// textFormat: {bold, italic, ...} | null  (merged with fg if both present)
function dynamicCellFormatRequest(sheetId, colIndex, rowIndex, bg, fg, textFormat) {
  const format = {};
  const fields = [];

  if (bg) {
    format.backgroundColor = bg;
    fields.push("backgroundColor");
  }

  const resolvedTextFormat = { ...(textFormat ?? {}), ...(fg ? { foregroundColor: fg } : {}) };
  if (Object.keys(resolvedTextFormat).length) {
    format.textFormat = resolvedTextFormat;
    fields.push("textFormat");
  }

  if (!fields.length) return null;

  return {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: rowIndex + 1,
        endRowIndex: rowIndex + 2,
        startColumnIndex: colIndex,
        endColumnIndex: colIndex + 1,
      },
      cell: { userEnteredFormat: format },
      fields: `userEnteredFormat(${fields.join(",")})`,
    },
  };
}

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
