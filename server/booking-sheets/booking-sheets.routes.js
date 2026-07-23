import express from "express";

import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import Controller from "./booking-sheets.controller.js";
import Schemas from "./booking-sheets.schemas.js";

const router = express.Router();

router.get("/booking-sync-issues", validate(Schemas.listIssues), validateApiToken, Controller.listIssues);
router.post(
  "/booking-sync-issues/:id/add-row",
  validate(Schemas.addRow),
  validateApiToken,
  Controller.addRow
);
router.post(
  "/booking-sync-issues/:id/dismiss",
  validate(Schemas.dismiss),
  validateApiToken,
  Controller.dismiss
);
router.post(
  "/shows/:googleFolderId/contracts/:contractId/booking-sync",
  validate(Schemas.syncContract),
  validateApiToken,
  Controller.syncContract
);

export default router;
