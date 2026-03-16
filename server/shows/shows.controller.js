import ShowsService from "./shows.service.js";

class ShowsController {
  static async hello(req, res) {
    try {
      res.json({ success: true, result: { message: "Hello from ShowsController!" } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getAll(req, res) {
    try {
      const shows = await ShowsService.getAll();
      res.json({ success: true, shows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default ShowsController;
