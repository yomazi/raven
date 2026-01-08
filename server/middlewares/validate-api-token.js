// middlewares/requireApiToken.js
const createError = require("http-errors");
const ApiTokensService = require("../api-tokens/api-tokens.service.js"); // your DB methods

/**
 * Middleware to require a valid API token in the Authorization header.
 */
async function validateApiToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new createError.Unauthorized("Authorization header missing or malformed");
    }

    const apiToken = authHeader.split(" ")[1];
    const apiTokenHash = await ApiTokensService.getApiToken(apiToken);

    if (!apiTokenHash) {
      throw new createError.Unauthorized("Invalid API token");
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = validateApiToken;
