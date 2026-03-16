// ./repositories/googleDrive.repository.js
import { blue, bold, green, red, yellow } from "colorette";
import { google } from "googleapis";

import AuthService from "../auth/auth.service.js";

const PRODUCTION_FOLDER_REGEX = /^(\d{1,2}-\d{1,2}-\d{2,4})\s+(.+?)(\s+\(multiple shows\))?$/i;
const YEAR_FOLDER_REGEX = /^(\d{4})\s+Program$/;
const MONTH_FOLDER_REGEX = /^\d{4}-\d{2}\s+\w+$/;

class DriveRepository {
  static async #getDriveClient() {
    const auth = await AuthService.getGoogleClient();
    const drive = google.drive({ version: "v3", auth });

    return drive;
  }

  static async #listFolders(drive, parentId) {
    const response = await drive.files.list({
      q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    return response.data.files ?? [];
  }

  static #parseProductionFolder(folder) {
    const match = folder.name.match(PRODUCTION_FOLDER_REGEX);

    if (!match) {
      console.warn(
        yellow(`[Drive] Could not parse folder name: "${folder.name}" — storing as unparsed`)
      );
      return {
        driveId: folder.id,
        artist: folder.name,
        date: null,
        multipleShows: false,
        unparsed: true,
      };
    }

    const [, rawDate, artist, multipleShowsToken] = match;
    const [mm, dd, yy] = rawDate.split("-").map(Number);
    const year = yy > 999 ? yy : 2000 + yy;
    const date = new Date(year, mm - 1, dd);

    return {
      driveId: folder.id,
      date,
      artist: artist.trim(),
      multipleShows: !!multipleShowsToken,
      unparsed: false,
    };
  }

  static async scrapeShows(rootFolderId, fromDate = null) {
    const drive = await DriveRepository.#getDriveClient();
    const productions = [];

    const yearFolders = await DriveRepository.#listFolders(drive, rootFolderId);

    for (const yearFolder of yearFolders) {
      if (!YEAR_FOLDER_REGEX.test(yearFolder.name)) {
        console.warn(yellow(`[Drive] Skipping unrecognized year folder: "${yearFolder.name}"`));
        continue;
      }

      const year = parseInt(yearFolder.name.slice(0, 4));

      // If filtering by date, skip entire years that are already past
      if (fromDate && year < fromDate.getFullYear()) continue;

      const monthFolders = await DriveRepository.#listFolders(drive, yearFolder.id);

      for (const monthFolder of monthFolders) {
        if (!MONTH_FOLDER_REGEX.test(monthFolder.name)) {
          console.warn(yellow(`[Drive] Skipping unrecognized month folder: "${monthFolder.name}"`));
          continue;
        }

        // If filtering by date, skip months that are already past within the fromDate year
        if (fromDate && year === fromDate.getFullYear()) {
          const month = parseInt(monthFolder.name.slice(5, 7));
          if (month < fromDate.getMonth() + 1) continue;
        }

        const productionFolders = await DriveRepository.#listFolders(drive, monthFolder.id);

        for (const productionFolder of productionFolders) {
          const production = DriveRepository.#parseProductionFolder(productionFolder);
          if (!production) continue;

          // Final date filter at production level (handles day precision)
          if (fromDate && production.date < fromDate) continue;

          productions.push(production);
        }
      }
    }

    console.log(green(`[Drive] Scraped ${bold(productions.length)} productions`));
    return productions;
  }
}

export default DriveRepository;
