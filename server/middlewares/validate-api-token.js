// middlewares/requireApiToken.js
import createError from "http-errors";

import ApiTokensService from "../api-tokens/api-tokens.service.js"; // your DB methods

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
    const apiTokenDoc = await ApiTokensService.getApiToken(apiToken);

    if (!apiTokenDoc) {
      throw new createError.Unauthorized("Invalid API token");
    }

    if (apiTokenDoc.revoked) {
      throw new createError.Unauthorized("API token has been revoked");
    }

    next();
  } catch (err) {
    next(err);
  }
}

export default validateApiToken;
