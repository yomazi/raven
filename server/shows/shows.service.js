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

  static async upsertMany(driveShows, fromDate = null) {
    const mapped = driveShows.map(ShowsService.#mapDriveShowToDocument);
    const result = await ShowsRepository.upsertMany(mapped);

    const googleFolderIds = mapped.map((s) => s.googleFolderId);
    const deletedCount = await ShowsRepository.deleteWhereNotIn(googleFolderIds, fromDate);

    return {
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      deletedCount,
    };
  }
  static async getAll() {
    return ShowsRepository.findAll();
  }

  static async getByGoogleFolderId(googleFolderId) {
    return ShowsRepository.findByGoogleFolderId(googleFolderId);
  }
}

export default ShowsService;
