class PerformancesController {
  static async getPerformances(req, res, next) {
    try {
      const performances = { message: "Got it!", count: 0, folders: [] };
      res.json(performances);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch performances" });
    }
  }
}

module.exports = PerformancesController;
