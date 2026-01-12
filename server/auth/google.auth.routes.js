import Controller from "./auth.controller.js";
import Schemas from "./google.auth.schemas.js";

import express from "express";
const router = express.Router();

import { validate } from "../middlewares/validate-request.js";

router.get("/auth/google", validate(Schemas.getAuth), Controller.getAuth);
router.get("/auth/google/callback", validate(Schemas.getAuthCallback), Controller.getAuthCallback);

export default router;
