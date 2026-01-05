const Joi = require("joi");
const authHeaderSchema = require("../auth/auth.header.schema");

class PerformancesSchemas {
  static getPerformances = Joi.object({
    headers: authHeaderSchema,
  });
}

module.exports = PerformancesSchemas;
