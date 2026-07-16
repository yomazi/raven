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

  // Looks for an existing (non-trashed) spreadsheet with this exact name
  // directly inside the given folder. Used so re-attaching a live report
  // after a Mongo reset finds its old spreadsheet instead of creating a
  // duplicate.
  static async findFileInFolder(folderId, name) {
    const drive = await ReportRepository.#getDriveClient();
    const escapedName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const response = await drive.files.list({
      q: `'${folderId}' in parents and name = '${escapedName}' and trashed = false`,
      fields: "files(id, name, webViewLink)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const file = response.data.files?.[0];
    return file ? { spreadsheetId: file.id, spreadsheetUrl: file.webViewLink } : null;
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
  static async writeValues(spreadsheetId, rows, range = "A1") {
    const sheets = await ReportRepository.#getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });
  }

  // Read current cell values back out of a sheet (e.g. to capture staff
  // comments before overwriting Raven-owned columns).
  static async getValues(spreadsheetId, range) {
    const sheets = await ReportRepository.#getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values ?? [];
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

  // Existing protected ranges on one sheet — used to avoid re-adding a
  // protection that's already in place.
  static async getProtectedRanges(spreadsheetId, sheetId) {
    const sheets = await ReportRepository.#getSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets(properties.sheetId,protectedRanges(description,range))",
    });
    const sheet = response.data.sheets?.find((s) => s.properties.sheetId === sheetId);
    return sheet?.protectedRanges ?? [];
  }

  // Native Google Sheets "Comment" threads (Drive-level, anchored to a fixed
  // cell position) — distinct from cell values and from protected ranges.
  static async listComments(fileId) {
    const drive = await ReportRepository.#getDriveClient();
    const comments = [];
    let pageToken;
    do {
      const response = await drive.comments.list({
        fileId,
        fields: "nextPageToken,comments(id)",
        pageSize: 100,
        pageToken,
      });
      comments.push(...(response.data.comments ?? []));
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
    return comments;
  }

  static async deleteComment(fileId, commentId) {
    const drive = await ReportRepository.#getDriveClient();
    await drive.comments.delete({ fileId, commentId });
  }

  // Existing conditional format rules on one sheet — used to avoid
  // duplicating rules that are already correctly in place.
  static async getConditionalFormatRules(spreadsheetId, sheetId) {
    const sheets = await ReportRepository.#getSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets(properties.sheetId,conditionalFormats)",
    });
    const sheet = response.data.sheets?.find((s) => s.properties.sheetId === sheetId);
    return sheet?.conditionalFormats ?? [];
  }
}

export default ReportRepository;
