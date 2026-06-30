import express from "express";
import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import ReportsController from "./reports.controller.js";
import Schemas from "./reports.schemas.js";

const router = express.Router();

router.get("/reports", validate(Schemas.list), validateApiToken, ReportsController.listReports);
router.post("/reports/generate", validate(Schemas.generate), validateApiToken, ReportsController.generateReport);

router.get("/reports/schedules", validate(Schemas.listSchedules), validateApiToken, ReportsController.listSchedules);
router.put("/reports/schedules/:reportName", validate(Schemas.upsertSchedule), validateApiToken, ReportsController.upsertSchedule);
router.delete("/reports/schedules/:reportName", validate(Schemas.deleteSchedule), validateApiToken, ReportsController.deleteSchedule);

export default router;
