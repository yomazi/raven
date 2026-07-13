import express from "express";

import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import Controller from "./settings.controller.js";
import Schemas from "./settings.schemas.js";

const router = express.Router();

router.get(
  "/settings",
  validate(Schemas.getAllSettings),
  validateApiToken,
  Controller.getAllSettings
);
router.patch(
  "/settings/:key",
  validate(Schemas.updateSetting),
  validateApiToken,
  Controller.updateSetting
);

export default router;
