const Schemas = require("./auth.schemas");
const Controller = require("./auth.controller");

const express = require("express");
const router = express.Router();

const { validate } = require("../middlewares/validate-request");
const validateApiToken = require("../middlewares/validate-api-token");

router.post("/auth/status", validate(Schemas.checkAuth), validateApiToken, Controller.checkAuth);
router.post("/auth/expire", validate(Schemas.expireAuth), validateApiToken, Controller.expireAuth);
//router.post("/auth/create-api-token", validate(Schemas.createApiToken), Controller.createApiToken);

module.exports = router;
