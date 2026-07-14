// ./repositories/googleDrive.repository.js
import { blue, bold, green, red, yellow } from "colorette";
import { google } from "googleapis";
import { Readable } from "stream";
import AuthService from "../auth/auth.service.js";
import { ProgrammingDrive } from "../utilities/constants.js";

const PRODUCTION_FOLDER_REGEX = /^(\d{1,2}-\d{1,2}-\d{2,4})\s+(.+?)(\s+\(multiple shows\))?$/i;
const YEAR_FOLDER_REGEX = /^(\d{4})\s+Program$/;
const MONTH_FOLDER_REGEX = /^\d{4}-\d{2}\s+\w+$/;

export const CONTRACT_FOLDER_PREFIX = "contract - ";

// Google-native files have no raw bytes to download — exporting to a
// standard office format is the closest equivalent to "downloading" them.
const GOOGLE_EXPORT_MIME_TYPES = {
  "application/vnd.google-apps.document": {
    exportMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
  },
  "application/vnd.google-apps.spreadsheet": {
    exportMimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
  },
  "application/vnd.google-apps.presentation": {
    exportMimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: "pptx",
  },
};

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
   * Lists all non-trashed files directly inside a Drive folder (excludes
   * subfolders — the file manager's left pane fetches those separately via
   * listSubfolders, on demand, so this stays a lazy per-folder load rather
   * than pulling the whole show's contents at once).
   *
   * Uses a single files.list call with pageToken looping to handle folders
   * with more than 1000 files (the Drive API max per page).
   *
   * Response shape: [{ id, name, mimeType, size, modifiedTime, webViewLink }]
   */
  static async listFolderFiles({ folderId }) {
    const drive = await DriveRepository.#getDriveClient();

    const files = [];
    let pageToken = undefined;

    do {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)",
        pageSize: 1000,
        orderBy: "name_natural",
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
   * GET /api/v1/drive/files/:fileId/download
   *
   * Google Docs/Sheets/Slides have no raw bytes — export them to a standard
   * office format. Everything else (PDFs, etc.) downloads as-is.
   *
   * Returns: { buffer, mimeType, name }
   */
  static async downloadFile({ fileId }) {
    const drive = await DriveRepository.#getDriveClient();

    const meta = await drive.files.get({
      fileId,
      fields: "id, name, mimeType",
      supportsAllDrives: true,
    });
    const { name, mimeType } = meta.data;

    const exportConfig = GOOGLE_EXPORT_MIME_TYPES[mimeType];
    if (exportConfig) {
      const response = await drive.files.export(
        { fileId, mimeType: exportConfig.exportMimeType },
        { responseType: "arraybuffer" }
      );
      return {
        buffer: Buffer.from(response.data),
        mimeType: exportConfig.exportMimeType,
        name: `${name}.${exportConfig.extension}`,
      };
    }

    const response = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" }
    );
    return { buffer: Buffer.from(response.data), mimeType, name };
  }

  /**
   * POST /api/v1/drive/upload
   *
   * Uploads a file Buffer to a specific Drive folder using the renamed filename
   * supplied by GmailPanel's naming form. Uses multipart upload (metadata +
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

  static async #findFolderByPrefix(drive, parentId, prefix) {
    const folders = await DriveRepository.#listFolders(drive, parentId);
    return folders.find((f) => f.name.startsWith(prefix)) ?? null;
  }

  static async createShowFolder({ artist, date, multipleShows }) {
    const drive = await DriveRepository.#getDriveClient();

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const yy = String(year).slice(-2);

    // Find year folder e.g. "2026 Program"
    const yearFolder = await DriveRepository.#findFolderByPrefix(
      drive,
      ProgrammingDrive.FolderIds.PERFORMANCE_CONTRACTS_ROOT,
      `${year} Program`
    );

    if (!yearFolder) {
      throw new Error(`Year folder "${year} Program" not found in Drive.`);
    }

    // Find month folder e.g. "2026-01 January"
    const monthPrefix = `${year}-${mm}`;
    const monthFolder = await DriveRepository.#findFolderByPrefix(
      drive,
      yearFolder.id,
      monthPrefix
    );

    if (!monthFolder) {
      throw new Error(`Month folder "${monthPrefix}" not found in Drive.`);
    }

    // Build folder name e.g. "01-09-26 The Pharcyde (multiple shows)"
    const folderName = `${mm}-${dd}-${yy} ${artist.trim()}${multipleShows ? " (multiple shows)" : ""}`;

    const response = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [monthFolder.id],
      },
      fields: "id, name",
      supportsAllDrives: true,
    });

    return {
      driveId: response.data.id,
      folderName: response.data.name,
      date,
      artist: artist.trim(),
      multipleShows,
      unparsed: false,
    };
  }

  static async findSheetsInFolder({ folderId }) {
    const drive = await DriveRepository.#getDriveClient();

    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    return response.data.files ?? [];
  }

  static async createSettlementWorkbook({ folderId, artist, date, multipleShows }) {
    const drive = await DriveRepository.#getDriveClient();

    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const multipleShowsToken = multipleShows ? " (multiple shows)" : "";
    const name = `${yy}${mm}${dd} ${artist.trim()}${multipleShowsToken} Settlement Workbook`;

    const response = await drive.files.copy({
      fileId: ProgrammingDrive.SpreadsheetIds.SETTLEMENT_WORKBOOK_TEMPLATE,
      requestBody: {
        name,
        parents: [folderId],
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

  static async createMarketingAssetsFolder({ folderId, artist, date, multipleShows, templateDocId }) {
    const drive = await DriveRepository.#getDriveClient();

    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    const multipleShowsToken = multipleShows ? " (multiple shows)" : "";
    const docName = `${mm}-${dd}-${yy} ${artist.trim()}${multipleShowsToken}: marketing asset info`;

    // 1. Create the Marketing Assets subfolder
    const folderResponse = await drive.files.create({
      requestBody: {
        name: "!Marketing Assets",
        mimeType: "application/vnd.google-apps.folder",
        parents: [folderId],
      },
      fields: "id, name",
      supportsAllDrives: true,
    });

    const marketingAssetsFolderId = folderResponse.data.id;

    // 2. Copy the template doc into the subfolder
    const docResponse = await drive.files.copy({
      fileId: templateDocId,
      requestBody: {
        name: docName,
        parents: [marketingAssetsFolderId],
      },
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });

    return {
      folderId: marketingAssetsFolderId,
      folderName: "!Marketing Assets",
      docId: docResponse.data.id,
      docName: docResponse.data.name,
      docWebViewLink: docResponse.data.webViewLink,
    };
  }

  static async createContractFolder({ folderId, signee }) {
    const drive = await DriveRepository.#getDriveClient();

    const folderResponse = await drive.files.create({
      requestBody: {
        name: `${CONTRACT_FOLDER_PREFIX}${signee.trim()}`,
        mimeType: "application/vnd.google-apps.folder",
        parents: [folderId],
      },
      fields: "id, name",
      supportsAllDrives: true,
    });

    return {
      folderId: folderResponse.data.id,
      folderName: folderResponse.data.name,
    };
  }

  static async archiveContractFolder({ folderId, currentName }) {
    const drive = await DriveRepository.#getDriveClient();

    const response = await drive.files.update({
      fileId: folderId,
      requestBody: { name: `!archived - ${currentName}` },
      fields: "id, name",
      supportsAllDrives: true,
    });

    return { folderId: response.data.id, folderName: response.data.name };
  }

  static async listSubfolders({ folderId }) {
    const drive = await DriveRepository.#getDriveClient();
    return DriveRepository.#listFolders(drive, folderId);
  }

  static async copyFile({ fileId, name, folderId }) {
    const drive = await DriveRepository.#getDriveClient();

    const response = await drive.files.copy({
      fileId,
      requestBody: {
        name,
        parents: [folderId],
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

  static async trashFile({ fileId }) {
    const drive = await DriveRepository.#getDriveClient();

    await drive.files.update({
      fileId,
      requestBody: { trashed: true },
      supportsAllDrives: true,
    });
  }

  static async renameFolder({ folderId, name }) {
    const drive = await DriveRepository.#getDriveClient();

    const response = await drive.files.update({
      fileId: folderId,
      requestBody: { name },
      fields: "id, name",
      supportsAllDrives: true,
    });

    return { folderId: response.data.id, folderName: response.data.name };
  }

  static async fetchFileContent({ fileId, mimeType }) {
    const drive = await DriveRepository.#getDriveClient();

    if (mimeType === "application/vnd.google-apps.document") {
      const response = await drive.files.export(
        { fileId, mimeType: "text/plain" },
        { responseType: "text" }
      );
      return { text: response.data, buffer: null };
    }

    // PDFs and other binaries — download raw bytes
    const response = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" }
    );
    return { text: null, buffer: Buffer.from(response.data) };
  }
}

export default DriveRepository;
