import GmailRepository from "./gmail.repository.js";

class GmailService {
  static async getThread({ threadId }) {
    return GmailRepository.getThread({ threadId });
  }

  static async getMessage({ messageId }) {
    return GmailRepository.getMessage({ messageId });
  }

  static async getAttachment({ messageId, attachmentId }) {
    return GmailRepository.getAttachment({ messageId, attachmentId });
  }

  static async sendMessage({ to, subject, body, from, sentLabels }) {
    return GmailRepository.sendMessage({ to, subject, body, from, sentLabels });
  }

  static async replyToMessage({ messageId, body, from, threadLabels, sentLabels }) {
    return GmailRepository.replyToMessage({
      messageId,
      body,
      from,
      threadLabels,
      sentLabels,
    });
  }

  static async forwardMessage({ messageId, to, body, from, threadLabels, sentLabels }) {
    return GmailRepository.forwardMessage({
      messageId,
      to,
      body,
      from,
      threadLabels,
      sentLabels,
    });
  }

  static async labelThread({ messageId, labels }) {
    return GmailRepository.labelThread({ messageId, labels });
  }

  static async getSignature({ address }) {
    return GmailRepository.getSignature({ address });
  }
}

export default GmailService;
