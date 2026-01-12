// ./repositories/googleDrive.repository.js
const { google } = require("googleapis");
const AuthService = require("../auth/auth.service.js");

// create an oauth client with the proper tokens so we can access Google Drive
const client = await AuthService.getGoogleClient();
const drive = google.drive({ version: "v3", auth: client });

// Recursively list subfolders of a folder
async function listFolders(folderId) {
  const folders = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "nextPageToken, files(id, name)",
      pageToken,
    });

    folders.push(...res.data.files);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return folders;
}

class ShowsRepositoryDrive {
  // Extract shows recursively
  static async scrapeShows(rootFolderId) {
    const shows = [];

    const yearFolders = await listFolders(rootFolderId);
    for (const yearFolder of yearFolders) {
      if (!/\d{4} Program/.test(yearFolder.name)) continue;

      const monthFolders = await listFolders(yearFolder.id);
      for (const monthFolder of monthFolders) {
        if (!/\d{4}-\d{2} \w+/.test(monthFolder.name)) continue;

        const showFolders = await listFolders(monthFolder.id);
        for (const showFolder of showFolders) {
          const match = showFolder.name.match(/^(\d{2}-\d{2}-\d{2}) (.+?)( \(multi\))?$/);
          if (!match) continue;

          const [, , artistName, multiFlag] = match;

          shows.push({
            googleFolderId: showFolder.id,
            artistName,
            isMulti: !!multiFlag,
          });
        }
      }
    }

    return shows;
  }
}

module.exports = ShowsRepositoryDrive;
