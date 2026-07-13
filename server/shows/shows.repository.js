import Show from "../models/Show.js";
import { flatten } from "./shows.utilities.js";

class ShowsRepository {
  // setOnInsert lets callers seed fields that should only be written the
  // first time a show doc is created (e.g. a default performance) without
  // clobbering real data on every later re-sync of an existing show, since
  // $setOnInsert is a no-op when the upsert matches an existing document.
  static async upsertOne(show, setOnInsert = null) {
    const update = { $set: show };
    if (setOnInsert) update.$setOnInsert = setOnInsert;

    return Show.findOneAndUpdate({ googleFolderId: show.googleFolderId }, update, {
      upsert: true,
      new: true,
    });
  }

  static async upsertMany(shows, setOnInsertFn = null) {
    const operations = shows.map((show) => {
      const update = { $set: show };
      const setOnInsert = setOnInsertFn?.(show);
      if (setOnInsert) update.$setOnInsert = setOnInsert;

      return {
        updateOne: {
          filter: { googleFolderId: show.googleFolderId },
          update,
          upsert: true,
        },
      };
    });
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

  static async addContract(googleFolderId, contract) {
    return Show.findOneAndUpdate(
      { googleFolderId },
      { $push: { "build.contracts": contract } },
      { new: true, runValidators: true }
    );
  }

  static async setContractArchived(googleFolderId, contractId, archived) {
    return Show.findOneAndUpdate(
      { googleFolderId, "build.contracts._id": contractId },
      { $set: { "build.contracts.$.archived": archived } },
      { new: true, runValidators: true }
    );
  }

  static async setContractStatus(googleFolderId, contractId, status) {
    return Show.findOneAndUpdate(
      { googleFolderId, "build.contracts._id": contractId },
      { $set: { "build.contracts.$.status": status } },
      { new: true, runValidators: true }
    );
  }

  static async renameContract(googleFolderId, contractId, { signee, folderName }) {
    return Show.findOneAndUpdate(
      { googleFolderId, "build.contracts._id": contractId },
      { $set: { "build.contracts.$.signee": signee, "build.contracts.$.folderName": folderName } },
      { new: true, runValidators: true }
    );
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
