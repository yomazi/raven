import log from "../logging/log.js";
import ShowsService from "../shows/shows.service.js";
import { ProgrammingDrive } from "../utilities/constants.js";
import { extractPdfText } from "../utilities/pdf.js";
import DriveRepository, { CONTRACT_FOLDER_PREFIX } from "./drive.repository.js";

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

      // 7. Create a default contract folder, named after the show — staff
      // can archive it from Properties if this show doesn't end up needing one.
      const contractFolder = await DriveRepository.createContractFolder({
        folderId: show.driveId,
        signee: show.artist,
      });

      await ShowsService.addContract(show.driveId, {
        signee: show.artist,
        folderId: contractFolder.folderId,
        folderName: contractFolder.folderName,
      });

      log.info("createShowFolder", "Default contract folder created", {
        folderName: contractFolder.folderName,
      });

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

  static async createContractFolder({ googleFolderId, signee }) {
    log.info("createContractFolder", "Creating contract folder", { googleFolderId, signee });

    try {
      const show = await ShowsService.getByGoogleFolderId(googleFolderId);
      if (!show) throw new Error(`Show not found for folder ID: ${googleFolderId}`);

      const folder = await DriveRepository.createContractFolder({
        folderId: googleFolderId,
        signee,
      });

      const updatedShow = await ShowsService.addContract(googleFolderId, {
        signee,
        folderId: folder.folderId,
        folderName: folder.folderName,
      });

      log.info("createContractFolder", "Contract folder created", {
        folderName: folder.folderName,
        folderId: folder.folderId,
      });

      return { ...folder, show: updatedShow };
    } catch (err) {
      log.error("createContractFolder", "Failed to create contract folder", err);
      throw err;
    }
  }

  static async archiveContractFolder({ googleFolderId, contractId }) {
    log.info("archiveContractFolder", "Archiving contract folder", { googleFolderId, contractId });

    try {
      const show = await ShowsService.getByGoogleFolderId(googleFolderId);
      if (!show) throw new Error(`Show not found for folder ID: ${googleFolderId}`);

      const contract = (show.build?.contracts ?? []).find((c) => String(c._id) === contractId);
      if (!contract) throw new Error(`Contract not found: ${contractId}`);

      const folder = await DriveRepository.archiveContractFolder({
        folderId: contract.folderId,
        currentName: contract.folderName,
      });

      const updatedShow = await ShowsService.archiveContract(googleFolderId, contractId);

      log.info("archiveContractFolder", "Contract folder archived", {
        folderName: folder.folderName,
        folderId: folder.folderId,
      });

      return { ...folder, show: updatedShow };
    } catch (err) {
      log.error("archiveContractFolder", "Failed to archive contract folder", err);
      throw err;
    }
  }

  // Subfolders of the show's root folder that aren't already tied to a
  // contract (active or archived) or the Marketing Assets folder — the set
  // eligible to be imported as a new contract's folder.
  static async listImportableContractFolders({ googleFolderId }) {
    const show = await ShowsService.getByGoogleFolderId(googleFolderId);
    if (!show) throw new Error(`Show not found for folder ID: ${googleFolderId}`);

    const usedFolderIds = new Set(
      [
        ...(show.build?.contracts ?? []).map((c) => c.folderId),
        show.drive?.folderIds?.marketingAssets,
      ].filter(Boolean)
    );

    const subfolders = await DriveRepository.listSubfolders({ folderId: googleFolderId });
    return subfolders.filter((f) => !usedFolderIds.has(f.id));
  }

  static async importContractFolder({ googleFolderId, subfolderId }) {
    log.info("importContractFolder", "Importing contract folder", { googleFolderId, subfolderId });

    try {
      const show = await ShowsService.getByGoogleFolderId(googleFolderId);
      if (!show) throw new Error(`Show not found for folder ID: ${googleFolderId}`);

      const alreadyLinked = (show.build?.contracts ?? []).some((c) => c.folderId === subfolderId);
      if (alreadyLinked) throw new Error("That folder is already linked to a contract.");

      const subfolders = await DriveRepository.listSubfolders({ folderId: googleFolderId });
      const target = subfolders.find((f) => f.id === subfolderId);
      if (!target) throw new Error("Folder not found in this show's Drive folder.");

      const signee = target.name.startsWith(CONTRACT_FOLDER_PREFIX)
        ? target.name.slice(CONTRACT_FOLDER_PREFIX.length).trim()
        : target.name.trim();

      let folderName = target.name;
      if (!folderName.startsWith(CONTRACT_FOLDER_PREFIX)) {
        const renamed = await DriveRepository.renameFolder({
          folderId: subfolderId,
          name: `${CONTRACT_FOLDER_PREFIX}${folderName}`,
        });
        folderName = renamed.folderName;
      }

      const updatedShow = await ShowsService.addContract(googleFolderId, {
        signee: signee || folderName,
        folderId: subfolderId,
        folderName,
      });

      log.info("importContractFolder", "Contract folder imported", { folderName, folderId: subfolderId });

      return { folderId: subfolderId, folderName, signee, show: updatedShow };
    } catch (err) {
      log.error("importContractFolder", "Failed to import contract folder", err);
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
