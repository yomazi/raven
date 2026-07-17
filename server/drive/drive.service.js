import log from "../logging/log.js";
import SettingsService from "../settings/settings.service.js";
import ShowsService from "../shows/shows.service.js";
import { ProgrammingDrive } from "../utilities/constants.js";
import { extractPdfText } from "../utilities/pdf.js";
import DocsRepository from "./docs.repository.js";
import DriveRepository, { CONTRACT_FOLDER_PREFIX } from "./drive.repository.js";

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function formatLongDate(date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// Same "MM-DD-YY Artist Name (multiple shows)" convention DriveRepository
// uses when it first creates a show folder — reused here so renaming
// produces a folder name indistinguishable from one made at creation time.
function buildShowFolderName({ date, artist, multipleShows }) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}-${dd}-${yy} ${artist.trim()}${multipleShows ? " (multiple shows)" : ""}`;
}

// Matches the naming convention DriveRepository.createMarketingAssetsFolder
// uses for the doc it copies from the template, so a renamed/rescheduled
// show's marketing asset info doc stays indistinguishable from one made at
// creation time.
function buildMarketingAssetsDocName({ date, artist, multipleShows }) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}-${dd}-${yy} ${artist.trim()}${multipleShows ? " (multiple shows)" : ""}: marketing asset info`;
}

// Uploaded filenames carry a routing prefix ("prg.contract.draft.1 - foo.pdf")
// added by the naming modal (GmailPanel / FileManager) — a download should
// give back just the human-chosen part after that " - " separator.
function stripFilenamePrefix(name) {
  const separatorIndex = name.indexOf(" - ");
  if (separatorIndex === -1) return name;
  return name.slice(separatorIndex + 3).trim();
}

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

  static async listSubfolders({ folderId }) {
    return DriveRepository.listSubfolders({ folderId });
  }

  static async downloadFile({ fileId }) {
    const result = await DriveRepository.downloadFile({ fileId });
    return { ...result, name: stripFilenamePrefix(result.name) };
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
      const marketingAssetsTemplateDocId = await SettingsService.getValue(
        "marketingAssetsInfoDocId"
      );
      if (!marketingAssetsTemplateDocId) {
        throw new Error("The \"Marketing Assets Info Doc ID\" setting is not configured.");
      }
      const marketingAssets = await DriveRepository.createMarketingAssetsFolder({
        folderId: show.driveId,
        artist: show.artist,
        date: show.date,
        multipleShows: show.multipleShows,
        templateDocId: marketingAssetsTemplateDocId,
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
        isMainContract: true,
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

  // Renames the show's own Drive folder (not a contract subfolder) to match
  // a new artist name, keeping the existing date/multi-show naming
  // convention, and updates Show.artist to match. Also renames the
  // marketing assets info doc (its name embeds the artist too) if one
  // exists. The settlement workbook and marketing assets *folder* (whose
  // name doesn't embed the artist) are left alone.
  static async renameShowFolder({ googleFolderId, artist }) {
    log.info("renameShowFolder", "Renaming show folder", { googleFolderId, artist });

    try {
      const show = await ShowsService.getByGoogleFolderId(googleFolderId);
      if (!show) throw new Error(`Show not found for folder ID: ${googleFolderId}`);

      const trimmedArtist = artist.trim();
      const folderName = buildShowFolderName({
        date: show.date,
        artist: trimmedArtist,
        multipleShows: show.isMulti,
      });

      const folder = await DriveRepository.renameFolder({
        folderId: googleFolderId,
        name: folderName,
      });

      const updatedShow = await ShowsService.patch(googleFolderId, { artist: trimmedArtist });

      const marketingAssetsDocId = updatedShow?.drive?.documentIds?.marketingAssetsInfo;
      if (marketingAssetsDocId) {
        const docName = buildMarketingAssetsDocName({
          date: updatedShow.date,
          artist: trimmedArtist,
          multipleShows: updatedShow.isMulti,
        });
        await DriveRepository.renameFolder({ folderId: marketingAssetsDocId, name: docName });
      }

      log.info("renameShowFolder", "Show folder renamed", { folderName: folder.folderName });

      return { ...folder, show: updatedShow };
    } catch (err) {
      log.error("renameShowFolder", "Failed to rename show folder", err);
      throw err;
    }
  }

  // Moves the show's Drive folder to match a new date (if the year/month
  // changed) and renames it to the new "MM-DD-YY Artist (multiple shows)"
  // name, then updates Show.artist/date/isMulti to match. Also renames the
  // marketing assets info doc (its name embeds date/artist/multi too) if
  // one exists. The settlement workbook and marketing assets *folder*
  // (whose name doesn't embed any of these) are left alone. Rescheduling a
  // canceled show un-cancels it and restores build.shouldShowInRoster — on
  // the assumption that a show being rescheduled is back on. Shows that
  // weren't canceled are unaffected. (Cancellation is a Mongo-only flag —
  // it no longer has any effect on Drive folder naming.)
  static async rescheduleShow({ googleFolderId, artist, date, multipleShows }) {
    log.info("rescheduleShow", "Rescheduling show", { googleFolderId, artist, date, multipleShows });

    try {
      const show = await ShowsService.getByGoogleFolderId(googleFolderId);
      if (!show) throw new Error(`Show not found for folder ID: ${googleFolderId}`);

      const trimmedArtist = artist.trim();
      const folder = await DriveRepository.rescheduleShowFolder({
        folderId: googleFolderId,
        date,
        artist: trimmedArtist,
        multipleShows,
      });

      const updatedShow = await ShowsService.patch(googleFolderId, {
        artist: trimmedArtist,
        date,
        isMulti: multipleShows,
        canceled: false,
        ...(show.canceled ? { "build.shouldShowInRoster": true } : {}),
      });

      const marketingAssetsDocId = updatedShow?.drive?.documentIds?.marketingAssetsInfo;
      if (marketingAssetsDocId) {
        const docName = buildMarketingAssetsDocName({
          date,
          artist: trimmedArtist,
          multipleShows,
        });
        await DriveRepository.renameFolder({ folderId: marketingAssetsDocId, name: docName });
      }

      log.info("rescheduleShow", "Show rescheduled", {
        folderName: folder.folderName,
        moved: folder.moved,
      });

      return { ...folder, show: updatedShow };
    } catch (err) {
      log.error("rescheduleShow", "Failed to reschedule show", err);
      throw err;
    }
  }

  // Moves the show's Drive folder to Trash and soft-deletes the Mongo
  // record (deleted: true) — reversible on both sides, matching the
  // existing sync-driven soft-delete convention rather than a hard delete.
  static async deleteShow({ googleFolderId }) {
    log.info("deleteShow", "Deleting show", { googleFolderId });

    try {
      const show = await ShowsService.getByGoogleFolderId(googleFolderId);
      if (!show) throw new Error(`Show not found for folder ID: ${googleFolderId}`);

      await DriveRepository.trashFile({ fileId: googleFolderId });
      const updatedShow = await ShowsService.softDelete(googleFolderId);

      log.info("deleteShow", "Show deleted", { googleFolderId, artist: show.artist });

      return { show: updatedShow };
    } catch (err) {
      log.error("deleteShow", "Failed to delete show", err);
      throw err;
    }
  }

  // Flips Show.canceled — a Mongo-only flag with no effect on the Drive
  // folder (nothing stops someone renaming the folder directly in Drive
  // regardless of this flag, so tying folder naming to it was never a
  // reliable signal). Canceling also forces build.shouldShowInRoster off
  // (so it drops out of the Builds roster tab); un-canceling leaves that
  // flag alone rather than guessing whether it should come back. The
  // folder and Mongo record are otherwise preserved — this is not a delete.
  static async setShowCanceled({ googleFolderId, canceled }) {
    log.info("setShowCanceled", "Setting show canceled state", { googleFolderId, canceled });

    try {
      const show = await ShowsService.getByGoogleFolderId(googleFolderId);
      if (!show) throw new Error(`Show not found for folder ID: ${googleFolderId}`);

      const updatedShow = await ShowsService.patch(googleFolderId, {
        canceled,
        ...(canceled ? { "build.shouldShowInRoster": false } : {}),
      });

      log.info("setShowCanceled", "Show canceled state updated", { googleFolderId, canceled });

      return { show: updatedShow };
    } catch (err) {
      log.error("setShowCanceled", "Failed to set show canceled state", err);
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

      const templateDocId = await SettingsService.getValue("marketingAssetsInfoDocId");
      if (!templateDocId) {
        throw new Error("The \"Marketing Assets Info Doc ID\" setting is not configured.");
      }

      const result = await DriveRepository.createMarketingAssetsFolder({
        folderId: googleFolderId,
        artist: show.artist,
        date: new Date(show.date),
        multipleShows: show.isMulti,
        templateDocId,
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

  // No Drive folder side effect — this only flips the Mongo-side flag — but
  // lives alongside the other contract mutations for consistency with how
  // the client already imports all of them from @api/drive.api.js.
  static async setMainContract({ googleFolderId, contractId, isMainContract }) {
    log.info("setMainContract", "Setting main contract", {
      googleFolderId,
      contractId,
      isMainContract,
    });

    try {
      const show = await ShowsService.getByGoogleFolderId(googleFolderId);
      if (!show) throw new Error(`Show not found for folder ID: ${googleFolderId}`);

      const contract = (show.build?.contracts ?? []).find((c) => String(c._id) === contractId);
      if (!contract) throw new Error(`Contract not found: ${contractId}`);

      const updatedShow = await ShowsService.setMainContract(
        googleFolderId,
        contractId,
        isMainContract
      );

      log.info("setMainContract", "Main contract updated", { contractId, isMainContract });

      return { show: updatedShow };
    } catch (err) {
      log.error("setMainContract", "Failed to set main contract", err);
      throw err;
    }
  }

  static async renameContractFolder({ googleFolderId, contractId, signee }) {
    log.info("renameContractFolder", "Renaming contract", { googleFolderId, contractId, signee });

    try {
      const show = await ShowsService.getByGoogleFolderId(googleFolderId);
      if (!show) throw new Error(`Show not found for folder ID: ${googleFolderId}`);

      const contract = (show.build?.contracts ?? []).find((c) => String(c._id) === contractId);
      if (!contract) throw new Error(`Contract not found: ${contractId}`);

      const trimmedSignee = signee.trim();
      const folder = await DriveRepository.renameFolder({
        folderId: contract.folderId,
        name: `${CONTRACT_FOLDER_PREFIX}${trimmedSignee}`,
      });

      const updatedShow = await ShowsService.renameContract(googleFolderId, contractId, {
        signee: trimmedSignee,
        folderName: folder.folderName,
      });

      log.info("renameContractFolder", "Contract renamed", {
        folderName: folder.folderName,
        folderId: folder.folderId,
      });

      return { ...folder, show: updatedShow };
    } catch (err) {
      log.error("renameContractFolder", "Failed to rename contract", err);
      throw err;
    }
  }

  static async generateContractDoc({ googleFolderId, contractId }) {
    log.info("generateContractDoc", "Generating contract doc", { googleFolderId, contractId });

    try {
      const show = await ShowsService.getByGoogleFolderId(googleFolderId);
      if (!show) throw new Error(`Show not found for folder ID: ${googleFolderId}`);

      const contract = (show.build?.contracts ?? []).find((c) => String(c._id) === contractId);
      if (!contract) throw new Error(`Contract not found: ${contractId}`);

      const templateDocId = await SettingsService.getValue("generalContractTemplateDocId");
      if (!templateDocId) {
        throw new Error("The \"General Contract Template Doc ID\" setting is not configured.");
      }

      const now = new Date();
      const fileName = `prg.contract.doc -  ${formatDate(now)} ${contract.signee} - contract`;

      const file = await DriveRepository.copyFile({
        fileId: templateDocId,
        name: fileName,
        folderId: contract.folderId,
      });

      try {
        await DocsRepository.replaceText(file.id, [
          { find: "{{ARTIST}}", replace: contract.signee },
          { find: "{{DATE}}", replace: formatLongDate(now) },
        ]);
      } catch (err) {
        // Don't leave a half-generated doc (with unresolved placeholders)
        // sitting in the contract's folder — trash it and surface the error.
        await DriveRepository.trashFile({ fileId: file.id }).catch(() => {});
        throw err;
      }

      const updatedShow = await ShowsService.setContractStatus(
        googleFolderId,
        contractId,
        "drafted by us"
      );

      log.info("generateContractDoc", "Contract doc generated", {
        fileName: file.name,
        fileId: file.id,
      });

      return { file, show: updatedShow };
    } catch (err) {
      log.error("generateContractDoc", "Failed to generate contract doc", err);
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
