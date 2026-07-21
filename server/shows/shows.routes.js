import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import Controller from "./shows.controller.js";
import Schemas from "./shows.schemas.js";

import express from "express";
const router = express.Router();

router.get("/shows", validate(Schemas.getAll), validateApiToken, Controller.getAll);
router.get("/shows/search", validate(Schemas.search), validateApiToken, Controller.search);
router.get("/shows/by-thread/:threadId", validate(Schemas.getByThreadId), validateApiToken, Controller.getByThreadId);
router.get("/shows/:id", validate(Schemas.getById), validateApiToken, Controller.getById);
router.patch("/shows/:id", validate(Schemas.patch), validateApiToken, Controller.patch);
router.post("/shows/:id/threads", validate(Schemas.registerGmailThread), validateApiToken, Controller.registerGmailThread);
router.delete(
  "/shows/:id/threads/:threadId",
  validate(Schemas.unregisterGmailThread),
  validateApiToken,
  Controller.unregisterGmailThread
);

export default router;
