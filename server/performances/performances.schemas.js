const Joi = require("joi");
const authHeaderSchema = require("../auth/auth.header.schema");

class PerformancesSchemas {
  static getPerformances = {
    headers: authHeaderSchema,
  };
}

module.exports = PerformancesSchemas;
