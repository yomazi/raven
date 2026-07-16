import Joi from "joi";
import authHeaderSchema from "../../auth/auth.header.schema.js";

class LiveReportSchemas {
  static list = {
    headers: authHeaderSchema,
  };

  static getStatus = {
    headers: authHeaderSchema,
    params: Joi.object({
      reportName: Joi.string().required(),
    }),
  };

  static ensure = {
    headers: authHeaderSchema,
    params: Joi.object({
      reportName: Joi.string().required(),
    }),
  };
}

export default LiveReportSchemas;
