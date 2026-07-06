// server/llm/llm.schemas.js

import Joi from "joi";
import authHeaderSchema from "../auth/auth.header.schema.js";

class LlmSchemas {
  static health = {
    headers: authHeaderSchema,
  };

  static extract = {
    headers: authHeaderSchema,
    body: Joi.object({
      text: Joi.string().min(1).required(),
    }),
  };
}

export default LlmSchemas;
