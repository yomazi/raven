const { getRedirectUri } = require("../utilities/google-client");
const AuthService = require("./auth.service.js");

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

      AuthController.cookifyApiToken(res, apiToken);

      res.redirect("/"); // React app
    } catch (error) {
      next(error);
    }
  }

  static cookifyApiToken(res, apiToken) {
    if (apiToken) {
      res.cookie("apiToken", apiToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      });
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

      res.sendStatus(200); // simple JSON response
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

module.exports = AuthController;
