import express from "express";
import multer from "multer";

import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import Controller from "./drive.controller.js";
import Schemas from "./drive.schemas.js";

const router = express.Router();

// Memory storage — file lands in req.file.buffer, no disk I/O
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/drive/sync - sync shows from Google Drive to DB
router.post("/drive/sync", validate(Schemas.sync), validateApiToken, Controller.sync);

// GET /api/v1/drive/folders/:folderId/files
router.get(
  "/drive/folders/:folderId/files",
  validate(Schemas.listFolderFiles),
  validateApiToken,
  Controller.listFolderFiles
);

// POST /api/v1/drive/upload
// multer runs before validate so req.body is populated from the multipart fields
router.post(
  "/drive/upload",
  upload.single("file"),
  validate(Schemas.upload),
  validateApiToken,
  Controller.upload
);

router.post(
  "/drive/folders/show",
  validate(Schemas.createShowFolder),
  validateApiToken,
  Controller.createShowFolder
);

router.post(
  "/drive/settlement-workbook",
  validate(Schemas.createSettlementWorkbook),
  validateApiToken,
  Controller.createSettlementWorkbook
);

router.post(
  "/drive/marketing-assets-folder",
  validate(Schemas.createMarketingAssetsFolder),
  validateApiToken,
  Controller.createMarketingAssetsFolder
);

export default router;
