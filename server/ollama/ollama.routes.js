// server/ollama/ollama.routes.js

import express from "express";
import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import Controller from "./ollama.controller.js";
import Schemas from "./ollama.schemas.js";

const router = express.Router();

router.get("/ollama/health", validateApiToken, Controller.health);
router.post("/ollama/extract", validate(Schemas.extract), validateApiToken, Controller.extract);

export default router;
