// Shared Sheets API value/formatting helpers, used by both the snapshot
// report engine (reports.service.js) and the live report engine
// (live-reports/live-report.service.js).

function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function resolve(val, ...args) {
  return typeof val === "function" ? val(...args) : val;
}

// Build the cell value string for one column/show pair.
// Returns a HYPERLINK formula when col.hyperlink is defined and returns a URL.
export function buildCellValue(col, show) {
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

export function freezeRequest(sheetId, frozenRowCount, frozenColumnCount) {
  const gridProperties = {};
  const fields = [];
  if (frozenRowCount != null) {
    gridProperties.frozenRowCount = frozenRowCount;
    fields.push("gridProperties.frozenRowCount");
  }
  if (frozenColumnCount != null) {
    gridProperties.frozenColumnCount = frozenColumnCount;
    fields.push("gridProperties.frozenColumnCount");
  }
  return {
    updateSheetProperties: {
      properties: { sheetId, gridProperties },
      fields: fields.join(","),
    },
  };
}

export function columnWidthRequest(sheetId, colIndex, pixelSize) {
  return {
    updateDimensionProperties: {
      range: { sheetId, dimension: "COLUMNS", startIndex: colIndex, endIndex: colIndex + 1 },
      properties: { pixelSize },
      fields: "pixelSize",
    },
  };
}

// Resets cell formatting (background color, text format, etc.) back to
// default. Needed because values.update never touches formatting — a row
// that shrinks out of the sheet keeps its old color unless this is used too.
export function clearFormatRequest(sheetId, startRowIndex, endRowIndex, startColumnIndex, endColumnIndex) {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex, endRowIndex, startColumnIndex, endColumnIndex },
      cell: { userEnteredFormat: {} },
      fields: "userEnteredFormat",
    },
  };
}

// endIndex defaults to a single column (startIndex + 1); pass an explicit
// endIndex to auto-resize a whole range of columns in one request.
export function autoResizeColumnRequest(sheetId, startIndex, endIndex = startIndex + 1) {
  return {
    autoResizeDimensions: {
      dimensions: { sheetId, dimension: "COLUMNS", startIndex, endIndex },
    },
  };
}

export function headerFormatRequest(sheetId, colCount, headerStyle = {}) {
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

// Overrides just the horizontal alignment of one header cell — issue after
// headerFormatRequest in the same batchUpdate so this wins for that column.
export function headerCellAlignRequest(sheetId, colIndex, align) {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: colIndex, endColumnIndex: colIndex + 1 },
      cell: { userEnteredFormat: { horizontalAlignment: align.toUpperCase() } },
      fields: "userEnteredFormat.horizontalAlignment",
    },
  };
}

export function columnFormatRequest(sheetId, colIndex, rowCount, col) {
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

export function dropdownValidationRequest(sheetId, colIndex, rowCount, values) {
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

// Omitting `rule` clears any existing data validation on the range — needed
// when a column stops wanting a dropdown, since setting `col.dropdown` to
// undefined only stops re-adding one; it doesn't remove one already applied.
export function clearDataValidationRequest(sheetId, colIndex, rowCount) {
  return {
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: rowCount + 1,
        startColumnIndex: colIndex,
        endColumnIndex: colIndex + 1,
      },
    },
  };
}

// A conditional-format rule Sheets evaluates itself, live, forever — the
// cell's background follows its text value even if nothing (not even Raven)
// ever writes to the sheet again. Range is left row-unbounded (no
// endRowIndex) so it automatically covers rows added after this is set up.
export function conditionalFormatRuleRequest(sheetId, colIndex, textValue, backgroundColor, index = 0) {
  return {
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: colIndex, endColumnIndex: colIndex + 1 }],
        booleanRule: {
          condition: {
            type: "TEXT_EQ",
            values: [{ userEnteredValue: String(textValue) }],
          },
          format: { backgroundColor },
        },
      },
      index,
    },
  };
}

export function deleteConditionalFormatRuleRequest(sheetId, index) {
  return { deleteConditionalFormatRule: { sheetId, index } };
}

// Builds a repeatCell request for dynamic per-cell formatting.
// bg: {red,green,blue} | null
// fg: {red,green,blue} | null  (text color)
// textFormat: {bold, italic, ...} | null  (merged with fg if both present)
export function dynamicCellFormatRequest(sheetId, colIndex, rowIndex, bg, fg, textFormat) {
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

// Restricts editing of a range to the given editor emails only (e.g. so
// Freight staff can comment in other columns but can't touch a status
// dropdown). range fields not set (e.g. endRowIndex) are left unbounded —
// per the Sheets API, that means "to the end of the sheet," so a range
// covering all future rows doesn't need to be re-issued as rows are added.
export function protectedRangeRequest(sheetId, range, description, editorEmails = []) {
  return {
    addProtectedRange: {
      protectedRange: {
        range: { sheetId, ...range },
        description,
        warningOnly: false,
        editors: { users: editorEmails },
      },
    },
  };
}

// Inserts one blank row at rowIndex (0-based, sheet-relative), pushing
// everything at/after it down — used by the booking-sheet "add row"
// resolution to add a new contract row within an existing date group.
// inheritFromBefore: false keeps the new row unformatted rather than
// copying the row above it, since the inserted row's own values (written
// separately via writeValues) determine its look via the dropdown/
// conditional-format rules already on the column.
export function insertDimensionRequest(sheetId, rowIndex) {
  return {
    insertDimension: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: rowIndex,
        endIndex: rowIndex + 1,
      },
      inheritFromBefore: false,
    },
  };
}

export { resolve };
