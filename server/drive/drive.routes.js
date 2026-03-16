import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import Controller from "./drive.controller.js";
import Schemas from "./drive.schemas.js";

import express from "express";
const router = express.Router();

// POST /api/drive/sync - sync shows from Google Drive to DB
router.post("/drive/sync", validate(Schemas.sync), validateApiToken, Controller.sync);

export default router;
