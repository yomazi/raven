const Schemas = require("./auth.schemas");
const Controller = require("./auth.controller");

const express = require("express");
const router = express.Router();

const { validate } = require("../middlewares/validate-request");

router.get("/google", validate(Schemas.getAuth), Controller.getAuth);
router.get("/google/callback", validate(Schemas.getAuthCallback), Controller.getAuthCallback);
router.get("/google/status", validate(Schemas.getAuthStatus), Controller.getAuthStatus);
router.post("/google/expire", validate(Schemas.expireAuth), Controller.expireAuth);
router.post("/token", validate(Schemas.getApiToken), Controller.getApiToken);

module.exports = router;
