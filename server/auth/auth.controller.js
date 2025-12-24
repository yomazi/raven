const { getRedirectUri, createOAuthClient, generateAuthUrl } = require("../google/client");
const { google } = require("googleapis");

class AuthController {
  static async getAuth(req, res, next) {
    try {
      const client = createOAuthClient(req);

      // Save the exact redirect URI used for this login in session
      req.session.redirectUri = client.redirectUri;

      console.log("Using redirect URI:", getRedirectUri(req));

      const hasRefreshToken = !!req.session.user?.tokens?.refresh_token;
      const url = generateAuthUrl(client, hasRefreshToken);
      console.log(`redirecting to: ${url}`);
      res.redirect(url);
    } catch (err) {
      console.error("Failed to generate auth URL:", err);
      res.status(500).send("Internal Server Error — see server console");
    }
  }

  static async getAuthCallback(req, res, next) {
    const code = req.query.code;

    if (!code) {
      console.warn("No code received from Google. Clearing session and retrying...");
      req.session.user = null; // clear stale tokens
      return res.redirect("/auth/google"); // restart OAuth
    }

    const client = createOAuthClient(req); // fresh client
    const { tokens } = await client.getToken(code); // exchange code
    client.setCredentials(tokens);

    //  const oauth2Client = createOAuthClientWithSession(req);

    console.log("tokens:");
    console.log(tokens);

    //google.options({ auth: oauth2Client });

    // Get basic user info
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const userinfo = await oauth2.userinfo.get();

    // Store user session in memory
    req.session.user = {
      email: userinfo.data.email,
      name: userinfo.data.name,
      tokens,
    };

    res.redirect("/"); // redirect to frontend
  }

  static async expireAuth(req, res, next) {
    if (!req.session.user?.tokens) {
      return res.status(400).send("No tokens in session");
    }

    // Mark the access token as expired
    req.session.user.tokens.expiry_date = Date.now() - 1000; // 1 second in the past
    // Optionally clear the access token entirely
    req.session.user.tokens.access_token = null;

    console.warn("Access token is now expired for testing purposes");

    res.redirect("/"); // redirect to frontend
  }
}
module.exports = AuthController;
