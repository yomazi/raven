import express from "express";

import validateApiToken from "../middlewares/validate-api-token.js";
import { validate } from "../middlewares/validate-request-schema.js";
import Controller from "./gmail.controller.js";
import Schemas from "./gmail.schemas.js";

const router = express.Router();

// GET /api/v1/gmail/threads/:threadId
router.get(
  "/gmail/threads/:threadId",
  validate(Schemas.getThread),
  validateApiToken,
  Controller.getThread
);

// GET /api/v1/gmail/messages/:messageId
router.get(
  "/gmail/messages/:messageId",
  validate(Schemas.getMessage),
  validateApiToken,
  Controller.getMessage
);

// GET /api/v1/gmail/attachments/:messageId/:attachmentId
router.get(
  "/gmail/attachments/:messageId/:attachmentId",
  validate(Schemas.getAttachment),
  validateApiToken,
  Controller.getAttachment
);

// POST /api/v1/gmail/messages/send
router.post(
  "/gmail/messages/send",
  validate(Schemas.sendMessage),
  validateApiToken,
  Controller.sendMessage
);

// POST /api/v1/gmail/messages/:messageId/reply
router.post(
  "/gmail/messages/:messageId/reply",
  validate(Schemas.replyToMessage),
  validateApiToken,
  Controller.replyToMessage
);

// POST /api/v1/gmail/messages/:messageId/forward
router.post(
  "/gmail/messages/:messageId/forward",
  validate(Schemas.forwardMessage),
  validateApiToken,
  Controller.forwardMessage
);

// POST /api/v1/gmail/messages/:messageId/label
router.post(
  "/gmail/messages/:messageId/label",
  validate(Schemas.labelThread),
  validateApiToken,
  Controller.labelThread
);

export default router;
