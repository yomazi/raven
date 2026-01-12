// ./repositories/show.repository.js
const Show = require("../models/Show");

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
module.exports = ShowsRepositoryDb;
