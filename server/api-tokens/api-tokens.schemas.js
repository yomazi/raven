import Joi from "joi";

class ApiTokensSchemas {
  static createApiToken = {
    body: Joi.object({
      email: Joi.string().email().required(),
    }),
  };
}

export default ApiTokensSchemas;
