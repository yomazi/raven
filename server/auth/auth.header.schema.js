const Joi = require("joi");

const authHeaderSchema = Joi.object({
  authorization: Joi.string()
    .pattern(/^Bearer\s[a-zA-Z0-9\-_.]+$/)
    .required()
    .messages({
      "string.pattern.base": "Authorization header must be in the format: Bearer <token>",
      "any.required": "Authorization header is required",
    }),
}).unknown(true); // unknown(true) allows other headers

module.exports = authHeaderSchema;
