import log from "../logging/log.js";
import ShowsService from "../shows/shows.service.js";
import { ProgrammingDrive } from "../utilities/constants.js";
import { extractPdfText } from "../utilities/pdf.js";
import DriveRepository from "./drive.repository.js";

class DriveService {
  static async syncShows({ fromDate = null } = {}) {
    log.info("sync", "Sync started", { fromDate });
    try {
      const shows = await DriveRepository.scrapeShows(
        ProgrammingDrive.FolderIds.PERFORMANCE_CONTRACTS_ROOT,
        fromDate
      );
      const result = await ShowsService.upsertMany(shows, fromDate);
      log.info("sync", "Sync complete", {
        scraped: shows.length,
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
        deleted: result.deletedCount,
        fromDate,
      });
      return {
        scraped: shows.length,
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
        deleted: result.deletedCount,
      };
    } catch (err) {
      log.error("sync", "Sync failed", err);
      throw err;
    }
  }

  static async listFolderFiles({ folderId }) {
    return DriveRepository.listFolderFiles({ folderId });
  }

  static async uploadFile({ buffer, filename, mimeType, folderId }) {
    try {
      const result = await DriveRepository.uploadFile({ buffer, filename, mimeType, folderId });
      log.info("upload", "File uploaded", {
        filename,
        fileId: result.id,
        webViewLink: result.webViewLink,
      });
      return result;
    } catch (err) {
      log.error("upload", "File upload failed", err);
      throw err;
    }
  }

  static async createShowFolder({ artist, date, multipleShows }) {
    log.info("createShowFolder", "Creating show folder", { artist, date, multipleShows });

    try {
      // 1. Create the Drive folder
      const show = await DriveRepository.createShowFolder({ artist, date, multipleShows });

      // 2. Upsert the show into MongoDB
      await ShowsService.upsertOne({
        driveId: show.driveId,
        artist: show.artist,
        date: show.date,
        multipleShows: show.multipleShows,
        unparsed: false,
      });

      log.info("createShowFolder", "Show folder created", {
        folderName: show.folderName,
        driveId: show.driveId,
      });

      // 3. Check for pre-existing sheets
      const preExistingSheets = await DriveRepository.findSheetsInFolder({
        folderId: show.driveId,
      });

      if (preExistingSheets.length > 0) {
        log.warn("createShowFolder", "Pre-existing Google Sheets found in new show folder", {
          folderName: show.folderName,
          sheets: preExistingSheets,
        });
      }

      // 4. Create settlement workbook from template
      const workbook = await DriveRepository.createSettlementWorkbook({
        folderId: show.driveId,
        artist: show.artist,
        date: show.date,
        multipleShows: show.multipleShows,
      });

      log.info("createShowFolder", "Settlement workbook created", {
        name: workbook.name,
        id: workbook.id,
      });

      // 5. Create marketing assets folder
      const marketingAssets = await DriveRepository.createMarketingAssetsFolder({
        folderId: show.driveId,
        artist: show.artist,
        date: show.date,
        multipleShows: show.multipleShows,
      });

      log.info("createShowFolder", "Marketing assets folder created", {
        folderName: marketingAssets.folderName,
        docName: marketingAssets.docName,
      });

      // 6. Store Drive assets on the show document
      const driveUpdate = {
        "drive.spreadsheetIds.settlementWorkbook": workbook.id,
        "drive.folderIds.marketingAssets": marketingAssets.folderId,
        "drive.documentIds.marketingAssetsInfo": marketingAssets.docId,
        ...(preExistingSheets.length > 0 && {
          "drive.spreadsheetIds.preExistingSheets": preExistingSheets.map((s) => ({
            id: s.id,
            name: s.name,
          })),
        }),
      };

      await ShowsService.updateDriveAssets(show.driveId, driveUpdate);

      return { ...show, workbook };
    } catch (err) {
      log.error("createShowFolder", "Failed to create show folder", err);
      throw err;
    }
  }

  static async createSettlementWorkbook({ googleFolderId }) {
    log.info("createSettlementWorkbook", "Creating settlement workbook", { googleFolderId });

    try {
      const show = await ShowsService.getByGoogleFolderId(googleFolderId);
      if (!show) throw new Error(`Show not found for folder ID: ${googleFolderId}`);

      // Collect all sheets that aren't the current workbook
      const preExistingSheets = [...(show.drive?.spreadsheetIds?.preExistingSheets ?? [])];

      // If there's already a workbook ID stored, move it to preExistingSheets
      if (show.drive?.spreadsheetIds?.settlementWorkbook) {
        const existingId = show.drive.spreadsheetIds.settlementWorkbook;
        const alreadyTracked = preExistingSheets.some((s) => s.id === existingId);
        if (!alreadyTracked) {
          preExistingSheets.push({ id: existingId, name: "Previous Settlement Workbook" });
        }
      }

      // Also scan the Drive folder for any untracked sheets
      const sheetsInFolder = await DriveRepository.findSheetsInFolder({ folderId: googleFolderId });
      for (const sheet of sheetsInFolder) {
        const alreadyTracked = preExistingSheets.some((s) => s.id === sheet.id);
        if (!alreadyTracked) {
          log.warn("createSettlementWorkbook", "Untracked sheet found in folder", {
            artist: show.artist,
            sheet,
          });
          preExistingSheets.push({ id: sheet.id, name: sheet.name });
        }
      }

      // Create the new workbook
      const workbook = await DriveRepository.createSettlementWorkbook({
        folderId: googleFolderId,
        artist: show.artist,
        date: new Date(show.date),
        multipleShows: show.isMulti,
      });

      log.info("createSettlementWorkbook", "Settlement workbook created", {
        name: workbook.name,
        id: workbook.id,
      });

      // Store updated drive assets
      await ShowsService.updateDriveAssets(googleFolderId, {
        "drive.spreadsheetIds.settlementWorkbook": workbook.id,
        "drive.spreadsheetIds.preExistingSheets": preExistingSheets,
      });

      return workbook;
    } catch (err) {
      log.error("createSettlementWorkbook", "Failed to create settlement workbook", err);
      throw err;
    }
  }

  static async createMarketingAssetsFolder({ googleFolderId }) {
    log.info("createMarketingAssetsFolder", "Creating marketing assets folder", { googleFolderId });

    try {
      const show = await ShowsService.getByGoogleFolderId(googleFolderId);
      if (!show) throw new Error(`Show not found for folder ID: ${googleFolderId}`);

      const result = await DriveRepository.createMarketingAssetsFolder({
        folderId: googleFolderId,
        artist: show.artist,
        date: new Date(show.date),
        multipleShows: show.isMulti,
      });

      log.info("createMarketingAssetsFolder", "Marketing assets folder created", {
        folderName: result.folderName,
        folderId: result.folderId,
        docName: result.docName,
        docId: result.docId,
      });

      await ShowsService.updateDriveAssets(googleFolderId, {
        "drive.folderIds.marketingAssets": result.folderId,
        "drive.documentIds.marketingAssetsInfo": result.docId,
      });

      return result;
    } catch (err) {
      log.error("createMarketingAssetsFolder", "Failed to create marketing assets folder", err);
      throw err;
    }
  }

  static async fetchFileText({ fileId, mimeType }) {
    const { text, buffer } = await DriveRepository.fetchFileContent({ fileId, mimeType });

    if (text !== null) return text;

    if (mimeType === "application/pdf") {
      const result = await extractPdfText(buffer);

      return result;
    }

    throw new Error(`Unsupported file type for text extraction: ${mimeType}`);
  }
}

export default DriveService;
