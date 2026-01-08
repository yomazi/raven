const Schemas = require("./google.auth.schemas");
const Controller = require("./auth.controller");

const express = require("express");
const router = express.Router();

const { validate } = require("../middlewares/validate-request");

router.get("/auth/google", validate(Schemas.getAuth), Controller.getAuth);
router.get("/auth/google/callback", validate(Schemas.getAuthCallback), Controller.getAuthCallback);

module.exports = router;
