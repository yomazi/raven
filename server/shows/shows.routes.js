import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request.js";
import Controller from "./shows.controller.js";
import Schemas from "./shows.schemas.js";

import express from "express";
const router = express.Router();

// GET /api/shows/sync?rootFolderId=...
router.get("/shows/sync", validate(Schemas.sync), validateApiToken, Controller.syncShowsController);

export default router;
