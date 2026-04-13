// server/ollama/ollama.schemas.js

import Joi from "joi";
import authHeaderSchema from "../auth/auth.header.schema.js";

class OllamaSchemas {
  static health = {
    headers: authHeaderSchema,
  };

  static extract = {
    headers: authHeaderSchema,
    body: Joi.object({
      text: Joi.string().min(1).required(),
      model: Joi.string().optional(),
    }),
  };
}

export default OllamaSchemas;
