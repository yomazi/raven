import GmailRepository from "./gmail.repository.js";

class GmailService {
  static async getThread({ threadId }) {
    const thread = GmailRepository.getThread({ threadId });

    return thread;
  }

  static async getMessage({ messageId }) {
    const message = GmailRepository.getMessage({ messageId });

    return message;
  }

  static async getAttachment({ messageId, attachmentId }) {
    const attachment = GmailRepository.getAttachment({ messageId, attachmentId });

    return attachment;
  }
}

export default GmailService;
