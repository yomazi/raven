import BookingSheetsService from "./booking-sheets.service.js";

class BookingSheetsController {
  static async listIssues(req, res) {
    try {
      const issues = await BookingSheetsService.listUnresolvedIssues();
      res.json({ success: true, issues });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async addRow(req, res) {
    try {
      const { id } = req.params;
      const issue = await BookingSheetsService.addRowForIssue(id);
      res.json({ success: true, issue });
    } catch (err) {
      console.error(err);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async dismiss(req, res) {
    try {
      const { id } = req.params;
      const issue = await BookingSheetsService.dismissIssue(id);
      res.json({ success: true, issue });
    } catch (err) {
      console.error(err);
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async syncContract(req, res) {
    try {
      const { googleFolderId, contractId } = req.params;
      const result = await BookingSheetsService.syncContractStatus({ googleFolderId, contractId });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

export default BookingSheetsController;
