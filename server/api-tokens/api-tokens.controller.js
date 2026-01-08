const ApiTokensService = require("./api-tokens.service.js");
const { cookifyApiToken } = require("../utilities/helpers.js");

class ApiTokensController {
  static async createApiToken(req, res, next) {
    try {
      const { email } = req.body;

      const apiToken = await ApiTokensService.createApiToken(email);

      cookifyApiToken(res, apiToken);

      res.status(200).json(`token sent to: ${email}`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ApiTokensController;
