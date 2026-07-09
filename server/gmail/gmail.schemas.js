import Joi from "joi";

import authHeaderSchema from "../auth/auth.header.schema.js";

// Accepts either a bare email ("a@b.com") or an RFC 5322 mailbox
// ("Name <a@b.com>") — the recipient picker sends the latter so sent
// messages carry a display name, matching how Gmail itself formats "To:".
const mailbox = Joi.string().custom((value, helpers) => {
  const match = /^(.*)<([^<>]+)>\s*$/.exec(value.trim());
  const email = match ? match[2].trim() : value.trim();

  if (Joi.string().email().validate(email).error) {
    return helpers.error("string.email");
  }
  return value;
}, "email address or \"Name <email>\" mailbox");

// A file picked from the show's Drive folder to attach to an outgoing message.
// The server fetches the actual bytes from Drive by driveFileId — the client
// only ever sends the reference plus the display filename.
const driveAttachment = Joi.object({
  driveFileId: Joi.string().required(),
  filename: Joi.string().required(),
  mimeType: Joi.string().required(),
});

class GmailSchemas {
  static getThread = {
    headers: authHeaderSchema,
    params: Joi.object({
      threadId: Joi.string().required(),
    }),
  };

  static getMessage = {
    headers: authHeaderSchema,
    params: Joi.object({
      messageId: Joi.string().required(),
    }),
  };

  static getAttachment = {
    headers: authHeaderSchema,
    params: Joi.object({
      messageId: Joi.string().required(),
      attachmentId: Joi.string().required(),
    }),
  };

  static sendMessage = {
    headers: authHeaderSchema,
    body: Joi.object({
      to: Joi.array().items(mailbox).min(1).required(),
      subject: Joi.string().required(),
      body: Joi.string().allow("").required(),
      from: Joi.string().optional(),
      sentLabels: Joi.array().items(Joi.string()).optional(),
      attachments: Joi.array().items(driveAttachment).optional(),
    }),
  };

  static replyToMessage = {
    headers: authHeaderSchema,
    params: Joi.object({
      messageId: Joi.string().required(),
    }),
    body: Joi.object({
      body: Joi.string().allow("").required(),
      from: Joi.string().optional(),
      // Labels to apply to the thread and sent message after sending
      threadLabels: Joi.array().items(Joi.string()).optional(),
      sentLabels: Joi.array().items(Joi.string()).optional(),
      attachments: Joi.array().items(driveAttachment).optional(),
    }),
  };

  static forwardMessage = {
    headers: authHeaderSchema,
    params: Joi.object({
      messageId: Joi.string().required(),
    }),
    body: Joi.object({
      to: Joi.array().items(mailbox).min(1).required(),
      body: Joi.string().allow("").required(),
      from: Joi.string().optional(),
      threadLabels: Joi.array().items(Joi.string()).optional(),
      sentLabels: Joi.array().items(Joi.string()).optional(),
      attachments: Joi.array().items(driveAttachment).optional(),
    }),
  };

  static labelThread = {
    headers: authHeaderSchema,
    params: Joi.object({
      messageId: Joi.string().required(),
    }),
    body: Joi.object({
      labels: Joi.array().items(Joi.string()).min(1).required(),
    }),
  };
}

export default GmailSchemas;
