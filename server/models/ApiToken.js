import mongoose from "mongoose";

const apiTokenSchema = new mongoose.Schema({
  apiTokenHash: { type: String, required: true, unique: true },
  apiTokenCreatedAt: { type: Date, default: Date.now },
  // null for tokens minted by the login flow (session tokens) — only
  // explicitly-named tokens created via the API Tokens management UI show
  // up there, keeping login churn out of that list.
  name: { type: String, default: null },
  revoked: { type: Boolean, default: false },
});

const ApiToken = mongoose.model("ApiToken", apiTokenSchema, "ApiTokens");

export default ApiToken;
