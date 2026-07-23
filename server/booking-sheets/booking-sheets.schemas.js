import Joi from "joi";
import authHeaderSchema from "../auth/auth.header.schema.js";

class BookingSheetsSchemas {
  static listIssues = {
    headers: authHeaderSchema,
  };

  static addRow = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
  };

  static dismiss = {
    headers: authHeaderSchema,
    params: Joi.object({
      id: Joi.string().required(),
    }),
  };

  static syncContract = {
    headers: authHeaderSchema,
    params: Joi.object({
      googleFolderId: Joi.string().required(),
      contractId: Joi.string().required(),
    }),
  };
}

export default BookingSheetsSchemas;
