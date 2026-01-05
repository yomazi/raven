const { createOAuthClient, generateAuthUrl } = require("../utilities/google-client");
const { generateApiToken } = require("../utilities/helpers");
const { google } = require("googleapis");
const AuthDbRepository = require("./auth.db.repository.js");
const { USER_EMAIL } = require("../utilities/constants.js");

class AuthService {
  static async getAuthUrl(redirectUri) {
    const client = createOAuthClient(redirectUri);
    const user = await AuthDbRepository.getUserByEmail();
    const url = generateAuthUrl(client);

    return url;
  }

  static async handleAuthCallback(code, redirectUri = false) {
    const client = createOAuthClient(redirectUri); // fresh client
    const { tokens } = await client.getToken(code); // exchange code
    client.setCredentials(tokens);

    // Get basic user info
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();
    const apiToken = generateApiToken();

    // Upsert user in DB
    const user = await AuthDbRepository.upsertGoogleUser({
      email: data.email,
      tokens,
      apiToken,
    });

    return user;
  }

  static async expireAuth() {
    const user = await AuthDbRepository.getUserByEmail();

    if (!user) return;
    await AuthDbRepository.clearTokens();
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
