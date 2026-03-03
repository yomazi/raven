import Controller from "./auth.controller.js";
import Schemas from "./auth.schemas.js";

import express from "express";

const router = express.Router();

import { validate } from "../middlewares/validate-request-schema.js";

router.post("/auth/status", validate(Schemas.checkAuth), Controller.checkAuth);
router.post("/auth/expire", validate(Schemas.expireAuth), Controller.expireAuth);

export default router;
