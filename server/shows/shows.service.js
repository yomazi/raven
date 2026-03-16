import ShowsRepository from "./shows.repository.js";

class ShowsService {
  static #mapDriveShowToDocument(driveShow) {
    return {
      googleFolderId: driveShow.driveId,
      artist: driveShow.artist,
      date: driveShow.date,
      isMulti: driveShow.multipleShows,
      unparsed: driveShow.unparsed ?? false,
    };
  }

  static async upsertMany(driveShows) {
    const mapped = driveShows.map(ShowsService.#mapDriveShowToDocument);
    return ShowsRepository.upsertMany(mapped);
  }

  static async getAll() {
    return ShowsRepository.findAll();
  }

  static async getByGoogleFolderId(googleFolderId) {
    return ShowsRepository.findByGoogleFolderId(googleFolderId);
  }
}

export default ShowsService;
