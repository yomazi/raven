const Joi = require("joi");

const { API_TOKEN_LENGTH } = require("../utilities/constants.js");
const apiTokenChars = API_TOKEN_LENGTH * 2; // hex representation

const authHeaderSchema = Joi.object({
  authorization: Joi.string()
    .pattern(new RegExp(`^Bearer\\s[a-zA-Z0-9]{${apiTokenChars}}$`))
    .required()
    .messages({
      "string.pattern.base": "Authorization header must be in the format: Bearer <token>",
      "any.required": "Authorization header is required",
    }),
}).unknown(true); // unknown(true) allows other headers

module.exports = authHeaderSchema;
