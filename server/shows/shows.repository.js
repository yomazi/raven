import Show from "../models/Show.js";

class ShowsRepository {
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

  static async findAll() {
    return Show.find().sort({ date: 1 });
  }

  static async findByGoogleFolderId(googleFolderId) {
    return Show.findOne({ googleFolderId });
  }
}

export default ShowsRepository;
