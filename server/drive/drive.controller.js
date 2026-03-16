// ./controllers/show.controller.js
import DriveService from "./drive.service.js";

class DriveController {
  static async sync(req, res) {
    try {
      const { fromDate } = req.body ?? {};
      const parsedFromDate = fromDate ? new Date(fromDate) : null;

      const result = await DriveService.syncShows({ fromDate: parsedFromDate });

      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default DriveController;
