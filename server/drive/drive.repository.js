// ./repositories/googleDrive.repository.js
import { blue, bold, green, red, yellow } from "colorette";
import { google } from "googleapis";
import { Readable } from "stream";
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

  /**
   * GET /api/v1/drive/folders/:folderId/files
   *
   * Lists all non-trashed files directly inside a Drive folder.
   * Excludes subfolders — Dragonfly only needs to scan filenames for version
   * number inference, and show folders only contain files at the top level.
   *
   * Uses a single files.list call with pageToken looping to handle folders
   * with more than 1000 files (the Drive API max per page).
   *
   * Response shape: [{ id, name, mimeType }]
   */
  static async listFolderFiles({ folderId }) {
    const drive = await DriveRepository.#getDriveClient();

    const files = [];
    let pageToken = undefined;

    do {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "nextPageToken, files(id, name, mimeType)",
        pageSize: 1000,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        ...(pageToken ? { pageToken } : {}),
      });

      files.push(...(response.data.files ?? []));
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    return files;
  }

  /**
   * POST /api/v1/drive/upload
   *
   * Uploads a file Buffer to a specific Drive folder using the renamed filename
   * supplied by Dragonfly's naming form. Uses multipart upload (metadata +
   * media in one request) which is appropriate for files up to ~5MB. For larger
   * files the Drive API supports resumable uploads, but attachment files in this
   * context are typically contracts and riders (PDFs, Word docs) well under that.
   *
   * The Drive API requires the media body as a readable stream — we convert the
   * Buffer to one with Readable.from().
   *
   * Returns: { id, name, webViewLink }
   */
  static async uploadFile({ buffer, filename, mimeType, folderId }) {
    const drive = await DriveRepository.#getDriveClient();

    const response = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });

    return {
      id: response.data.id,
      name: response.data.name,
      webViewLink: response.data.webViewLink,
    };
  }
}

export default DriveRepository;
