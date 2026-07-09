import Joi from "joi";

import authHeaderSchema from "../auth/auth.header.schema.js";

class ContactsSchemas {
  static getAllContacts = {
    headers: authHeaderSchema,
  };

  static getContact = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
  };

  static addContact = {
    headers: authHeaderSchema,
    body: Joi.object({
      name: Joi.string().trim().min(1).required(),
      email: Joi.string().trim().email().required(),
    }),
  };

  static updateContact = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
    body: Joi.object({
      name: Joi.string().trim().min(1),
      email: Joi.string().trim().email(),
    }).min(1),
  };

  static deleteContact = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
  };
}

export default ContactsSchemas;
