const mongoose = require("mongoose");

const apiTokenSchema = new mongoose.Schema({
  apiTokenHash: { type: String, required: true, unique: true },
  apiTokenCreatedAt: { type: Date, default: Date.now },
});

const ApiToken = mongoose.model("ApiToken", apiTokenSchema, "ApiTokens");

module.exports = ApiToken;
