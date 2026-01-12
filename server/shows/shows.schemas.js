const authHeaderSchema = require("../auth/auth.header.schema");

class ShowsSchemas {
  static sync = {
    headers: authHeaderSchema,
  };
}

module.exports = ShowsSchemas;
