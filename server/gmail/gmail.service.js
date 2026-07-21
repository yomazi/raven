import GmailRepository from "./gmail.repository.js";

class GmailService {
  static async getThread({ threadId }) {
    return GmailRepository.getThread({ threadId });
  }

  static async getMessage({ messageId }) {
    return GmailRepository.getMessage({ messageId });
  }

  static async getAttachment({ messageId, attachmentId, mimeType, filename }) {
    return GmailRepository.getAttachment({ messageId, attachmentId, mimeType, filename });
  }

  static async sendMessage({ to, subject, body, from, sentLabels, attachments }) {
    return GmailRepository.sendMessage({ to, subject, body, from, sentLabels, attachments });
  }

  static async replyToMessage({ messageId, body, from, threadLabels, sentLabels, attachments }) {
    return GmailRepository.replyToMessage({
      messageId,
      body,
      from,
      threadLabels,
      sentLabels,
      attachments,
    });
  }

  static async forwardMessage({ messageId, to, body, from, threadLabels, sentLabels, attachments }) {
    return GmailRepository.forwardMessage({
      messageId,
      to,
      body,
      from,
      threadLabels,
      sentLabels,
      attachments,
    });
  }

  static async labelThread({ messageId, labels }) {
    return GmailRepository.labelThread({ messageId, labels });
  }
}

export default GmailService;
