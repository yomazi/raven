import authHeaderSchema from "../auth/auth.header.schema.js";
class AuthSchemas {
  static checkAuth = {
    headers: authHeaderSchema,
  };
  static expireAuth = {};
}

export default AuthSchemas;
