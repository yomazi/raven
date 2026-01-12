// ./services/show.service.js
const ShowsRepositoryDrive = require("./shows.repository.drive");
const ShowsRepositoryDb = require("./shows.repository.db");

class ShowsService {
  static async syncShows(rootFolderId) {
    const shows = await ShowsRepositoryDrive.scrapeShows(rootFolderId);
    const mergedShows = await ShowsRepositoryDb.upsertShows(shows);
    return mergedShows;
  }
}

module.exports = ShowsService;
