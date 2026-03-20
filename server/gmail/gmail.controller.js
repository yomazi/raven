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

      res.set({
        "Content-Type": mimeType,
        "Content-Length": size,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      });
      res.send(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async sendMessage(req, res) {
    try {
      const { to, subject, body, from, sentLabels } = req.body;
      const result = await GmailService.sendMessage({ to, subject, body, from, sentLabels });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async replyToMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { body, from, threadLabels, sentLabels } = req.body;
      const result = await GmailService.replyToMessage({
        messageId,
        body,
        from,
        threadLabels,
        sentLabels,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async forwardMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { to, body, from, threadLabels, sentLabels } = req.body;
      const result = await GmailService.forwardMessage({
        messageId,
        to,
        body,
        from,
        threadLabels,
        sentLabels,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async labelThread(req, res) {
    try {
      const { messageId } = req.params;
      const { labels } = req.body;
      const result = await GmailService.labelThread({ messageId, labels });
      res.json({ success: true, ...result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export default GmailController;
