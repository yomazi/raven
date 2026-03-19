import Joi from "joi";
import authHeaderSchema from "../auth/auth.header.schema.js";

class DriveSchemas {
  static sync = {
    headers: authHeaderSchema,
    body: Joi.object({
      fromDate: Joi.string().isoDate().optional(),
    }),
  };

  static listFolderFiles = {
    headers: authHeaderSchema,
    params: Joi.object({
      folderId: Joi.string().required(),
    }),
  };

  static upload = {
    headers: authHeaderSchema,
    // multer populates req.body from the non-file multipart fields
    body: Joi.object({
      filename: Joi.string().required(), // the renamed filename from Dragonfly
      mimeType: Joi.string().required(),
      folderId: Joi.string().required(),
    }),
  };
}

export default DriveSchemas;
