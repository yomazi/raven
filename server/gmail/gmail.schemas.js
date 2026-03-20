import Joi from "joi";

import authHeaderSchema from "../auth/auth.header.schema.js";

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
      to: Joi.array().items(Joi.string().email()).min(1).required(),
      subject: Joi.string().required(),
      body: Joi.string().allow("").required(),
      from: Joi.string().email().optional(),
      sentLabels: Joi.array().items(Joi.string()).optional(),
    }),
  };

  static replyToMessage = {
    headers: authHeaderSchema,
    params: Joi.object({
      messageId: Joi.string().required(),
    }),
    body: Joi.object({
      body: Joi.string().allow("").required(),
      from: Joi.string().email().optional(),
      // Labels to apply to the thread and sent message after sending
      threadLabels: Joi.array().items(Joi.string()).optional(),
      sentLabels: Joi.array().items(Joi.string()).optional(),
    }),
  };

  static forwardMessage = {
    headers: authHeaderSchema,
    params: Joi.object({
      messageId: Joi.string().required(),
    }),
    body: Joi.object({
      to: Joi.array().items(Joi.string().email()).min(1).required(),
      body: Joi.string().allow("").required(),
      from: Joi.string().email().optional(),
      threadLabels: Joi.array().items(Joi.string()).optional(),
      sentLabels: Joi.array().items(Joi.string()).optional(),
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
