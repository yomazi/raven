import ShowsService from "./shows.service.js";

class ShowsController {
  static async getAll(req, res) {
    try {
      const shows = await ShowsService.getAll();
      res.json({ success: true, shows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const show = await ShowsService.getByGoogleFolderId(id);

      if (!show) return res.status(404).json({ success: false, error: "Show not found" });

      res.json({ success: true, show });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default ShowsController;
