import Joi from "joi";
import authHeaderSchema from "./auth.header.schema.js";
import { API_TOKEN_LENGTH } from "../utilities/constants.js";

const apiTokenChars = API_TOKEN_LENGTH * 2; // hex representation

class AuthSchemas {
  static checkAuth = {};
  static expireAuth = {};

  static session = {
    headers: authHeaderSchema,
  };

  static tokenLogin = {
    body: Joi.object({
      token: Joi.string()
        .pattern(new RegExp(`^[a-zA-Z0-9]{${apiTokenChars}}$`))
        .required()
        .messages({
          "string.pattern.base": "That doesn't look like a valid token.",
          "any.required": "Enter a token.",
        }),
    }),
  };
}

export default AuthSchemas;
