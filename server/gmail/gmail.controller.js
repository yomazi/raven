import GmailService from "./gmail.service.js";

class GmailController {
  static async getThread(req, res) {
    try {
      const { threadId } = req.params;
      const thread = await GmailService.getThread({ threadId });
      res.json({ success: true, ...thread });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getMessage(req, res) {
    try {
      const { messageId } = req.params;
      const message = await GmailService.getMessage({ messageId });
      res.json({ success: true, ...message });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getAttachment(req, res) {
    try {
      const { messageId, attachmentId } = req.params;
      const { data, mimeType, filename, size } = await GmailService.getAttachment({
        messageId,
        attachmentId,
      });

      // data is a Buffer — send as binary with appropriate headers
      res.set({
        "Content-Type": mimeType,
        "Content-Length": size,
        // Triggers a download if opened directly in a browser tab
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      });
      res.send(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default GmailController;
