import Joi from "joi";
import authHeaderSchema from "../auth/auth.header.schema.js";

class ReportSchemas {
  static list = {
    headers: authHeaderSchema,
  };

  static generate = {
    headers: authHeaderSchema,
    body: Joi.object({
      name: Joi.string().required(),
    }),
  };

  static listSchedules = {
    headers: authHeaderSchema,
  };

  static upsertSchedule = {
    headers: authHeaderSchema,
    params: Joi.object({
      reportName: Joi.string().required(),
    }),
    body: Joi.object({
      cronExpression: Joi.string().required(),
      enabled: Joi.boolean().required(),
    }),
  };

  static deleteSchedule = {
    headers: authHeaderSchema,
    params: Joi.object({
      reportName: Joi.string().required(),
    }),
  };
}

export default ReportSchemas;
