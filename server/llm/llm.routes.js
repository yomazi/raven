// server/llm/llm.routes.js

import express from "express";
import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import Controller from "./llm.controller.js";
import Schemas from "./llm.schemas.js";

const router = express.Router();

router.get("/llm/health", validateApiToken, Controller.health);
router.post("/llm/extract", validate(Schemas.extract), validateApiToken, Controller.extract);

export default router;
