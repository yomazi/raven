import { google } from "googleapis";
import createError from "http-errors";

import ApiTokensService from "../api-tokens/api-tokens.service.js";
import EmailService from "../services/email.service.js";
import { USER_EMAIL } from "../utilities/constants.js";
import { createOAuthClient, generateAuthUrl } from "../utilities/google-client.js";
import AuthDbRepository from "./auth.db.repository.js";

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

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
    });

    return client;
  }
}
export default AuthService;
