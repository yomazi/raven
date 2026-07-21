export const cookifyApiToken = (res, apiToken) => {
  if (apiToken) {
    res.cookie("apiToken", apiToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      // 400 days — Chrome (and most modern browsers) silently cap Max-Age at
      // 400 days regardless of what's requested, so this is effectively "as
      // long as a cookie is allowed to last," not an arbitrary round number.
      // The underlying ApiToken itself has no expiry at all (see
      // server/models/ApiToken.js) — this only governs how long the browser
      // keeps sending it before a fresh login (Google OAuth or token-login)
      // is needed to re-set it.
      maxAge: 1000 * 60 * 60 * 24 * 400,
    });
  }
};
