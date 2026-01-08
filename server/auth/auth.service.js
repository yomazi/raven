const { createOAuthClient, generateAuthUrl } = require("../utilities/google-client");
const { google } = require("googleapis");
const createError = require("http-errors");
const crypto = require("crypto");
const EmailService = require("../services/email.service.js");
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
    const apiToken = await AuthService.createOrUpdateUser(data.email, tokens);

    await EmailService.sendApiToken(data.email, apiToken); // send the new api token via email

    return apiToken;
  }

  static async createOrUpdateUser(email, tokens) {
    const apiToken = AuthService.generateApiToken();
    const hashedApiToken = AuthService.hashApiToken(apiToken);

    await AuthDbRepository.upsertUser(email, tokens, hashedApiToken);

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

  static async createApiToken(email) {
    const user = await AuthDbRepository.getUserByEmail(email);

    if (!user) {
      throw new createError.NotFound(`User not found: ${email}`);
    }

    const apiToken = AuthService.generateApiToken();
    const hashedToken = AuthService.hashApiToken(apiToken);

    await AuthDbRepository.saveApiTokenHash(user._id, hashedToken);

    await EmailService.send({
      to: email,
      subject: "Your Raven API Token",
      text: `Here is your Raven API token:\n\n${apiToken}\n\nKeep it safe!`,
    });
  }

  static async validateApiToken(apiToken) {
    const hashedToken = AuthService.hashApiToken(apiToken);
    const result = await AuthDbRepository.getUserByApiTokenHash(hashedToken);

    return result;
  }

  static generateApiToken() {
    return crypto.randomBytes(API_TOKEN_LENGTH).toString("hex"); // 64 chars
  }

  static hashApiToken(apiToken) {
    return crypto.createHash("sha256").update(apiToken).digest("hex");
  }

  static getGoogleClient(user) {
    const client = createOAuthClient(); // default redirectUri not needed for server-side usage
    client.setCredentials(user.google);

    // Refresh tokens are automatically persisted to DB
    client.on("tokens", async (newTokens) => {
      await AuthDbRepository.updateTokens({
        ...user.google,
        ...newTokens,
      });
    });

    return client;
  }
}
module.exports = AuthService;
