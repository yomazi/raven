import ShowsService from "../shows/shows.service.js";
import { PROGRAMMING_DRIVE } from "../utilities/constants.js";
import DriveRepository from "./drive.repository.js";

class DriveService {
  static async syncShows({ fromDate = null } = {}) {
    const shows = await DriveRepository.scrapeShows(
      PROGRAMMING_DRIVE.PERFORMANCE_CONTRACTS_ROOT_FOLDER_ID,
      fromDate
    );

    const result = await ShowsService.upsertMany(shows);

    return {
      scraped: shows.length,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    };
  }
}

export default DriveService;
