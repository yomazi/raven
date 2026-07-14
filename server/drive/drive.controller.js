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
      res.set("Cache-Control", "no-store");
      res.json({ success: true, files });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async listSubfolders(req, res) {
    try {
      const { folderId } = req.params;
      const folders = await DriveService.listSubfolders({ folderId });
      res.set("Cache-Control", "no-store");
      res.json({ success: true, folders });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async downloadFile(req, res) {
    try {
      const { fileId } = req.params;
      const { buffer, mimeType, name } = await DriveService.downloadFile({ fileId });

      // ASCII fallback for filename= (older clients), plus the correct UTF-8
      // encoded value in filename* (RFC 5987) for everything else.
      const asciiName = name.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
      res.set("Content-Type", mimeType);
      res.set(
        "Content-Disposition",
        `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`
      );
      res.set("Cache-Control", "no-store");
      res.send(buffer);
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
      const [year, month, day] = date.split("T")[0].split("-").map(Number);
      const parsedDate = new Date(year, month - 1, day);
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

  static async createContractFolder(req, res) {
    try {
      const { googleFolderId, signee } = req.body;
      const result = await DriveService.createContractFolder({ googleFolderId, signee });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async archiveContractFolder(req, res) {
    try {
      const { contractId } = req.params;
      const { googleFolderId } = req.body;
      const result = await DriveService.archiveContractFolder({ googleFolderId, contractId });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async renameContractFolder(req, res) {
    try {
      const { contractId } = req.params;
      const { googleFolderId, signee } = req.body;
      const result = await DriveService.renameContractFolder({ googleFolderId, contractId, signee });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async generateContractDoc(req, res) {
    try {
      const { contractId } = req.params;
      const { googleFolderId } = req.body;
      const result = await DriveService.generateContractDoc({ googleFolderId, contractId });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async listImportableContractFolders(req, res) {
    try {
      const { folderId } = req.params;
      const folders = await DriveService.listImportableContractFolders({ googleFolderId: folderId });
      res.set("Cache-Control", "no-store");
      res.json({ success: true, folders });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async importContractFolder(req, res) {
    try {
      const { googleFolderId, subfolderId } = req.body;
      const result = await DriveService.importContractFolder({ googleFolderId, subfolderId });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async fetchFileText(req, res) {
    try {
      const { fileId } = req.params;
      const { mimeType } = req.query;
      const text = await DriveService.fetchFileText({ fileId, mimeType });
      res.json({ success: true, text });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default DriveController;
