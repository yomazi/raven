const Schemas = require("./performances.schemas");
const Controller = require("./performances.controller");
const { validate } = require("../middlewares/validate-request");
const validateApiToken = require("../middlewares/validate-api-token");

// ./routes/performances.routes.js
const express = require("express");
const router = express.Router();

router.get(
  "/performances",
  validate(Schemas.getPerformances),
  validateApiToken,
  Controller.getPerformances
);

module.exports = router;
