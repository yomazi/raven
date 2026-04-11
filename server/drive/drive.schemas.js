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
      filename: Joi.string().required(), // the renamed filename from Raven
      mimeType: Joi.string().required(),
      folderId: Joi.string().required(),
    }),
  };

  static createShowFolder = {
    headers: authHeaderSchema,
    body: Joi.object({
      artist: Joi.string().required(),
      date: Joi.string().isoDate().required(),
      multipleShows: Joi.boolean().default(false),
    }),
  };

  static createSettlementWorkbook = {
    headers: authHeaderSchema,
    body: Joi.object({
      googleFolderId: Joi.string().required(),
    }),
  };

  static createMarketingAssetsFolder = {
    headers: authHeaderSchema,
    body: Joi.object({
      googleFolderId: Joi.string().required(),
    }),
  };
}

export default DriveSchemas;
