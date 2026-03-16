import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import Controller from "./shows.controller.js";
import Schemas from "./shows.schemas.js";

import express from "express";
const router = express.Router();

router.get("/shows/hello", validate(Schemas.hello), validateApiToken, Controller.hello);
router.get("/shows", validate(Schemas.getAll), validateApiToken, Controller.getAll);

export default router;
