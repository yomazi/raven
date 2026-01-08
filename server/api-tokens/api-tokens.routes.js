const Schemas = require("./api-tokens.schemas");
const Controller = require("./api-tokens.controller");

const express = require("express");
const router = express.Router();

const { validate } = require("../middlewares/validate-request");
const validateApiToken = require("../middlewares/validate-api-token");

router.post(
  "/auth/create-api-token",
  validate(Schemas.createApiToken),
  validateApiToken,
  Controller.createApiToken
);

module.exports = router;
