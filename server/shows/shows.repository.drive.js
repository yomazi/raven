// ./repositories/googleDrive.repository.js
import { blue, bold, green, red, yellow } from "colorette";
import { google } from "googleapis";

import AuthService from "../auth/auth.service.js";

// Recursively list subfolders of a folder
async function _listFolders(folderId, drive) {
  const folders = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "nextPageToken, files(id, name)",
      pageToken,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    folders.push(...res.data.files);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return folders;
}

class ShowsRepositoryDrive {
  // Extract shows recursively
  static async scrapeShows(rootFolderId) {
    // create an oauth client with the proper tokens so we can access Google Drive
    const client = await AuthService.getGoogleClient();
    const drive = google.drive({ version: "v3", auth: client });

    const shows = [];
    let parsedShows = 0;
    let unparsedShows = 0;

    const yearFolders = await _listFolders(rootFolderId, drive);
    for (const yearFolder of yearFolders) {
      if (!/\d{4} Program/.test(yearFolder.name)) continue;
      console.log(`Processing: "${yearFolder.name}"`);

      const monthFolders = await _listFolders(yearFolder.id, drive);
      for (const monthFolder of monthFolders) {
        if (!/\d{4}-\d{2} \w+/.test(monthFolder.name)) continue;
        console.log(`  Processing: "${monthFolder.name}"`);

        const showFolders = await _listFolders(monthFolder.id, drive);
        for (const showFolder of showFolders) {
          const name = showFolder.name.trim();

          // Match date at the start (1 or 2 digits for month/day) and optional "(multiple shows)" at the end
          const match = name.match(
            /^(\d{1,2})-(\d{1,2})-(\d{2})\s+(.+?)(?:\s*\(multiple shows\))?$/i
          );

          const ismatch = match ? "yes" : "no";
          const colorize = match ? green : red;
          console.log(`    Processing: "${showFolder.name}" match: `, colorize(`${ismatch}`));

          if (match) {
            const [, month, day, year, artist] = match;
            const normalizedMonth = month.padStart(2, "0");
            const normalizedDay = day.padStart(2, "0");
            const fullYear = `20${year}`;
            const date = new Date(`${fullYear}-${normalizedMonth}-${normalizedDay}`);

            shows.push({
              googleFolderId: showFolder.id,
              artist: artist.trim(),
              date,
              isMulti: /\(multiple shows\)$/i.test(name),
              unparsed: false,
            });

            parsedShows++;
          } else {
            shows.push({
              googleFolderId: showFolder.id,
              artistName: showFolder.name,
              date: null,
              isMulti: false,
              unparsed: true,
            });

            unparsedShows++;
          }
        }
      }
    }
    const total = parsedShows + unparsedShows;
    console.log(
      `\nScrape complete.\n`,
      `total:    `,
      bold(`${total}\n`),
      `parsed:   `,
      green(`${parsedShows}\n`),
      `unparsed:   `,
      red(`${unparsedShows}`)
    );

    return shows;
  }
}

export default ShowsRepositoryDrive;
