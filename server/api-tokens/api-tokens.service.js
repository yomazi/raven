import crypto from "crypto";
import { API_TOKEN_LENGTH } from "../utilities/constants.js";
import ApiTokensDbRepository from "./api-tokens.db.repository.js";

class ApiTokensService {
  static async createApiToken() {
    const apiToken = ApiTokensService.generateApiToken();
    const hashedToken = ApiTokensService.hashApiToken(apiToken);

    await ApiTokensDbRepository.saveApiTokenHash(hashedToken);

    return apiToken;
  }

  static generateApiToken() {
    return crypto.randomBytes(API_TOKEN_LENGTH).toString("hex"); // 64 chars
  }

  static hashApiToken(apiToken) {
    return crypto.createHash("sha256").update(apiToken).digest("hex");
  }

  static async getApiToken(apiToken) {
    const hashedToken = ApiTokensService.hashApiToken(apiToken);
    const result = await ApiTokensDbRepository.getApiTokenHash(hashedToken);

    return result;
  }
}

export default ApiTokensService;
