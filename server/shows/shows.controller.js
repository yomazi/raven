// ./controllers/show.controller.js
import ShowsService from "./shows.service.js";

class ShowsController {
  static async syncShowsController(req, res) {
    try {
      const rootFolderId = req.query.rootFolderId; // or hardcode if always the same
      const shows = await ShowsService.syncShows(rootFolderId);

      res.json({ success: true, shows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default ShowsController;
