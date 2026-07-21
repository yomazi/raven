import Controller from "./api-tokens.controller.js";
import Schemas from "./api-tokens.schemas.js";

import express from "express";

const router = express.Router();

import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";

router.get("/api-tokens", validate(Schemas.list), validateApiToken, Controller.list);
router.post("/api-tokens", validate(Schemas.create), validateApiToken, Controller.create);
router.delete("/api-tokens/:id", validate(Schemas.revoke), validateApiToken, Controller.revoke);

export default router;
