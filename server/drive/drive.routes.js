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

// GET /api/v1/drive/folders/:folderId/subfolders
router.get(
  "/drive/folders/:folderId/subfolders",
  validate(Schemas.listSubfolders),
  validateApiToken,
  Controller.listSubfolders
);

// GET /api/v1/drive/files/:fileId/download
router.get(
  "/drive/files/:fileId/download",
  validate(Schemas.downloadFile),
  validateApiToken,
  Controller.downloadFile
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
  "/drive/folders/show/rename",
  validate(Schemas.renameShowFolder),
  validateApiToken,
  Controller.renameShowFolder
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

router.post(
  "/drive/contract-folder",
  validate(Schemas.createContractFolder),
  validateApiToken,
  Controller.createContractFolder
);

router.post(
  "/drive/contracts/:contractId/archive",
  validate(Schemas.archiveContractFolder),
  validateApiToken,
  Controller.archiveContractFolder
);

router.post(
  "/drive/contracts/:contractId/rename",
  validate(Schemas.renameContractFolder),
  validateApiToken,
  Controller.renameContractFolder
);

router.post(
  "/drive/contracts/:contractId/set-main",
  validate(Schemas.setMainContract),
  validateApiToken,
  Controller.setMainContract
);

router.post(
  "/drive/contracts/:contractId/generate",
  validate(Schemas.generateContractDoc),
  validateApiToken,
  Controller.generateContractDoc
);

router.get(
  "/drive/folders/:folderId/importable-contract-folders",
  validate(Schemas.listImportableContractFolders),
  validateApiToken,
  Controller.listImportableContractFolders
);

router.post(
  "/drive/contract-folder/import",
  validate(Schemas.importContractFolder),
  validateApiToken,
  Controller.importContractFolder
);

router.get(
  "/drive/files/:fileId/text",
  validate(Schemas.fetchFileText),
  validateApiToken,
  Controller.fetchFileText
);

export default router;
