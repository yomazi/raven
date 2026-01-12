import Controller from "./auth.controller.js";
import Schemas from "./auth.schemas.js";

import express from "express";

const router = express.Router();

import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request.js";

router.post("/auth/status", validate(Schemas.checkAuth), validateApiToken, Controller.checkAuth);
router.post("/auth/expire", validate(Schemas.expireAuth), validateApiToken, Controller.expireAuth);

export default router;
