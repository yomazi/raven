// ./routes/show.routes.js
const Schemas = require("./shows.schemas");
const Controller = require("./shows.controller");
const { validate } = require("../middlewares/validate-request");
const validateApiToken = require("../middlewares/validate-api-token");

const express = require("express");
const router = express.Router();

// GET /api/shows/sync?rootFolderId=...
router.get("/shows/sync", validate(Schemas.sync), validateApiToken, Controller.syncShowsController);

module.exports = router;
