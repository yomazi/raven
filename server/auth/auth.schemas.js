const Joi = require("joi");
const authHeaderSchema = require("../auth/auth.header.schema");
class AuthSchemas {
  static checkAuth = {
    headers: authHeaderSchema,
  };
  static expireAuth = {};
}

module.exports = AuthSchemas;
