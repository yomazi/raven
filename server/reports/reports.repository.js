import { google } from "googleapis";
import AuthService from "../auth/auth.service.js";

class ReportRepository {
  static async #getSheetsClient() {
    const auth = await AuthService.getGoogleClient();
    return google.sheets({ version: "v4", auth });
  }

  static async #getDriveClient() {
    const auth = await AuthService.getGoogleClient();
    return google.drive({ version: "v3", auth });
  }

  static async createSpreadsheet(title) {
    const sheets = await ReportRepository.#getSheetsClient();
    const response = await sheets.spreadsheets.create({
      requestBody: { properties: { title } },
    });
    return {
      spreadsheetId: response.data.spreadsheetId,
      spreadsheetUrl: response.data.spreadsheetUrl,
    };
  }

  static async moveToFolder(fileId, folderId) {
    const drive = await ReportRepository.#getDriveClient();
    const meta = await drive.files.get({
      fileId,
      fields: "parents",
      supportsAllDrives: true,
    });
    const prevParents = (meta.data.parents ?? []).join(",");
    await drive.files.update({
      fileId,
      addParents: folderId,
      removeParents: prevParents,
      supportsAllDrives: true,
      fields: "id, parents",
    });
  }

  // Write rows to a sheet. Uses USER_ENTERED so formulas (e.g. =HYPERLINK) are evaluated.
  static async writeValues(spreadsheetId, rows) {
    const sheets = await ReportRepository.#getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });
  }

  static async batchUpdate(spreadsheetId, requests) {
    if (!requests.length) return;
    const sheets = await ReportRepository.#getSheetsClient();
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  // Returns the pixel width of a column after auto-resize has been applied.
  static async getColumnWidth(spreadsheetId, sheetId, colIndex) {
    const sheets = await ReportRepository.#getSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.data.columnMetadata",
    });
    const metadata = response.data.sheets?.[sheetId]?.data?.[0]?.columnMetadata;
    return metadata?.[colIndex]?.pixelSize ?? null;
  }
}

export default ReportRepository;
