const { createOAuthClient, generateAuthUrl } = require("../utilities/google-client");
const { google } = require("googleapis");
const createError = require("http-errors");
const EmailService = require("../services/email.service.js");
const ApiTokensService = require("../api-tokens/api-tokens.service.js");
const AuthDbRepository = require("./auth.db.repository.js");
const { USER_EMAIL, API_TOKEN_LENGTH } = require("../utilities/constants.js");
class AuthService {
  static async getAuthUrl(redirectUri) {
    const client = createOAuthClient(redirectUri);
    const user = await AuthDbRepository.getUserByEmail(USER_EMAIL);
    const url = generateAuthUrl(client);

    return url;
  }

  static async handleAuthCallback(code, redirectUri = false) {
    const client = createOAuthClient(redirectUri); // create a fresh client
    const { tokens } = await client.getToken(code); // get the exchange code

    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client }); // Get basic user info
    const { data } = await oauth2.userinfo.get();
    const apiToken = await ApiTokensService.createApiToken();

    await AuthDbRepository.upsertUser(data.email, tokens);
    await EmailService.sendApiToken(apiToken); // send the new api token via email

    return apiToken;
  }

  static async checkAuth() {
    const user = await AuthDbRepository.getUserByEmail(USER_EMAIL);

    if (!user || (user?.google && Object.keys(user?.google).length === 0)) {
      throw new createError.Unauthorized(`User not authenticated: ${USER_EMAIL}`);
    }
  }

  static async expireAuth() {
    const user = await AuthDbRepository.getUserByEmail(USER_EMAIL);

    if (!user) return;
    await AuthDbRepository.clearTokens();
  }

  static async getGoogleClient() {
    const user = await AuthDbRepository.getUserByEmail(USER_EMAIL);

    if (!user) {
      throw new createError.Unauthorized(`User not found: ${USER_EMAIL}`);
    }

    if (!user.google) {
      throw new createError.Unauthorized(`User not authenticated: ${USER_EMAIL}`);
    }

    const tokens = user.google;

    if (!tokens.refresh_token) {
      throw new Error("No refresh token found, please log in again.");
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
    });
  }
}
module.exports = AuthService;
