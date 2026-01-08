const Joi = require("joi");
const authHeaderSchema = require("../auth/auth.header.schema");
class AuthSchemas {
  static getAuth = {};
  static getAuthCallback = {};
  static checkAuth = {
    headers: authHeaderSchema,
  };
  static expireAuth = {
    headers: authHeaderSchema,
  };
  static createApiToken = {
    body: Joi.object({
      email: Joi.string().email().required(),
    }),
  };
}

module.exports = AuthSchemas;
