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
}

export default GmailSchemas;
