import express from "express";
import validateApiToken from "../../middlewares/validate-api-token.js";
import { validate } from "../../middlewares/validate-request-schema.js";
import LiveReportsController from "./live-reports.controller.js";
import Schemas from "./live-reports.schemas.js";

const router = express.Router();

router.get("/reports/live", validate(Schemas.list), validateApiToken, LiveReportsController.list);
router.get(
  "/reports/live/:reportName",
  validate(Schemas.getStatus),
  validateApiToken,
  LiveReportsController.getStatus
);
router.post(
  "/reports/live/:reportName/ensure",
  validate(Schemas.ensure),
  validateApiToken,
  LiveReportsController.ensure
);

export default router;
