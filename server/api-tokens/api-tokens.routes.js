import Controller from "./api-tokens.controller.js";
import Schemas from "./api-tokens.schemas.js";

import express from "express";

const router = express.Router();

import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request.js";

router.post(
  "/auth/create-api-token",
  validate(Schemas.createApiToken),
  validateApiToken,
  Controller.createApiToken
);

export default router;
