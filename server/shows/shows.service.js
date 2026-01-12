import ShowsRepositoryDb from "./shows.repository.db.js";
import ShowsRepositoryDrive from "./shows.repository.drive.js";

import { ROOT_FOLDER_ID } from "../utilities/constants.js";
class ShowsService {
  static async syncShows(rootFolderId) {
    const shows = await ShowsRepositoryDrive.scrapeShows(ROOT_FOLDER_ID);
    const mergedShows = await ShowsRepositoryDb.upsertShows(shows);
    return mergedShows;
  }
}

export default ShowsService;
