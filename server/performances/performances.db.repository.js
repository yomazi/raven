const { google } = require("googleapis");

const drive = google.drive({ version: "v3", auth });

class PerformancesDriveRepository {
  static async getFolderChildren(folderId) {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      orderBy: "name",
    });

    return res.data.files;
  }
}

module.exports = PerformancesDriveRepository;
