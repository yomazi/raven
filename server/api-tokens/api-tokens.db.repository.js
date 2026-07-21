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

  static async saveNamedApiTokenHash(apiTokenHash, name) {
    return ApiToken.create({
      apiTokenHash,
      apiTokenCreatedAt: new Date(),
      name,
    });
  }

  static async findNamedApiTokens() {
    return ApiToken.find({ name: { $ne: null } })
      .select("name apiTokenCreatedAt revoked")
      .sort({ apiTokenCreatedAt: -1 });
  }

  static async revokeApiTokenById(id) {
    return ApiToken.findByIdAndUpdate(id, { revoked: true }, { new: true });
  }
}
export default ApiTokensDbRepository;
