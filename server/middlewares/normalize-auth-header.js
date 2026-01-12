export function normalizeAuthHeader(req, res, next) {
  const header = req.get("authorization");
  const cookieToken = req.cookies?.apiToken;

  if (!header && cookieToken) {
    req.headers.authorization = `Bearer ${req.cookies.apiToken}`;
  }

  next();
}
