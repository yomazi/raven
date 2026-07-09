import Joi from "joi";

import authHeaderSchema from "../auth/auth.header.schema.js";

class GroupsSchemas {
  static getAllGroups = {
    headers: authHeaderSchema,
  };

  static getGroup = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
  };

  static addGroup = {
    headers: authHeaderSchema,
    body: Joi.object({
      name: Joi.string().trim().min(1).required(),
      contacts: Joi.array().items(Joi.string()).default([]),
    }),
  };

  static updateGroup = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
    body: Joi.object({
      name: Joi.string().trim().min(1),
      contacts: Joi.array().items(Joi.string()),
    }).min(1),
  };

  static deleteGroup = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
  };
}

export default GroupsSchemas;
