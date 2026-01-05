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

      const user = await AuthService.handleAuthCallback(code, redirectUri);

      res.cookie("apiToken", user.apiToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
      res.redirect("/"); // React app
    } catch (error) {
      next(error);
    }
  }

  static async getAuthStatus(req, res, next) {
    try {
      const token = req.cookies.apiToken;
      if (!token) return res.sendStatus(401);

      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  }

  static async expireAuth(req, res, next) {
    try {
      console.log("EXPIRING AUTH");
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

  static async getApiToken(req, res, next) {
    try {
      if (!apiToken) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      res.json({ token: apiToken });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
