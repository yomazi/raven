export const ProgrammingDrive = {
  FolderIds: {
    PERFORMANCE_CONTRACTS_ROOT: "1boacqKK3Tu2kndDTAoGXVsnPMoqNzZL2",
  },
  SpreadsheetIds: {
    SETTLEMENT_WORKBOOK_TEMPLATE: "1v4suN4AuoDuVcdgViBI22hN43POWye7aheHRtEhSvy0",
    SETTLEMENT_WORKBOOK_TEMPLATE_MOTH: "1bQIqDNJbUx9yna9mb-nGDs5DfHothFPoFxsM6L0VCTU",
  },
};

// The Freight's hand-maintained booking spreadsheets, one per year. New
// years are created by hand — add the new ID here when that happens. 2025
// is intentionally not registered: Raven doesn't sync against it.
export const BookingSpreadsheets = {
  byYear: {
    2026: "1cXQti1AnjjnDOSduaTmaaB2cjreGoyqwru65zqygba8",
    2027: "1wJAWTx3eT7_js9ZFOlZyvEysQ6XG6fZqFd-1UfeHrzk",
  },
};
export const USER_EMAIL = process.env.USER_EMAIL || "";
export const API_TOKEN_LENGTH = Number(process.env.API_TOKEN_LENGTH);
export const VITE_CONFIG_FILE = "../client/vite.config.js";
