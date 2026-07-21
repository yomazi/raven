import Controller from "./auth.controller.js";
import Schemas from "./auth.schemas.js";

import express from "express";

const router = express.Router();

import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";

router.post("/auth/status", validate(Schemas.checkAuth), Controller.checkAuth);
router.post("/auth/expire", validate(Schemas.expireAuth), Controller.expireAuth);
router.post("/auth/token-login", validate(Schemas.tokenLogin), Controller.tokenLogin);
router.get("/auth/session", validate(Schemas.session), validateApiToken, Controller.session);

export default router;
