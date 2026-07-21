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

      res.set("Cache-Control", "no-store");
      res.json({ success: true, show });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async patch(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const show = await ShowsService.patch(id, updates);
      if (!show) return res.status(404).json({ success: false, error: "Show not found" });
      res.json({ success: true, show });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async registerGmailThread(req, res) {
    try {
      const { id } = req.params;
      const { threadId } = req.body;
      const show = await ShowsService.registerGmailThread(id, threadId);
      if (!show) return res.status(404).json({ success: false, error: "Show not found" });
      res.json({ success: true, show });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async unregisterGmailThread(req, res) {
    try {
      const { id, threadId } = req.params;
      const show = await ShowsService.unregisterGmailThread(id, threadId);
      if (!show) return res.status(404).json({ success: false, error: "Show not found" });
      res.json({ success: true, show });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getByThreadId(req, res) {
    try {
      const { threadId } = req.params;
      const shows = await ShowsService.getByGmailThreadId(threadId);
      const result = shows.map((show) => ({
        googleFolderId: show.googleFolderId,
        artist: show.artist,
        date: show.date,
        deleted: show.deleted,
      }));
      res.json({ success: true, shows: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async search(req, res) {
    try {
      const { q, upcomingOnly } = req.query;
      const shows = await ShowsService.search(q, upcomingOnly);
      const result = shows.map((show) => ({
        googleFolderId: show.googleFolderId,
        artist: show.artist,
        date: show.date,
      }));
      res.json({ success: true, shows: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default ShowsController;
