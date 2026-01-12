// ./repositories/show.repository.js
import Show from "../models/Show.js";

class ShowsRepositoryDb {
  static async upsertShows(shows) {
    const ops = shows.map((show) => ({
      updateOne: {
        filter: { googleFolderId: show.googleFolderId },
        update: { $set: show },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await Show.bulkWrite(ops);
    }

    return await Show.find({});
  }
}
export default ShowsRepositoryDb;
