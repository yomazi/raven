import authHeaderSchema from "../auth/auth.header.schema.js";

class ShowsSchemas {
  static hello = {
    headers: authHeaderSchema,
  };

  static getAll = {
    headers: authHeaderSchema,
  };
}

export default ShowsSchemas;
