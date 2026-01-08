const User = require("../models/User");
const { USER_EMAIL } = require("../utilities/constants.js");

class AuthDbRepository {
  // Get the single registered user
  static async getUserByEmail(email) {
    return User.findOne({ email });
  }

  static async getUserByApiTokenHash(apiTokenHash) {
    return User.findOne({ apiTokenHash });
  }

  static async upsertUser(email, tokens) {
    let user = await this.getUserByEmail(email);

    if (!user) {
      user = await AuthDbRepository.createUser(email, tokens);
    } else {
      user = await AuthDbRepository.updateUser(user, tokens);
    }

    return user;
  }

  static async createUser(email, tokens, apiTokenHash) {
    const now = new Date();
    const user = await User.create({
      email,
      google: tokens,
      createdAt: now,
      updatedAt: now,
    });

    return user;
  }

  static async updateUser(user, tokens, apiTokenHash) {
    const now = new Date();

    user.google = tokens;
    user.updatedAt = now;

    await user.save();
  }

  static async clearTokens() {
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) throw new Error("Registered user not found");

    user.google = {};
    user.updatedAt = new Date();

    await user.save();

    return user;
  }

  // Update only Google tokens
  static async updateTokens(tokens) {
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) throw new Error("Registered user not found");

    user.google = tokens;
    user.updatedAt = new Date();
    await user.save();

    return user;
  }

  static async saveApiTokenHash(userId, hashedApiToken) {
    return User.updateOne(
      { _id: userId },
      {
        apiTokenHash: hashedApiToken,
        apiTokenCreatedAt: new Date(),
      }
    );
  }
}
module.exports = AuthDbRepository;
