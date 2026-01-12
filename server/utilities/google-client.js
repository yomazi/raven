import { google } from "googleapis";

export const scopes = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
];

export function getRedirectUri(host) {
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

export function createOAuthClient(redirectUri) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export function generateAuthUrl(client, hasRefreshToken) {
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
