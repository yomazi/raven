const { google } = require("googleapis");

class PerformancesController {
  static async getPerformances(req, res, next) {
    try {
      const performances = await fetchPerformances();
      res.json(performances);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch performances" });
    }
  }
}

module.exports = PerformancesController;
