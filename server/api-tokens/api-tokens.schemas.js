import Joi from "joi";
import authHeaderSchema from "../auth/auth.header.schema.js";

class ApiTokensSchemas {
  static list = {
    headers: authHeaderSchema,
  };

  static create = {
    headers: authHeaderSchema,
    body: Joi.object({
      name: Joi.string().min(1).required(),
    }),
  };

  static revoke = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
  };
}

export default ApiTokensSchemas;
