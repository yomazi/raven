import Joi from "joi";
import authHeaderSchema from "../auth/auth.header.schema.js";

class DriveSchemas {
  static sync = {
    headers: authHeaderSchema,
    body: Joi.object({
      fromDate: Joi.string().isoDate().optional(),
    }),
  };
}

export default DriveSchemas;
