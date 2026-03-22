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

  static async listFolderFiles(req, res) {
    try {
      const { folderId } = req.params;
      const files = await DriveService.listFolderFiles({ folderId });
      res.json({ success: true, files });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async upload(req, res) {
    try {
      // req.file is populated by multer; req.body has the non-file fields
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No file received." });
      }

      const { filename, mimeType, folderId } = req.body;

      const result = await DriveService.uploadFile({
        buffer: req.file.buffer,
        filename,
        mimeType,
        folderId,
      });

      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createShowFolder(req, res) {
    try {
      const { artist, date, multipleShows } = req.body;
      const parsedDate = new Date(date);

      const result = await DriveService.createShowFolder({
        artist,
        date: parsedDate,
        multipleShows,
      });

      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createSettlementWorkbook(req, res) {
    try {
      const { googleFolderId } = req.body;
      const result = await DriveService.createSettlementWorkbook({ googleFolderId });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createMarketingAssetsFolder(req, res) {
    try {
      const { googleFolderId } = req.body;
      const result = await DriveService.createMarketingAssetsFolder({ googleFolderId });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default DriveController;
