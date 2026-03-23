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
}

export default ShowsSchemas;
