import express from "express";

import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import Controller from "./groups.controller.js";
import Schemas from "./groups.schemas.js";

const router = express.Router();

router.get("/groups", validate(Schemas.getAllGroups), validateApiToken, Controller.getAllGroups);
router.get("/groups/:id", validate(Schemas.getGroup), validateApiToken, Controller.getGroup);
router.post("/groups", validate(Schemas.addGroup), validateApiToken, Controller.addGroup);
router.patch(
  "/groups/:id",
  validate(Schemas.updateGroup),
  validateApiToken,
  Controller.updateGroup
);
router.delete(
  "/groups/:id",
  validate(Schemas.deleteGroup),
  validateApiToken,
  Controller.deleteGroup
);

export default router;
