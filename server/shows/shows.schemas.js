import authHeaderSchema from "../auth/auth.header.schema.js";

class ShowsSchemas {
  static sync = {
    headers: authHeaderSchema,
  };
}

export default ShowsSchemas;
