import Show from "../models/Show.js";
import { flatten } from "./shows.utilities.js";

class ShowsRepository {
  static async upsertOne(show) {
    return Show.findOneAndUpdate(
      { googleFolderId: show.googleFolderId },
      { $set: show },
      { upsert: true, new: true }
    );
  }

  static async upsertMany(shows) {
    const operations = shows.map((show) => ({
      updateOne: {
        filter: { googleFolderId: show.googleFolderId },
        update: { $set: show },
        upsert: true,
      },
    }));
    const result = await Show.bulkWrite(operations);
    return result;
  }

  static async softDeleteWhereNotIn(googleFolderIds, fromDate = null) {
    const filter = {
      googleFolderId: { $nin: googleFolderIds },
      ...(fromDate ? { date: { $gte: fromDate } } : {}),
    };
    const result = await Show.updateMany(filter, { $set: { deleted: true } });
    return result.modifiedCount;
  }

  static async findAll() {
    return Show.find({ deleted: { $ne: true } }).sort({ date: 1 });
  }

  static async findByGoogleFolderId(googleFolderId) {
    const result = await Show.findOne({ googleFolderId, deleted: { $ne: true } });

    return result;
  }

  static async updateDriveAssets(googleFolderId, driveUpdate) {
    return Show.findOneAndUpdate({ googleFolderId }, { $set: driveUpdate }, { new: true });
  }

  static async patch(googleFolderId, updates) {
    const { _id, __v, googleFolderId: _folderId, createdAt, ...safeUpdates } = updates;
    const flatUpdates = flatten(safeUpdates);

    return Show.findOneAndUpdate(
      { googleFolderId },
      { $set: flatUpdates },
      { new: true, runValidators: true }
    );
  }

  static async pushBuildEvents(googleFolderId, events) {
    return Show.findOneAndUpdate(
      { googleFolderId },
      { $push: { "build.events": { $each: events } } },
      { new: true }
    );
  }
}

export default ShowsRepository;
