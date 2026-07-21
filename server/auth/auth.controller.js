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

  static async tokenLogin(req, res, next) {
    try {
      const { token } = req.body;

      await AuthService.loginWithToken(token);
      cookifyApiToken(res, token);

      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }

  // Distinct from checkAuth: that checks whether the app-wide Google grant
  // exists at all (a single record, unrelated to any particular browser);
  // this checks whether *this request's own* token (cookie or header) is
  // currently valid — validateApiToken has already done that by the time
  // this runs, so getting here at all is the whole answer.
  static async session(req, res) {
    res.sendStatus(200);
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

}

export default AuthController;
