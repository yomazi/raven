import authHeaderSchema from "../auth/auth.header.schema.js";

class ShowsSchemas {
  static getAll = {
    headers: authHeaderSchema,
  };

  static getById = {
    headers: authHeaderSchema,
  };
}

export default ShowsSchemas;
