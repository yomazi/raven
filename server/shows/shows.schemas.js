import Joi from "joi";
import authHeaderSchema from "../auth/auth.header.schema.js";

class ShowsSchemas {
  static getAll = {
    headers: authHeaderSchema,
  };

  static getById = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
  };
}

export default ShowsSchemas;
