import Show from "../models/Show.js";

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
    const flatUpdates = ShowsRepository.#flatten(safeUpdates);

    return Show.findOneAndUpdate(
      { googleFolderId },
      { $set: flatUpdates },
      { new: true, runValidators: true }
    );
  }

  static #flatten(obj, prefix = "", result = {}) {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        ShowsRepository.#flatten(value, path, result);
      } else {
        result[path] = value;
      }
    }
    return result;
  }
}

export default ShowsRepository;
