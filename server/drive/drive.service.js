import ShowsService from "../shows/shows.service.js";
import { PROGRAMMING_DRIVE } from "../utilities/constants.js";
import DriveRepository from "./drive.repository.js";

class DriveService {
  static async syncShows({ fromDate = null } = {}) {
    const shows = await DriveRepository.scrapeShows(
      PROGRAMMING_DRIVE.PERFORMANCE_CONTRACTS_ROOT_FOLDER_ID,
      fromDate
    );
    const result = await ShowsService.upsertMany(shows, fromDate);
    return {
      scraped: shows.length,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
      deleted: result.deletedCount,
    };
  }

  static async listFolderFiles({ folderId }) {
    return DriveRepository.listFolderFiles({ folderId });
  }

  static async uploadFile({ buffer, filename, mimeType, folderId }) {
    return DriveRepository.uploadFile({ buffer, filename, mimeType, folderId });
  }

  static async createShowFolder({ artist, date, multipleShows }) {
    const show = await DriveRepository.createShowFolder({ artist, date, multipleShows });
    await ShowsService.upsertOne({
      driveId: show.driveId,
      artist: show.artist,
      date: show.date,
      multipleShows: show.multipleShows,
      unparsed: false,
    });
    return show;
  }
}

export default DriveService;
