import log from "../logging/log.js";
import ShowsService from "../shows/shows.service.js";
import { PROGRAMMING_DRIVE } from "../utilities/constants.js";
import DriveRepository from "./drive.repository.js";

class DriveService {
  static async syncShows({ fromDate = null } = {}) {
    log.info("sync", "Sync started", { fromDate });
    try {
      const shows = await DriveRepository.scrapeShows(
        PROGRAMMING_DRIVE.PERFORMANCE_CONTRACTS_ROOT_FOLDER_ID,
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
      const show = await DriveRepository.createShowFolder({ artist, date, multipleShows });
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
      return show;
    } catch (err) {
      log.error("createShowFolder", "Failed to create show folder", err);
      throw err;
    }
  }
}

export default DriveService;
