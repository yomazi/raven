import express from "express";

import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import Controller from "./contacts.controller.js";
import Schemas from "./contacts.schemas.js";

const router = express.Router();

router.get(
  "/contacts",
  validate(Schemas.getAllContacts),
  validateApiToken,
  Controller.getAllContacts
);
router.get(
  "/contacts/:id",
  validate(Schemas.getContact),
  validateApiToken,
  Controller.getContact
);
router.post("/contacts", validate(Schemas.addContact), validateApiToken, Controller.addContact);
router.patch(
  "/contacts/:id",
  validate(Schemas.updateContact),
  validateApiToken,
  Controller.updateContact
);
router.delete(
  "/contacts/:id",
  validate(Schemas.deleteContact),
  validateApiToken,
  Controller.deleteContact
);

export default router;
