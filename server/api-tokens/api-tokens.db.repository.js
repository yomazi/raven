import ApiToken from "../models/ApiToken.js";

class ApiTokensDbRepository {
  static async getApiTokenHash(apiTokenHash) {
    const apiToken = ApiToken.findOne({ apiTokenHash });

    return apiToken;
  }

  static async saveApiTokenHash(apiTokenHash) {
    const now = new Date();
    const apiToken = await ApiToken.create({
      apiTokenHash,
      apiTokenCreatedAt: now,
    });

    return apiToken;
  }
}
export default ApiTokensDbRepository;
