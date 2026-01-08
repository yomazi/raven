const Joi = require("joi");
const authHeaderSchema = require("../auth/auth.header.schema");

class ApiTokensSchemas {
  static createApiToken = {
    headers: authHeaderSchema,
    body: Joi.object({
      email: Joi.string().email().required(),
    }),
  };
}

module.exports = ApiTokensSchemas;
