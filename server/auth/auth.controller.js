import { getRedirectUri } from "../utilities/google-client.js";
import { cookifyApiToken } from "../utilities/helpers.js";
import AuthService from "./auth.service.js";

class AuthController {
  static async getAuth(req, res, next) {
    try {
      const host = req.get("host"); // e.g., "localhost:3001" or "raven.neuron9.io"
      const redirectUri = getRedirectUri(host);
      const url = await AuthService.getAuthUrl(redirectUri);

      return res.redirect(url);
    } catch (error) {
      next(error);
    }
  }

  static async getAuthCallback(req, res, next) {
    try {
      const code = req.query.code;
      if (!code) return res.status(400).json({ error: "No code in callback" });

      const host = req.get("host");
      const redirectUri = getRedirectUri(host);

      const apiToken = await AuthService.handleAuthCallback(code, redirectUri);

      cookifyApiToken(res, apiToken);

      res.redirect("/"); // React app
    } catch (error) {
      next(error);
    }
  }

  static async checkAuth(req, res, next) {
    try {
      await AuthService.checkAuth();

      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }

  static async expireAuth(req, res, next) {
    try {
      await AuthService.expireAuth();

      // Clear cookie in browser
      res.clearCookie("apiToken", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });

      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }

  static async createApiToken(req, res, next) {
    try {
      const { email } = req.body;

      await AuthService.createApiToken(email);

      res.status(200).json(`token sent to: ${email}`);
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
