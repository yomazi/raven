import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import Controller from "./shows.controller.js";
import Schemas from "./shows.schemas.js";

import express from "express";
const router = express.Router();

router.get("/shows", validate(Schemas.getAll), validateApiToken, Controller.getAll);
router.get("/shows/:id", validate(Schemas.getById), validateApiToken, Controller.getById);
router.patch("/shows/:id", validate(Schemas.patch), validateApiToken, Controller.patch);

export default router;
