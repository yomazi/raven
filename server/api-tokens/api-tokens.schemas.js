import Joi from "joi";
import authHeaderSchema from "../auth/auth.header.schema.js";

class ApiTokensSchemas {
  static createApiToken = {
    headers: authHeaderSchema,
    body: Joi.object({
      email: Joi.string().email().required(),
    }),
  };
}

export default ApiTokensSchemas;
