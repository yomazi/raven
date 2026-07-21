import Joi from "joi";

import authHeaderSchema from "../auth/auth.header.schema.js";

class SettingsSchemas {
  static getAllSettings = {
    headers: authHeaderSchema,
  };

  static updateSetting = {
    headers: authHeaderSchema,
    params: Joi.object({
      key: Joi.string().required(),
    }),
    body: Joi.object({
      environment: Joi.string().valid("test", "prod").required(),
      value: Joi.string().allow("").required(),
    }),
  };
}

export default SettingsSchemas;
