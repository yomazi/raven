import Joi from "joi";
import authHeaderSchema from "../auth/auth.header.schema.js";

class ShowsSchemas {
  static getAll = {
    headers: authHeaderSchema,
  };

  static getById = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
  };

  static patch = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
    body: Joi.object().min(1), // any non-empty object is valid — validation lives in service
  };

  static registerGmailThread = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
    body: Joi.object({
      threadId: Joi.string().required(),
    }),
  };

  static unregisterGmailThread = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
      threadId: Joi.string().required(),
    }),
  };

  static getByThreadId = {
    headers: authHeaderSchema,
    params: Joi.object({
      threadId: Joi.string().required(),
    }),
  };

  static search = {
    headers: authHeaderSchema,
    query: Joi.object({
      q: Joi.string().required(),
      upcomingOnly: Joi.boolean().default(true),
    }),
  };
}

export default ShowsSchemas;
