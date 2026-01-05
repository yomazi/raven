const { google } = require("googleapis");

const scopes = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
];

function getRedirectUri(host) {
  let redirectUri = "";

  if (host.startsWith("localhost")) {
    redirectUri = process.env.OAUTH_REDIRECT_DEV;
  } else if (host === "raven.neuron9.io") {
    redirectUri = process.env.OAUTH_REDIRECT_PROD;
  } else {
    throw new Error(`Unknown host: ${host}`);
  }

  console.log(`Using redirect URI: "${redirectUri}"`);

  return redirectUri;
}

function createOAuthClient(redirectUri) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

function createOAuthClientWithSession(req) {
  if (!req.session.user?.tokens) {
    throw new Error("No tokens in session — user must login first");
  }

  const redirectUri = req.session.redirectUri;
  console.log("Redirect URI:", redirectUri);

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  client.setCredentials(req.session.user.tokens);

  client.on("tokens", (tokens) => {
    if (!req.session.user) req.session.user = { tokens: {} };
    if (tokens.refresh_token) req.session.user.tokens.refresh_token = tokens.refresh_token;
    if (tokens.access_token) req.session.user.tokens.access_token = tokens.access_token;
  });

  return client;
}

function generateAuthUrl(client, hasRefreshToken) {
  console.log("requesting access to scopes:");
  console.log(scopes);

  const url = client.generateAuthUrl({
    access_type: "offline", // refresh token
    prompt: hasRefreshToken ? "none" : "consent", // force refresh token first login
    include_granted_scopes: true,
    scope: scopes,
  });

  return url;
}

module.exports = {
  getRedirectUri,
  createOAuthClient,
  createOAuthClientWithSession,
  generateAuthUrl,
  scopes,
};
